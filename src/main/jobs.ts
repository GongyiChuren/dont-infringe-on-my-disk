import { app } from 'electron'
import path from 'node:path'
import { scanRoot } from '../shared/scanner'
import { rankCandidates } from '../shared/recommendations'
import { parseExcludePaths } from '../shared/preference'
import { formatBytes } from '../shared/fs-utils'
import type { AssistantMemoryData, MemorySummary, ScanReport, SettingsData } from '../shared/types'

export interface JobResult {
  report: ScanReport
}

export async function runScanJob(
  dataDir: string,
  settings: SettingsData,
  memory: MemorySummary,
  signal: AbortSignal,
  onProgress?: (progress: { scanned: number; directories: number; files: number; currentPath: string }) => void,
  assistantMemory?: AssistantMemoryData | null
): Promise<JobResult> {
  const startedAt = new Date().toISOString()
  const started = performance.now()
  const excludePaths = assistantMemory ? parseExcludePaths(assistantMemory.notes) : []
  const scan = await scanRoot(settings.rootPath, {
    signal,
    onProgress,
    scanMode: settings.scanMode,
    excludePaths
  })
  const recommendations = rankCandidates(scan.nodes, memory, settings.topK)
  const finishedAt = new Date().toISOString()
  const warnings = scan.warnings.slice()
  if (excludePaths.length) {
    warnings.push('已按助手记忆跳过用户要求不扫描的目录：' + excludePaths.join('；') + '。')
  }
  return {
    report: {
      root: path.resolve(settings.rootPath),
      scanMode: settings.scanMode,
      startedAt,
      finishedAt,
      elapsedMs: Math.round(performance.now() - started),
      scanned: scan.scanned,
      directories: scan.directories,
      files: scan.files,
      candidateCount: recommendations.length,
      skippedProtected: scan.skippedProtected,
      warnings,
      recommendations
    }
  }
}

export function summarizeReport(report: ScanReport): string {
  const top = report.recommendations[0]
  const topText = top ? `${top.rank}. ${top.summary}` : 'No obvious candidates'
  return `${app.name} · ${formatBytes(report.recommendations.reduce((sum, item) => sum + item.node.size, 0))} · ${topText}`
}
