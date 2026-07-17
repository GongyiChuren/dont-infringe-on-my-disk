export type Decision = 'cleaned' | 'kept' | 'ignored'

export type RiskLevel = 'low' | 'medium' | 'high'

export type Category =
  | 'cache'
  | 'temp'
  | 'download'
  | 'installer'
  | 'archive'
  | 'media'
  | 'code'
  | 'personal'
  | 'system'
  | 'app-data'
  | 'logs'
  | 'unknown'

export interface ScanNode {
  path: string
  name: string
  parentPath: string
  ext: string
  depth: number
  isDirectory: boolean
  size: number
  mtimeMs: number
  childCount: number
}

export interface AnalysisResult {
  category: Category
  label: string
  summary: string
  purpose: PurposeAnalysis
  reasons: string[]
  risk: RiskLevel
  confidence: number
  score: number
  memoryBoost: number
  signature: string
  shouldRecommend: boolean
}

export interface Recommendation extends AnalysisResult {
  node: ScanNode
  rank: number
  sizeText: string
}

export interface MemoryRecord {
  id: string
  createdAt: string
  path: string
  signature: string
  root: string
  category: Category
  decision: Decision
  size: number
  note?: string
}

export interface MemorySummaryEntry {
  cleaned: number
  kept: number
  ignored: number
  lastDecision: Decision
  lastAt: string
}

export interface MemorySummary {
  records: MemoryRecord[]
  bySignature: Record<string, MemorySummaryEntry>
}

export interface ScanProgress {
  scanned: number
  directories: number
  files: number
  currentPath: string
}

export interface ScanReport {
  root: string
  scanMode: ScanMode
  startedAt: string
  finishedAt: string
  elapsedMs: number
  scanned: number
  directories: number
  files: number
  candidateCount: number
  skippedProtected: number
  warnings: string[]
  recommendations: Recommendation[]
}

export interface SettingsData {
  rootPath: string
  topK: number
  scanMode: ScanMode
}

export type ScanMode = 'quick' | 'deep'

export interface PurposeAnalysis {
  title: string
  summary: string
  details: string[]
  impact: string
  confidence: number
}

export type AiProviderKind =
  | 'local-codex'
  | 'local-claude-code'
  | 'local-opencode'
  | 'openai-responses'
  | 'openai-compatible'
  | 'anthropic-compatible'

export interface AiSettingsData {
  provider: AiProviderKind
  baseUrl: string
  model: string
  apiKeySet: boolean
}

export interface AiSettingsSavePayload {
  provider: AiProviderKind
  baseUrl: string
  model: string
  apiKey?: string
  clearApiKey?: boolean
}

export type AssistantRole = 'user' | 'assistant'

export interface AssistantMessage {
  id: string
  role: AssistantRole
  content: string
  createdAt: string
}

export interface AssistantMemoryNote {
  id: string
  text: string
  createdAt: string
}

export interface AssistantMemoryData {
  messages: AssistantMessage[]
  notes: AssistantMemoryNote[]
}

export type AssistantAction =
  | { type: 'setTopK'; topK: number; label: string }
  | { type: 'setRootPath'; rootPath: string; label: string }
  | { type: 'startScan'; label: string }

export interface AssistantResponse {
  messages: AssistantMessage[]
  notes: AssistantMemoryNote[]
  actions: AssistantAction[]
}
