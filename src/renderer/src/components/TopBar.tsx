import { Bot, Radar, RotateCcw, ScanSearch, Settings, Square } from 'lucide-react'

interface Props {
  scanning: boolean
  onAssistant: () => void
  onAiSettings: () => void
  onClearMemory: () => void
  onStartScan: () => void
  onCancelScan: () => void
}

export function TopBar({ scanning, onAssistant, onAiSettings, onClearMemory, onStartScan, onCancelScan }: Props) {
  return (
    <header className="topbar">
      <div className="brand-block">
        <div className="brand-mark">
          <Radar size={24} strokeWidth={1.8} />
        </div>
        <div>
          <h1>Don’t Infringe on My Disk</h1>
          <div className="brand-meta">
            <span>DIMD</span>
            <span>Top-K</span>
            <span>解释器</span>
          </div>
        </div>
      </div>
      <div className="top-actions">
        <button className="ghost-button" onClick={onAssistant}>
          <Bot size={16} />
          AI 助手
        </button>
        <button className="ghost-button" onClick={onAiSettings}>
          <Settings size={16} />
          AI 设置
        </button>
        <button className="ghost-button" onClick={onClearMemory}>
          <RotateCcw size={16} />
          清理记忆
        </button>
        {scanning ? (
          <button className="stop-button" onClick={onCancelScan}>
            <Square size={15} />
            停止
          </button>
        ) : (
          <button className="primary-button" onClick={onStartScan}>
            <ScanSearch size={18} />
            开始分析
          </button>
        )}
      </div>
    </header>
  )
}
