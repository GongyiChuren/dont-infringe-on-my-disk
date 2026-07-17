import { analyzeNode } from './analysis'
import { formatBytes } from './fs-utils'
import { clampTopK } from './settings'
import type { MemorySummary, Recommendation, ScanNode } from './types'

export function rankCandidates(nodes: ScanNode[], memory: MemorySummary, topK: number): Recommendation[] {
  const analyzed = nodes
    .map((node) => {
      const analysis = analyzeNode(node, memory)
      return {
        ...analysis,
        node
      }
    })
    .filter((item) => item.shouldRecommend && item.score > 0)
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score
      return right.node.size - left.node.size
    })
    .slice(0, clampTopK(topK))

  return analyzed.map((item, index) => ({
    ...item,
    rank: index + 1,
    sizeText: formatBytes(item.node.size)
  }))
}
