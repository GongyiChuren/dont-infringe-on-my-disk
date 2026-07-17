import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { lowerPath } from './fs-utils'

const QUICK_NAMES = /cache|temp|tmp|logs?|crash|dump|shader|dxcache|glcache|npm|pnpm|yarn|pip|uv|node_modules|dist|build/i

const knownTargets = (): string[] => {
  const home = os.homedir()
  const local = path.join(home, 'AppData', 'Local')
  const roaming = path.join(home, 'AppData', 'Roaming')
  return [
    process.env.TEMP || '',
    path.join(local, 'Temp'),
    path.join(local, 'npm-cache'),
    path.join(local, 'uv', 'cache'),
    path.join(local, 'pip', 'Cache'),
    path.join(local, 'pnpm-store'),
    path.join(local, 'Yarn', 'Cache'),
    path.join(local, 'Google', 'Chrome', 'User Data', 'Default', 'Cache'),
    path.join(local, 'Microsoft', 'Edge', 'User Data', 'Default', 'Cache'),
    path.join(local, 'NVIDIA', 'DXCache'),
    path.join(local, 'NVIDIA', 'GLCache'),
    path.join(local, 'CrashDumps'),
    path.join(roaming, 'npm-cache'),
    path.join(home, 'Downloads')
  ].filter(Boolean)
}

const isDriveRoot = (rootPath: string): boolean => /^[a-z]:[\\/]?$/i.test(rootPath.trim())

const insideRoot = (candidate: string, rootPath: string): boolean => {
  const root = lowerPath(path.resolve(rootPath))
  const item = lowerPath(path.resolve(candidate))
  return item === root || item.startsWith(root.endsWith('/') ? root : `${root}/`)
}

const dedupeNested = (paths: string[]): string[] => {
  const ordered = [...new Set(paths.map((item) => path.resolve(item)))].sort((a, b) => a.length - b.length)
  return ordered.filter((item, index) => !ordered.slice(0, index).some((parent) => insideRoot(item, parent)))
}

async function existing(paths: string[]): Promise<string[]> {
  const found: string[] = []
  for (const item of paths) {
    try {
      await fs.access(item)
      found.push(item)
    } catch {
      continue
    }
  }
  return found
}

async function matchingChildren(rootPath: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(rootPath, { withFileTypes: true })
    return entries
      .filter((entry) => entry.isDirectory() && QUICK_NAMES.test(entry.name))
      .map((entry) => path.join(rootPath, entry.name))
  } catch {
    return []
  }
}

export async function findQuickScanRoots(rootPath: string): Promise<string[]> {
  const root = path.resolve(rootPath)
  const rootTargets = QUICK_NAMES.test(path.basename(root)) ? [root] : []
  const candidates = isDriveRoot(root)
    ? knownTargets().filter((item) => insideRoot(item, root))
    : [...rootTargets, ...(await matchingChildren(root))]
  return dedupeNested(await existing(candidates))
}
