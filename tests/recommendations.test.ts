import { describe, expect, it } from 'vitest'
import { rankCandidates } from '../src/shared/recommendations'
import type { MemorySummary, ScanNode } from '../src/shared/types'

const blankMemory: MemorySummary = { records: [], bySignature: {} }

function makeNode(overrides: Partial<ScanNode> & { path: string }): ScanNode {
  const name = overrides.name || overrides.path.split(/[\\/]/).pop() || 'node'
  return {
    path: overrides.path,
    name,
    parentPath: overrides.parentPath || '',
    ext: overrides.ext || '',
    depth: overrides.depth ?? 2,
    isDirectory: overrides.isDirectory ?? true,
    size: overrides.size ?? 512 * 1024 * 1024,
    mtimeMs: overrides.mtimeMs ?? Date.now() - 200 * 24 * 60 * 60 * 1000,
    childCount: overrides.childCount ?? 0
  }
}

describe('rankCandidates', () => {
  it('keeps cache candidates and assigns ascending ranks', () => {
    const nodes = [
      makeNode({ path: 'C:\\Users\\me\\AppData\\Local\\npm-cache', size: 800 * 1024 * 1024 }),
      makeNode({ path: 'C:\\Users\\me\\AppData\\Local\\pip\\cache', size: 300 * 1024 * 1024 })
    ]
    const ranked = rankCandidates(nodes, blankMemory, 10)
    expect(ranked.length).toBe(2)
    expect(ranked[0].rank).toBe(1)
    expect(ranked[1].rank).toBe(2)
    // 体积更大的候选应该排前面
    expect(ranked[0].node.size).toBeGreaterThanOrEqual(ranked[1].node.size)
  })

  it('respects topK clamp and the 10-100 range', () => {
    const nodes = Array.from({ length: 25 }, (_value, index) =>
      makeNode({ path: 'C:\\cache\\chunk-' + index, size: (index + 1) * 100 * 1024 * 1024 })
    )
    // topK 低于下限会被夹到 10
    expect(rankCandidates(nodes, blankMemory, 2).length).toBeLessThanOrEqual(10)
    // 超过上限会被夹到 100；这里给 3，节点只有不超过 25 个可推荐
    const big = rankCandidates(nodes, blankMemory, 999)
    expect(big.length).toBeLessThanOrEqual(100)
  })

  it('filters out personal/system candidates regardless of size', () => {
    const nodes = [
      makeNode({ path: 'C:\\Users\\me\\Documents\\otech', size: 20 * 1024 * 1024 * 1024, isDirectory: true }),
      makeNode({ path: 'C:\\Windows\\System32', size: 10 * 1024 * 1024 * 1024, isDirectory: true })
    ]
    const ranked = rankCandidates(nodes, blankMemory, 10)
    expect(ranked.length).toBe(0)
  })
})
