import type { AiProviderKind, AssistantMessage } from '../shared/types'

// P3: 真实 AI provider 调用。只做 HTTP 请求和响应解析，不做伪造成功。
// 失败时直接抛错，由调用方决定如何向用户呈现。

export interface AiChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface CallAiAssistantRequest {
  provider: AiProviderKind
  baseUrl: string
  model: string
  apiKey: string
  systemPrompt: string
  messages: AiChatMessage[]
  /** 单次请求最大输出 token，默认 1024，避免无限输出。 */
  maxTokens?: number
  /** 请求整体超时（毫秒），默认 60s。 */
  timeoutMs?: number
}

function joinUrl(base: string, suffix: string): string {
  const trimmed = base.trim()
  if (!trimmed) throw new Error('Base URL 为空，请在 AI 设置里填写完整的 API 地址。')
  const withoutTrailing = trimmed.replace(/\/+$/, '')
  return `${withoutTrailing}${suffix.startsWith('/') ? suffix : '/' + suffix}`
}

function asJsonText(value: unknown): string {
  if (typeof value === 'string') return value
  if (Array.isArray(value)) {
    return value.map((entry) => {
      if (typeof entry === 'string') return entry
      if (entry && typeof entry === 'object') {
        const text = (entry as { text?: unknown }).text
        if (typeof text === 'string') return text
        const content = (entry as { content?: unknown }).content
        const fromContent = asJsonText(content)
        return fromContent
      }
      return ''
    }).filter(Boolean).join('\n')
  }
  if (value && typeof value === 'object') {
    const text = (value as { text?: unknown }).text
    if (typeof text === 'string') return text
    const content = (value as { content?: unknown }).content
    return asJsonText(content)
  }
  return ''
}

async function readBody(response: Response): Promise<string> {
  try {
    return await response.text()
  } catch {
    return ''
  }
}

async function expectOk(response: Response, providerLabel: string): Promise<unknown> {
  const body = await readBody(response)
  if (!response.ok) {
    const snippet = body.slice(0, 500).replace(/\s+/g, ' ').trim()
    throw new Error(`${providerLabel} 请求失败（HTTP ${response.status}）：${snippet || response.statusText}`)
  }
  try {
    return JSON.parse(body)
  } catch {
    throw new Error(`${providerLabel} 返回的不是有效 JSON：${body.slice(0, 200).replace(/\s+/g, ' ')}`)
  }
}

function toHistory(messages: AiChatMessage[]): AiChatMessage[] {
  // 只取最近的若干条，避免输入过长；系统消息单独处理，这里过滤掉。
  return messages.filter((message) => message.role !== 'system').slice(-20)
}

async function postJson(url: string, headers: Record<string, string>, body: unknown, timeoutMs: number): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: controller.signal
    })
  } finally {
    clearTimeout(timer)
  }
}

async function callOpenAICompatible(req: CallAiAssistantRequest, endpointSuffix: string, providerLabel: string): Promise<string> {
  const url = joinUrl(req.baseUrl, endpointSuffix)
  const messages = [
    { role: 'system', content: req.systemPrompt },
    ...toHistory(req.messages)
  ]
  const body = { model: req.model, messages, stream: false, max_tokens: req.maxTokens ?? 1024 }
  const response = await postJson(url, {
    'content-type': 'application/json',
    authorization: `Bearer ${req.apiKey}`
  }, body, req.timeoutMs ?? 60000)
  const json = await expectOk(response, providerLabel) as { choices?: Array<{ message?: { content?: unknown } }> }
  const content = json.choices?.[0]?.message?.content
  const text = asJsonText(content)
  if (!text) throw new Error(`${providerLabel} 返回为空，没有 choices[0].message.content。`)
  return text
}

async function callOpenAIResponses(req: CallAiAssistantRequest): Promise<string> {
  const url = joinUrl(req.baseUrl, '/responses')
  const input = toHistory(req.messages).map((message) => ({ role: message.role, content: message.content }))
  const body = { model: req.model, instructions: req.systemPrompt, input, max_output_tokens: req.maxTokens ?? 1024 }
  const response = await postJson(url, {
    'content-type': 'application/json',
    authorization: `Bearer ${req.apiKey}`
  }, body, req.timeoutMs ?? 60000)
  const json = await expectOk(response, 'OpenAI Responses') as { output_text?: unknown; output?: unknown }
  const direct = (json as { output_text?: unknown }).output_text
  const text = typeof direct === 'string' ? direct : asJsonText(json.output)
  if (!text) throw new Error('OpenAI Responses 返回为空，没有 output_text 或 output 内容。')
  return text
}

async function callAnthropicCompatible(req: CallAiAssistantRequest): Promise<string> {
  const url = joinUrl(req.baseUrl, '/v1/messages')
  const messages = toHistory(req.messages).map((message) => ({ role: message.role, content: message.content }))
  const body = { model: req.model, max_tokens: req.maxTokens ?? 1024, system: req.systemPrompt, messages }
  const response = await postJson(url, {
    'content-type': 'application/json',
    'x-api-key': req.apiKey,
    'anthropic-version': '2023-06-01'
  }, body, req.timeoutMs ?? 60000)
  const json = await expectOk(response, 'Anthropic') as { content?: Array<{ type?: string; text?: unknown }> }
  const parts = Array.isArray(json.content) ? json.content : []
  const text = parts
    .filter((part) => part.type === 'text' || part.type === undefined)
    .map((part) => asJsonText(part.text))
    .filter(Boolean)
    .join('\n')
  if (!text) throw new Error('Anthropic 返回为空，没有可用的文本内容。')
  return text
}

export async function callAiAssistant(req: CallAiAssistantRequest): Promise<string> {
  if (!req.apiKey) throw new Error('缺少 API Key，请在 AI 设置里先保存。')
  if (!req.baseUrl) throw new Error('缺少 Base URL，请在 AI 设置里先填写。')
  if (!req.model) throw new Error('缺少模型名，请在 AI 设置里先填写。')
  switch (req.provider) {
    case 'openai-compatible':
      return callOpenAICompatible(req, '/chat/completions', 'OpenAI-compatible')
    case 'openai-responses':
      return callOpenAIResponses(req)
    case 'anthropic-compatible':
      return callAnthropicCompatible(req)
    default:
      throw new Error(`本地 provider（${req.provider}）不通过 HTTP 调用，请在前端选择 API Provider。`)
  }
}

export function toAiChatMessages(history: AssistantMessage[]): AiChatMessage[] {
  // 把已存久的对话历史转成发送给 API 的消息数组，按时间顺序。
  return history
    .filter((message) => message.role === 'user' || message.role === 'assistant')
    .slice(-40)
    .map((message) => ({ role: message.role, content: message.content }))
}


// —— 本地 CLI 接入 ——
// P3-local: local-codex 用 `codex exec`、local-claude-code 用 `claude -p`。
// 都只读沙箱、不持久化 session、单次调用，失败直接抛错由调用方回退本地规则引擎。
// 不伪造成功，不静默吞错。

import os from 'node:os'
import { spawn } from 'node:child_process'
import { writeFile, readFile, mkdtemp, rm } from 'node:fs/promises'
import path from 'node:path'

export interface CallLocalCliRequest {
  provider: Extract<AiProviderKind, 'local-codex' | 'local-claude-code'>
  systemPrompt: string
  messages: AiChatMessage[]
  /** 单次请求超时毫秒，默认 180s（本地 CLI 首次调用可能十几秒到几十秒）。 */
  timeoutMs?: number
  /** 调用 CLI 时的工作目录，默认当前项目目录。 */
  cwd?: string
}

function buildLocalPrompt(req: CallLocalCliRequest): string {
  // 把系统提示词 + 历史拼成一段供 CLI 单次调用的文本。
  const lines = [req.systemPrompt, '']
  for (const message of req.messages) {
    const roleLabel = message.role === 'assistant' ? 'assistant' : 'user'
    lines.push(roleLabel + ': ' + message.content)
  }
  lines.push('', '请作为 DIMD 助手，用简体中文简短回应上面最后一条用户问题。')
  return lines.join('\n')
}

function timeoutError(ms: number): Error {
  const error = new Error('本地 CLI 调用超时（' + Math.round(ms / 1000) + 's）。可以加长超时或重试。')
  error.name = 'TimeoutError'
  return error
}

async function spawnCollect(cmd: string, args: string[], input: string, cwd: string, timeoutMs: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd, shell: process.platform === 'win32' })
    const timer = setTimeout(() => {
      child.kill('SIGTERM')
      reject(timeoutError(timeoutMs))
    }, timeoutMs)
    let stdout = ''
    let stderr = ''
    child.stdin?.end(input, 'utf8')
    child.stdout?.on('data', (chunk: Buffer) => { stdout += chunk.toString('utf8') })
    child.stderr?.on('data', (chunk: Buffer) => { stderr += chunk.toString('utf8') })
    child.on('error', (error: Error) => {
      clearTimeout(timer)
      reject(new Error('启动本地 CLI 失败：' + error.message + '。请确认已安装并登录。'))
    })
    child.on('close', (code: number | null) => {
      clearTimeout(timer)
      if (code !== 0) {
        const tail = stderr.replace(/\s+$/, '').slice(-500)
        reject(new Error('本地 CLI 退出码 ' + code + (tail ? '：' + tail : '')))
        return
      }
      resolve(stdout)
    })
  })
}

async function callCodexCli(req: CallLocalCliRequest): Promise<string> {
  // codex exec 把最后一条回复写入 -o 指定文件，干净利落。
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), 'dimd-codex-'))
  const outFile = path.join(tmpDir, 'reply.txt')
  try {
    const prompt = buildLocalPrompt(req)
    const args = [
      'exec',
      '--skip-git-repo-check',
      '--ephemeral',
      '-s', 'read-only',
      '-o', outFile,
      '-'
    ]
    const stdout = await spawnCollect('codex', args, prompt, req.cwd || process.cwd(), req.timeoutMs ?? 180000)
    void stdout // codex 主输出主要是日志，回复 取 outFile
    let reply = ''
    try {
      reply = await readFile(outFile, 'utf8')
    } catch {
      reply = ''
    }
    if (!reply.trim()) {
      throw new Error('codex 没有写出回复内容到 -o 文件。可能未登录，请先 `codex login`。')
    }
    return reply.trim()
  } finally {
    await rm(tmpDir, { recursive: true, force: true })
  }
}

async function callClaudeCli(req: CallLocalCliRequest): Promise<string> {
  // claude -p --output-format json 返回单行 JSON，result 字段就是回复；遇 thinking 路由 400 时 is_error=true。
  const prompt = buildLocalPrompt(req)
  const args = ['-p', prompt, '--output-format', 'json', '--add-dir', req.cwd || process.cwd()]
  const raw = await spawnCollect('claude', args, '', req.cwd || process.cwd(), req.timeoutMs ?? 180000)
  let json: { result?: unknown; is_error?: unknown; api_error_status?: unknown } = {}
  try {
    json = JSON.parse(raw)
  } catch {
    throw new Error('claude-code 返回的不是有效 JSON：' + raw.slice(0, 200).replace(/\s+/g, ' '))
  }
  const isErr = Boolean(json.is_error) || Boolean(json.api_error_status)
  if (isErr) {
    const reason = typeof json.result === 'string' ? json.result : 'claude-code 返回错误（可能命中 thinking 路由 400 等）。'
    throw new Error(reason)
  }
  const text = typeof json.result === 'string' ? json.result : asJsonText(json.result)
  if (!text) throw new Error('claude-code 返回为空 result 字段。')
  return text.trim()
}

export async function callLocalCli(req: CallLocalCliRequest): Promise<string> {
  if (req.provider === 'local-codex') return callCodexCli(req)
  if (req.provider === 'local-claude-code') return callClaudeCli(req)
  throw new Error('暂不支持的本地 CLI provider：' + req.provider)
}
