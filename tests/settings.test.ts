import { describe, expect, it } from 'vitest'
import { isLocalAiProvider, normalizeAiProvider } from '../src/shared/settings'

describe('AI provider settings', () => {
  it('separates local runners from API providers', () => {
    expect(isLocalAiProvider('local-codex')).toBe(true)
    expect(isLocalAiProvider('local-claude-code')).toBe(true)
    expect(isLocalAiProvider('openai-compatible')).toBe(false)
  })

  it('falls back to local Codex for unknown providers', () => {
    expect(normalizeAiProvider('unknown')).toBe('local-codex')
  })
})
