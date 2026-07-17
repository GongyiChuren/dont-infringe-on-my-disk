import type { AiProviderKind } from './types'

export const MIN_TOP_K = 10
export const MAX_TOP_K = 100
export const DEFAULT_TOP_K = 10
export const DEFAULT_SCAN_MODE = 'quick'
export const AI_PROVIDERS: AiProviderKind[] = [
  'local-codex',
  'local-claude-code',
  'local-opencode',
  'openai-responses',
  'openai-compatible',
  'anthropic-compatible'
]
export const LOCAL_AI_PROVIDERS: AiProviderKind[] = [
  'local-codex',
  'local-claude-code',
  'local-opencode'
]

export function clampTopK(value: number | string | null | undefined): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return DEFAULT_TOP_K
  return Math.max(MIN_TOP_K, Math.min(MAX_TOP_K, Math.round(parsed)))
}

export function normalizeScanMode(value: unknown): 'quick' | 'deep' {
  return value === 'deep' ? 'deep' : DEFAULT_SCAN_MODE
}

export function normalizeAiProvider(value: unknown): AiProviderKind {
  return AI_PROVIDERS.includes(value as AiProviderKind) ? value as AiProviderKind : 'local-codex'
}

export function isLocalAiProvider(value: AiProviderKind): boolean {
  return LOCAL_AI_PROVIDERS.includes(value)
}
