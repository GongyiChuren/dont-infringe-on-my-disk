import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import type { ScanProgress, ScanReport } from '../../../shared/types'

interface Props {
  progress: ScanProgress | null
  report: ScanReport | null
  error: string
  notice: string
}

export function StatusStrip({ progress, report, error, notice }: Props) {
  if (error) {
    return (
      <div className="status-strip error">
        <AlertCircle size={16} />
        <span>{error}</span>
      </div>
    )
  }

  if (progress) {
    return (
      <div className="status-strip active">
        <Loader2 size={16} className="spin" />
        <span>{progress.scanned} 项 · {progress.directories} 目录 · {progress.files} 文件</span>
      </div>
    )
  }

  if (report) {
    const mode = report.scanMode === 'quick' ? '快速' : '深度'
    return (
      <div className="status-stack">
        <div className="status-strip ok">
          <CheckCircle2 size={16} />
          <span>{mode} · {Math.round(report.elapsedMs / 1000)} 秒 · 跳过保护区 {report.skippedProtected}</span>
        </div>
        {report.warnings.length > 0 && (
          <div className="warning-line">
            权限/读取提示 {report.warnings.length} 条
          </div>
        )}
      </div>
    )
  }

  if (notice) {
    return (
      <div className="status-strip ok">
        <CheckCircle2 size={16} />
        <span>{notice}</span>
      </div>
    )
  }

  return (
    <div className="status-strip idle">
      <span>准备就绪</span>
    </div>
  )
}
