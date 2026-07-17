import { describe, expect, it } from 'vitest'
import { explainPurpose } from '../src/shared/purpose'
import type { ScanNode } from '../src/shared/types'

function makeNode(path: string, overrides: Partial<ScanNode> = {}): ScanNode {
  const name = path.split(/[\\/]/).pop() || path
  return {
    path,
    name,
    parentPath: '',
    ext: '',
    depth: 2,
    isDirectory: true,
    size: 256 * 1024 * 1024,
    mtimeMs: 0,
    childCount: 0,
    ...overrides
  }
}

describe('explainPurpose', () => {
  it('recognizes npm cache directories', () => {
    const node = makeNode('C:\\Users\\me\\AppData\\Local\\npm-cache\\_cacache')
    const result = explainPurpose(node, 'cache')
    expect(result.title).toContain('npm')
    expect(result.details.length).toBeGreaterThan(0)
    expect(result.impact).toContain('重新下载')
  })

  it('recognizes browser user-data caches', () => {
    const node = makeNode('C:\\Users\\me\\AppData\\Local\\Google\\Chrome\\User Data\\Default\\Cache')
    const result = explainPurpose(node, 'cache')
    expect(result.title).toContain('浏览器')
  })

  it('falls back to installer summary for installers without a specific rule', () => {
    const node = makeNode('C:\\Downloads\\setup.exe', { ext: 'exe', isDirectory: false })
    const result = explainPurpose(node, 'installer')
    expect(result.title).toContain('安装包')
    expect(result.confidence).toBeGreaterThan(0.6)
  })

  it('uses conservative low-confidence summary for unknown paths', () => {
    const node = makeNode('C:\\SomeApp\\mystery-folder', { isDirectory: true })
    const result = explainPurpose(node, 'unknown')
    expect(result.title).toContain('用途不明确')
    expect(result.confidence).toBeLessThan(0.5)
  })
})
