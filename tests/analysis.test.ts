import { describe, expect, it } from 'vitest'
import { analyzeNode } from '../src/shared/analysis'
import { rankCandidates } from '../src/shared/recommendations'
import { clampTopK } from '../src/shared/settings'
import type { MemorySummary, ScanNode } from '../src/shared/types'

const memory: MemorySummary = {
  records: [],
  bySignature: {}
}

function makeNode(partial: Partial<ScanNode>): ScanNode {
  return {
    path: 'C:\\Temp\\cache',
    name: 'cache',
    parentPath: 'C:\\Temp',
    ext: '',
    depth: 2,
    isDirectory: true,
    size: 512 * 1024 * 1024,
    mtimeMs: Date.now() - 1000 * 60 * 60 * 24 * 220,
    childCount: 120,
    ...partial
  }
}

describe('analysis', () => {
  it('prefers cache-like directories over personal folders', () => {
    const cache = analyzeNode(makeNode({ path: 'C:\\Users\\me\\AppData\\Local\\Temp', name: 'Temp', size: 700 * 1024 * 1024 }), memory)
    const personal = analyzeNode(makeNode({ path: 'C:\\Users\\me\\Documents', name: 'Documents', size: 700 * 1024 * 1024 }), memory)

    expect(cache.score).toBeGreaterThan(personal.score)
    expect(cache.category).toBe('cache')
    expect(personal.category).toBe('personal')
  })

  it('clamps topK into the requested range', () => {
    expect(clampTopK(3)).toBe(10)
    expect(clampTopK(10)).toBe(10)
    expect(clampTopK(101)).toBe(100)
  })

  it('ranks likely junk first', () => {
    const nodes = [
      makeNode({ path: 'C:\\Users\\me\\Documents', name: 'Documents', size: 700 * 1024 * 1024 }),
      makeNode({ path: 'C:\\Users\\me\\AppData\\Local\\Temp', name: 'Temp', size: 700 * 1024 * 1024 })
    ]
    const ranked = rankCandidates(nodes, memory, 10)
    expect(ranked[0].node.path).toContain('Temp')
    expect(ranked[0].rank).toBe(1)
  })

  it('explains concrete package cache purpose', () => {
    const item = analyzeNode(makeNode({
      path: 'C:\\Users\\me\\AppData\\Local\\npm-cache\\_cacache\\content-v2\\sha512',
      name: 'sha512',
      size: 3 * 1024 * 1024 * 1024
    }), memory)

    expect(item.purpose.title).toContain('npm')
    expect(item.purpose.impact).toContain('重新下载')
  })
})
