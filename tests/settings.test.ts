import { describe, expect, it } from 'vitest'
import { normalizeAiProvider } from '../src/shared/settings'

describe('AI provider settings', () => {
  it('keeps known API providers', () => {
    expect(normalizeAiProvider('openai-compatible')).toBe('openai-compatible')
    expect(normalizeAiProvider('anthropic-compatible')).toBe('anthropic-compatible')
  })

  it('falls back to openai-compatible for unknown providers', () => {
    expect(normalizeAiProvider('unknown')).toBe('openai-compatible')
    expect(normalizeAiProvider('local-codex')).toBe('openai-compatible')
  })
})
