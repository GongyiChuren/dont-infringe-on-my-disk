
import http from 'node:http'
import { describe, expect, it, afterAll, beforeAll } from 'vitest'
import { callAiAssistant } from '../src/main/ai-provider'

const recorded: { method: string; url: string; authorization?: string; xApiKey?: string; anthropicVersion?: string; body: any }[] = []
let server: http.Server
let baseUrl = ''

beforeAll(async () => {
  server = http.createServer((req, res) => {
    let raw = ''
    req.on('data', (chunk) => { raw += chunk })
    req.on('end', () => {
      let parsed: unknown = null
      try { parsed = JSON.parse(raw || '{}') } catch { parsed = raw }
      const auth = req.headers.authorization as string | undefined
      const xApiKey = (req.headers['x-api-key'] as string | undefined) || undefined
      const anthropicVersion = (req.headers['anthropic-version'] as string | undefined) || undefined
      recorded.push({ method: req.method || '', url: req.url || '', authorization: auth, xApiKey, anthropicVersion, body: parsed })
      res.setHeader('content-type', 'application/json')
      if (req.url === '/v1/chat/completions') { if (parsed && typeof parsed === 'object' && Array.isArray((parsed as any).messages) && (parsed as any).messages.some((m: any) => m && String(m.content || '').includes('force-404'))) { res.statusCode = 404; res.end(JSON.stringify({ error: 'simulated 404' })); return } res.end(JSON.stringify({ choices: [{ message: { content: 'reply-openai-compat' } }] })); return }
      if (req.url === '/responses') { res.end(JSON.stringify({ output_text: 'reply-openai-responses' })); return }
      if (req.url === '/v1/messages') { res.end(JSON.stringify({ content: [{ type: 'text', text: 'reply-anthropic' }] })); return }
      res.statusCode = 404; res.end(JSON.stringify({ error: 'unknown route' }))
    })
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const addr = server.address()
  if (addr && typeof addr === 'object' && addr.port) baseUrl = 'http://127.0.0.1:' + addr.port
})
afterAll(async () => { if (server) await new Promise<void>((resolve) => server.close(() => resolve())) })

const system = 'You are DIMD assistant.'

describe('callAiAssistant against local mock server', () => {
  it('openai-compatible posts /chat/completions with Bearer key and parses choices[0].message.content', async () => {
    const text = await callAiAssistant({ provider: 'openai-compatible', baseUrl: baseUrl + '/v1', model: 'gpt-4o-mini', apiKey: 'fake-key-123', systemPrompt: system, messages: [{ role: 'user', content: 'hi' }] })
    expect(text).toBe('reply-openai-compat')
    const last = recorded[recorded.length - 1]
    expect(last.method).toBe('POST')
    expect(last.url).toBe('/v1/chat/completions')
    expect(last.authorization).toBe('Bearer fake-key-123')
    expect(last.body.model).toBe('gpt-4o-mini')
    expect(last.body.stream).toBe(false)
    expect(last.body.messages[0]).toEqual({ role: 'system', content: system })
  })

  it('openai-responses posts /responses with Bearer key and parses output_text', async () => {
    const text = await callAiAssistant({ provider: 'openai-responses', baseUrl: baseUrl, model: 'gpt-4o', apiKey: 'fake-key-222', systemPrompt: system, messages: [{ role: 'user', content: 'hi' }] })
    expect(text).toBe('reply-openai-responses')
    const last = recorded[recorded.length - 1]
    expect(last.url).toBe('/responses')
    expect(last.authorization).toBe('Bearer fake-key-222')
    expect(last.body.instructions).toBe(system)
    expect(last.body.input[0]).toEqual({ role: 'user', content: 'hi' })
  })

  it('anthropic-compatible posts /v1/messages with x-api-key and anthropic-version, parses content[].text', async () => {
    const text = await callAiAssistant({ provider: 'anthropic-compatible', baseUrl: baseUrl, model: 'claude-3-5-sonnet', apiKey: 'fake-key-333', systemPrompt: system, messages: [{ role: 'user', content: 'hi' }] })
    expect(text).toBe('reply-anthropic')
    const last = recorded[recorded.length - 1]
    expect(last.url).toBe('/v1/messages')
    expect(last.authorization).toBeUndefined()
    expect(last.xApiKey).toBe('fake-key-333')
    expect(last.anthropicVersion).toBe('2023-06-01')
    expect(last.body.system).toBe(system)
    expect(last.body.messages[0]).toEqual({ role: 'user', content: 'hi' })
  })

  it('surfaces HTTP errors instead of swallowing them', async () => {
    await expect(callAiAssistant({ provider: 'openai-compatible', baseUrl: baseUrl + '/v1', model: 'x', apiKey: 'fake-key', systemPrompt: system, messages: [{ role: 'user', content: 'force-404' }] })).rejects.toThrow(/HTTP 404/)
  })

  it('rejects calls missing baseUrl / model / apiKey with clear errors', async () => {
    await expect(callAiAssistant({ provider: 'openai-compatible', baseUrl: '', model: 'x', apiKey: 'fake-key', systemPrompt: system, messages: [] })).rejects.toThrow(/Base URL/)
    await expect(callAiAssistant({ provider: 'openai-compatible', baseUrl: baseUrl, model: '', apiKey: 'fake-key', systemPrompt: system, messages: [] })).rejects.toThrow(/模型名/)
    await expect(callAiAssistant({ provider: 'openai-compatible', baseUrl: baseUrl, model: 'x', apiKey: '', systemPrompt: system, messages: [] })).rejects.toThrow(/API Key/)
  })
})
