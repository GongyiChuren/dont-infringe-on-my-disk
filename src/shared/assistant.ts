import crypto from 'node:crypto'
import { clampTopK } from './settings'
import type {
  AssistantAction,
  AssistantMemoryData,
  AssistantMemoryNote,
  AssistantMessage,
  MemorySummary,
  ScanReport,
  SettingsData
} from './types'

export interface AssistantContext {
  cleanupMemory: MemorySummary
  assistantMemory: AssistantMemoryData
  settings: SettingsData
  report: ScanReport | null
}

export interface AssistantTurn {
  user: AssistantMessage
  assistant: AssistantMessage
  notes: AssistantMemoryNote[]
  actions: AssistantAction[]
}

const MAX_NOTES = 60
const MAX_MESSAGES = 80

export function blankAssistantMemory(): AssistantMemoryData {
  return { messages: [], notes: [] }
}

export function buildAssistantMessage(role: 'user' | 'assistant', content: string): AssistantMessage {
  return {
    id: crypto.randomUUID(),
    role,
    content,
    createdAt: new Date().toISOString()
  }
}

export function compactAssistantMemory(memory: AssistantMemoryData): AssistantMemoryData {
  return {
    messages: memory.messages.slice(-MAX_MESSAGES),
    notes: memory.notes.slice(-MAX_NOTES)
  }
}

function truncate(value: string, maxLength: number): string {
  const clean = value.replace(/\s+/g, ' ').trim()
  if (clean.length <= maxLength) return clean
  return `${clean.slice(0, maxLength - 1)}…`
}

function findTopKRequest(input: string): number | null {
  if (!/top-?k|候选|推荐数量|显示|列出/i.test(input)) return null
  const match = input.match(/\d{1,3}/)
  if (!match) return null
  return clampTopK(Number(match[0]))
}

function findRootPath(input: string): string {
  const match = input.match(/[a-zA-Z]:\\[^\r\n"'<>|?*]*/)
  return match ? match[0].trim() : ''
}

function wantsScan(input: string): boolean {
  return /开始|扫描|分析|跑一下|查一下|看看/.test(input)
}

function wantsMemory(input: string): boolean {
  return /记住|以后|下次|偏好|不要|别|优先|只看|尽量|忽略/.test(input)
}

function summarizeReport(report: ScanReport | null): string {
  if (!report) return '当前还没有扫描结果。你可以让我开始扫描，或先选择一个根目录。'
  if (report.recommendations.length === 0) {
    return `当前扫描了 ${report.scanned} 个项目，没有发现明显候选。`
  }
  const topItems = report.recommendations.slice(0, 3)
    .map((item) => `${item.rank}. ${item.node.name || item.label}（${item.sizeText}，${item.risk === 'low' ? '低风险' : item.risk === 'medium' ? '谨慎' : '高风险'}）`)
    .join('；')
  return `当前 Top-K 有 ${report.recommendations.length} 个候选：${topItems}。`
}

function summarizeMemory(memory: AssistantMemoryData, cleanupMemory: MemorySummary): string {
  const decisions = cleanupMemory.records.length
  if (memory.notes.length === 0 && decisions === 0) return '我还没有形成你的清理偏好。'
  const recentNotes = memory.notes.slice(-2).map((note) => note.text).join('；')
  const noteText = recentNotes ? `我记得：${recentNotes}。` : ''
  return `${noteText}你已有 ${decisions} 条处理记录。`
}

function buildActions(input: string): AssistantAction[] {
  const actions: AssistantAction[] = []
  const topK = findTopKRequest(input)
  const rootPath = findRootPath(input)
  if (topK) actions.push({ type: 'setTopK', topK, label: `把 Top-K 改为 ${topK}` })
  if (rootPath) actions.push({ type: 'setRootPath', rootPath, label: `把根目录改为 ${rootPath}` })
  if (wantsScan(input)) actions.push({ type: 'startScan', label: '开始扫描分析' })
  return actions
}

// 把用户的口语偏好解析成结构化 note 文本，便于 AI 引用和后续 scanner 解析。
// 不改用户的原始语义，只是让记录更规整。
function buildPreferenceNote(input: string): string {
  const skipPathMatch = input.match(/(?:别|不要|不用|跳过|忽略|排除)\s*(?:扫描|扫|推荐)?\s*([a-zA-Z]:\\[^\r\n"'<>|?*]*)/i)
  if (skipPathMatch) {
    return '不要扫描/推荐目录：' + skipPathMatch[1].trim()
  }
  const skipExtMatch = input.match(/(?:别|不要|不用|跳过|忽略)\s*(?:推荐)?\s*\.?([a-z0-9]{2,5})\s*(?:文件|扩展名|格式)?/i)
  if (skipExtMatch && !/^(top|k|项|号|个)$/.test(skipExtMatch[1].toLowerCase())) {
    return '不要推荐扩展名：.' + skipExtMatch[1].toLowerCase().trim()
  }
  return truncate(input, 180)
}

function buildNotes(input: string): AssistantMemoryNote[] {
  if (!wantsMemory(input)) return []
  return [{
    id: crypto.randomUUID(),
    text: buildPreferenceNote(input),
    createdAt: new Date().toISOString()
  }]
}

function buildReply(input: string, context: AssistantContext, actions: AssistantAction[], notes: AssistantMemoryNote[]): string {
  const lines = [summarizeReport(context.report)]
  if (notes.length > 0) lines.push('我已经把这条偏好记进本地助手记忆。')
  if (actions.length > 0) {
    lines.push(`我会执行：${actions.map((action) => action.label).join('，')}。`)
  } else if (/能删|删除|清理|安全吗|是什么|解释/.test(input)) {
    lines.push('我会优先把系统区和个人文件当作高风险，只推荐你手动判断，不会替你删除。')
  } else {
    lines.push(summarizeMemory(context.assistantMemory, context.cleanupMemory))
  }
  return lines.join('\n')
}

export function createAssistantTurn(input: string, context: AssistantContext): AssistantTurn {
  const cleanInput = truncate(input, 1000)
  const user = buildAssistantMessage('user', cleanInput)
  const actions = buildActions(cleanInput)
  const notes = buildNotes(cleanInput)
  const assistant = buildAssistantMessage('assistant', buildReply(cleanInput, context, actions, notes))
  return { user, assistant, notes, actions }
}

export function appendAssistantTurn(memory: AssistantMemoryData, turn: AssistantTurn): AssistantMemoryData {
  return compactAssistantMemory({
    messages: [...memory.messages, turn.user, turn.assistant],
    notes: [...memory.notes, ...turn.notes]
  })
}
