import { describe, expect, it } from 'vitest'
import { appendAssistantTurn, blankAssistantMemory, createAssistantTurn } from '../src/shared/assistant'
import type { MemorySummary, SettingsData } from '../src/shared/types'

const cleanupMemory: MemorySummary = {
  records: [],
  bySignature: {}
}

const settings: SettingsData = {
  rootPath: 'C:\\',
  topK: 10,
  scanMode: 'quick'
}

describe('assistant', () => {
  it('turns Top-K requests into safe actions', () => {
    const turn = createAssistantTurn('Top-K 改成 25，然后开始扫描', {
      cleanupMemory,
      assistantMemory: blankAssistantMemory(),
      settings,
      report: null
    })

    expect(turn.actions).toContainEqual({ type: 'setTopK', topK: 25, label: '把 Top-K 改为 25' })
    expect(turn.actions).toContainEqual({ type: 'startScan', label: '开始扫描分析' })
  })

  it('stores user cleanup preferences as assistant notes', () => {
    const turn = createAssistantTurn('以后不要推荐我的照片和视频', {
      cleanupMemory,
      assistantMemory: blankAssistantMemory(),
      settings,
      report: null
    })
    const memory = appendAssistantTurn(blankAssistantMemory(), turn)

    expect(memory.notes).toHaveLength(1)
    expect(memory.notes[0].text).toContain('不要推荐')
    expect(memory.messages).toHaveLength(2)
  })
})
