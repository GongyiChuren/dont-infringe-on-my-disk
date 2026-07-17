import fs from 'node:fs/promises'
import path from 'node:path'
import { lowerPath, safeBasename } from './fs-utils'
import { findQuickScanRoots } from './quick-scan'
import type { ScanMode, ScanNode, ScanProgress } from './types'

export interface ScanOptions {
  signal?: AbortSignal
  onProgress?: (progress: ScanProgress) => void
  minDirectoryBytes?: number
  minFileBytes?: number
  scanMode?: ScanMode
}

export interface ScanResult {
  nodes: ScanNode[]
  scanned: number
  directories: number
  files: number
  skippedProtected: number
  warnings: string[]
}

type Counters = { scanned: number; directories: number; files: number; skippedProtected: number; lastProgressMs: number }

const PROTECTED_SEGMENTS = [
  'windows',
  'program files',
  'programdata',
  'system volume information',
  '$recycle.bin',
  'recovery',
  'boot',
  'perf logs',
  'msocache'
]

// P5: 正则只在模块加载时编译一次，避免每次 isLikelyCandidate 调用都新建字面量。
const DIRECTORY_CANDIDATE_RE = /cache|temp|tmp|download|backup|build|dist|node_modules|logs/i
const FILE_CANDIDATE_RE = /cache|temp|tmp|log|bak|old|zip|rar|7z|iso|img|mp4|mkv|mov|avi|mp3|flac|wav|aac|exe|msi/i
// P1: 进度上报按时间节流。200ms 上限既避免大目录刷屏，也能让小目录的首次进度尽早送达。
const PROGRESS_THROTTLE_MS = 200

function isAbortSignal(signal?: AbortSignal): boolean {
  return Boolean(signal?.aborted)
}

function createAbortError(): Error {
  const error = new Error('Scan cancelled')
  error.name = 'AbortError'
  return error
}

function shouldSkipProtected(currentPath: string, rootPath: string): boolean {
  const normalized = lowerPath(currentPath)
  const root = lowerPath(rootPath)
  if (normalized === root) return false
  const parts = normalized.split('/').filter(Boolean)
  return PROTECTED_SEGMENTS.some((segment) => parts.includes(segment))
}

function isLikelyCandidate(node: ScanNode, minDirectoryBytes: number, minFileBytes: number): boolean {
  if (node.isDirectory) {
    return node.size >= minDirectoryBytes || DIRECTORY_CANDIDATE_RE.test(node.path)
  }
  return node.size >= minFileBytes || FILE_CANDIDATE_RE.test(node.path)
}

function maybeReportProgress(options: ScanOptions, counters: Counters, currentPath: string): void {
  if (!options.onProgress) return
  const now = Date.now()
  if (counters.lastProgressMs !== 0 && now - counters.lastProgressMs < PROGRESS_THROTTLE_MS) return
  counters.lastProgressMs = now
  options.onProgress({
    scanned: counters.scanned,
    directories: counters.directories,
    files: counters.files,
    currentPath
  })
}

async function walk(
  currentPath: string,
  rootPath: string,
  depth: number,
  options: ScanOptions,
  counters: Counters,
  warnings: string[]
): Promise<{ size: number; nodes: ScanNode[]; childCount: number }> {
  if (isAbortSignal(options.signal)) throw createAbortError()

  if (shouldSkipProtected(currentPath, rootPath)) {
    counters.skippedProtected += 1
    return { size: 0, nodes: [], childCount: 0 }
  }

  let stat
  try {
    stat = await fs.lstat(currentPath)
  } catch (error) {
    warnings.push(`Cannot read ${currentPath}: ${(error as Error).message}`)
    return { size: 0, nodes: [], childCount: 0 }
  }

  counters.scanned += 1

  if (!stat.isDirectory()) {
    counters.files += 1
    const node: ScanNode = {
      path: currentPath,
      name: safeBasename(currentPath),
      parentPath: path.dirname(currentPath),
      ext: path.extname(currentPath).slice(1),
      depth,
      isDirectory: false,
      size: stat.size,
      mtimeMs: stat.mtimeMs,
      childCount: 0
    }
    return {
      size: stat.size,
      nodes: isLikelyCandidate(node, options.minDirectoryBytes || 64 * 1024 * 1024, options.minFileBytes || 24 * 1024 * 1024) ? [node] : [],
      childCount: 0
    }
  }

  counters.directories += 1
  let children: ScanNode[] = []
  let totalSize = 0
  let childCount = 0

  let entries: import('node:fs').Dirent[]
  try {
    entries = await fs.readdir(currentPath, { withFileTypes: true })
  } catch (error) {
    warnings.push(`Cannot enter ${currentPath}: ${(error as Error).message}`)
    const node: ScanNode = {
      path: currentPath,
      name: safeBasename(currentPath),
      parentPath: path.dirname(currentPath),
      ext: '',
      depth,
      isDirectory: true,
      size: 0,
      mtimeMs: stat.mtimeMs,
      childCount: 0
    }
    return {
      size: 0,
      nodes: isLikelyCandidate(node, options.minDirectoryBytes || 64 * 1024 * 1024, options.minFileBytes || 24 * 1024 * 1024) ? [node] : [],
      childCount: 0
    }
  }

  for (const entry of entries) {
    if (isAbortSignal(options.signal)) throw createAbortError()
    const childPath = path.join(currentPath, entry.name)
    if (entry.isSymbolicLink()) {
      continue
    }
    const child = await walk(childPath, rootPath, depth + 1, options, counters, warnings)
    totalSize += child.size
    childCount += 1
    children = children.concat(child.nodes)
  }

  const node: ScanNode = {
    path: currentPath,
    name: safeBasename(currentPath),
    parentPath: path.dirname(currentPath),
    ext: '',
    depth,
    isDirectory: true,
    size: totalSize,
    mtimeMs: stat.mtimeMs,
    childCount
  }
  if (isLikelyCandidate(node, options.minDirectoryBytes || 64 * 1024 * 1024, options.minFileBytes || 24 * 1024 * 1024)) {
    children.push(node)
  }

  maybeReportProgress(options, counters, currentPath)

  return {
    size: totalSize,
    nodes: children,
    childCount
  }
}

async function scanTargets(rootPath: string, targets: string[], options: ScanOptions, warnings: string[]): Promise<ScanResult> {
  const counters = { scanned: 0, directories: 0, files: 0, skippedProtected: 0, lastProgressMs: 0 }
  let nodes: ScanNode[] = []
  for (const target of targets) {
    if (isAbortSignal(options.signal)) throw createAbortError()
    const result = await walk(target, rootPath, 0, options, counters, warnings)
    nodes = nodes.concat(result.nodes)
  }
  return {
    nodes,
    scanned: counters.scanned,
    directories: counters.directories,
    files: counters.files,
    skippedProtected: counters.skippedProtected,
    warnings
  }
}

export async function scanRoot(rootPath: string, options: ScanOptions = {}): Promise<ScanResult> {
  const warnings: string[] = []
  const root = path.resolve(rootPath)
  if (options.scanMode === 'quick') {
    const targets = await findQuickScanRoots(root)
    warnings.push('Quick scan checks common cache and temporary locations first. Use deep scan for a full recursive pass.')
    if (targets.length === 0) return { nodes: [], scanned: 0, directories: 0, files: 0, skippedProtected: 0, warnings }
    return scanTargets(root, targets, options, warnings)
  }
  return scanTargets(root, [root], options, warnings)
}
