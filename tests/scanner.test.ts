import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { scanRoot } from '../src/shared/scanner'
import { rankCandidates } from '../src/shared/recommendations'
import type { MemorySummary } from '../src/shared/types'

const memory: MemorySummary = {
  records: [],
  bySignature: {}
}

describe('scanner smoke test', () => {
  it('recommends candidates without deleting files', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'dimd-scan-'))
    const cacheDir = path.join(root, 'cache')
    const file = path.join(cacheDir, 'old-cache.tmp')
    await fs.mkdir(cacheDir, { recursive: true })
    await fs.writeFile(file, Buffer.alloc(1024 * 1024))

    const scan = await scanRoot(root, {
      minDirectoryBytes: 1,
      minFileBytes: 1
    })
    const ranked = rankCandidates(scan.nodes, memory, 10)
    const stillThere = await fs.stat(file)

    expect(ranked.length).toBeGreaterThan(0)
    expect(stillThere.isFile()).toBe(true)
  })

  it('quick scan targets cache-like children', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'dimd-quick-'))
    await fs.mkdir(path.join(root, 'cache'), { recursive: true })
    await fs.mkdir(path.join(root, 'documents'), { recursive: true })
    await fs.writeFile(path.join(root, 'cache', 'asset.tmp'), Buffer.alloc(512))
    await fs.writeFile(path.join(root, 'documents', 'keep.txt'), Buffer.alloc(512))

    const scan = await scanRoot(root, {
      scanMode: 'quick',
      minDirectoryBytes: 1,
      minFileBytes: 1
    })

    expect(scan.nodes.some((node) => node.path.includes('cache'))).toBe(true)
    expect(scan.nodes.some((node) => node.path.includes('documents'))).toBe(false)
  })
  it('honors excludePaths preference by skipping matching subtrees', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'dimd-excl-'))
    const keep = path.join(root, 'cache', 'keep.tmp')
    const skip = path.join(root, 'skip-data', 'big.tmp')
    await fs.mkdir(path.join(root, 'cache'), { recursive: true })
    await fs.mkdir(path.join(root, 'skip-data'), { recursive: true })
    await fs.writeFile(keep, Buffer.alloc(1024))
    await fs.writeFile(skip, Buffer.alloc(1024))

    const scan = await scanRoot(root, {
      minDirectoryBytes: 1,
      minFileBytes: 1,
      excludePaths: [path.join(root, 'skip-data')]
    })
    expect(scan.nodes.some((n) => n.path.includes('skip-data'))).toBe(false)
    expect(scan.nodes.some((n) => n.path.includes('keep.tmp'))).toBe(true)
  })
})