import { FolderOpen, SlidersHorizontal } from 'lucide-react'
import type { ScanProgress, ScanReport, SettingsData } from '../../../shared/types'
import { HelpTip } from './HelpTip'
import { StatusStrip } from './StatusStrip'

interface Props {
  settings: SettingsData
  roots: string[]
  memory: { records: number; signatures: number }
  report: ScanReport | null
  progress: ScanProgress | null
  error: string
  notice: string
  onSettingsChange: (settings: SettingsData) => void
  onTopKChange: (value: number) => void
  onScanModeChange: (value: SettingsData['scanMode']) => void
  onChooseFolder: () => void
}

export function ScanControlPanel({
  settings,
  roots,
  memory,
  report,
  progress,
  error,
  notice,
  onSettingsChange,
  onTopKChange,
  onScanModeChange,
  onChooseFolder
}: Props) {
  return (
    <section className="control-panel">
      <div className="panel-heading">
        <SlidersHorizontal size={18} />
        <span>扫描设置</span>
      </div>

      <label className="field-label" htmlFor="rootPath">根目录</label>
      <div className="path-control">
        <input
          id="rootPath"
          value={settings.rootPath}
          onChange={(event) => onSettingsChange({ ...settings, rootPath: event.target.value })}
          list="root-options"
        />
        <datalist id="root-options">
          {roots.map((root) => (
            <option key={root} value={root} />
          ))}
        </datalist>
        <button className="icon-button" onClick={onChooseFolder} title="选择目录">
          <FolderOpen size={17} />
        </button>
      </div>

      <label className="field-label label-with-help" htmlFor="topK">
        <span>Top-K</span>
        <HelpTip text="只展示评分最高的 K 个候选。K 越大，看到的候选越多，但需要你判断的内容也更多。" />
      </label>
      <div className="topk-control">
        <input
          id="topK"
          type="range"
          min="10"
          max="100"
          step="1"
          value={settings.topK}
          onChange={(event) => onTopKChange(Number(event.target.value))}
        />
        <input
          className="number-input"
          type="number"
          min="10"
          max="100"
          value={settings.topK}
          onChange={(event) => onTopKChange(Number(event.target.value))}
        />
      </div>

      <div className="mode-row">
        <span className="field-label mode-label">
          扫描模式
          <HelpTip text="快速模式优先扫常见缓存、临时目录和高收益位置；深度模式会递归更多目录，但更慢。" />
        </span>
        <div className="segmented-control">
          <button
            className={settings.scanMode === 'quick' ? 'segmented selected' : 'segmented'}
            onClick={() => onScanModeChange('quick')}
            type="button"
          >
            快速
          </button>
          <button
            className={settings.scanMode === 'deep' ? 'segmented selected' : 'segmented'}
            onClick={() => onScanModeChange('deep')}
            type="button"
          >
            深度
          </button>
        </div>
      </div>

      <div className="metric-stack">
        <div>
          <strong>{memory.records}</strong>
          <span>
            处理记录
            <HelpTip text="你点过“已清理、保留、忽略”的次数。它只影响以后排序，不会删除文件。" />
          </span>
        </div>
        <div>
          <strong>{memory.signatures}</strong>
          <span>
            记忆模式
            <HelpTip text="系统把相似路径、类型和扩展名归成模式，用来学习你更常清理或保留什么。" />
          </span>
        </div>
        <div>
          <strong>{report?.candidateCount || 0}</strong>
          <span>
            当前候选
            <HelpTip text="本次扫描中进入 Top-K 推荐器的项目数量，不代表已经删除。" />
          </span>
        </div>
      </div>

      <StatusStrip progress={progress} report={report} error={error} notice={notice} />
    </section>
  )
}
