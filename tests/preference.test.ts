import { describe, expect, it } from 'vitest'
import { parseExcludePaths } from '../src/shared/preference'
import type { AssistantMemoryNote } from '../src/shared/types'

function note(text: string): AssistantMemoryNote {
  return { id: 'n', text, createdAt: '2026-07-17T00:00:00Z' }
}

describe('parseExcludePaths', () => {
  it('reads structured skip-dir notes produced by buildPreferenceNote', () => {
    const notes = [note('不要扫描/推荐目录：D:\\NpmCache')]
    expect(parseExcludePaths(notes)).toEqual(['D:\\NpmCache'])
  })

  it('ignores plain conversational notes without the prefix', () => {
    expect(parseExcludePaths([note('以后别推荐照片')])).toEqual([])
    expect(parseExcludePaths([note('把 Top-K 改成 20')])).toEqual([])
  })

  it('dedupes overlapping paths by lowercased key', () => {
    const notes = [
      note('不要扫描/推荐目录：D:\\Cache'),
      note('不要扫描/推荐目录：d:\\cache')
    ]
    expect(parseExcludePaths(notes).length).toBe(1)
  })

  it('rejects malformed entries without a drive letter', () => {
    expect(parseExcludePaths([note('不要扫描/推荐目录：随便一个目录')])).toEqual([])
  })
})
