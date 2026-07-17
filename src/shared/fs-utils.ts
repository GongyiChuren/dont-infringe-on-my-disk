import path from 'node:path'

export function normalizePath(input: string): string {
  return path.normalize(String(input || '').trim())
}

export function lowerPath(input: string): string {
  return normalizePath(input).replace(/\\/g, '/').toLowerCase()
}

export function formatBytes(bytes: number): string {
  const value = Number.isFinite(bytes) ? Math.max(0, Math.floor(bytes)) : 0
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let num = value
  let idx = 0
  while (num >= 1024 && idx < units.length - 1) {
    num /= 1024
    idx += 1
  }
  return idx === 0 ? `${num} ${units[idx]}` : `${num.toFixed(num >= 100 ? 0 : 1)} ${units[idx]}`
}

export function tailSegments(input: string, count = 3): string[] {
  const clean = lowerPath(input)
  const parts = clean.split('/').filter(Boolean)
  return parts.slice(Math.max(0, parts.length - count))
}

export function safeBasename(input: string): string {
  const base = path.basename(normalizePath(input))
  return base || input
}
