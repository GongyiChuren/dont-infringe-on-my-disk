import { AlertTriangle, CheckCircle2, CircleHelp, HardDrive, ShieldAlert } from 'lucide-react'
import type { Recommendation } from '../../../shared/types'
import { HelpTip } from './HelpTip'

interface Props {
  recommendations: Recommendation[]
  selectedSignature: string
  isScanning: boolean
  onSelect: (signature: string) => void
}

function riskIcon(risk: Recommendation['risk']) {
  if (risk === 'low') return <CheckCircle2 size={15} />
  if (risk === 'medium') return <AlertTriangle size={15} />
  return <ShieldAlert size={15} />
}

function riskText(risk: Recommendation['risk']) {
  if (risk === 'low') return '低风险'
  if (risk === 'medium') return '谨慎'
  return '高风险'
}

export function CandidateList({ recommendations, selectedSignature, isScanning, onSelect }: Props) {
  return (
    <section className="rank-panel">
      <div className="panel-title-row">
        <div className="panel-heading">
          <HardDrive size={18} />
          <span>Top-K 候选</span>
          <HelpTip text="这里按“可能可清理 + 体积 + 风险 + 你的历史选择”排序，只展示前 K 个候选。" />
        </div>
        <span className="panel-count">{recommendations.length}</span>
      </div>

      <div className="candidate-list">
        {!recommendations.length && (
          <div className="empty-state">
            <CircleHelp size={28} />
            <strong>{isScanning ? '正在分析分层结果' : '等待扫描结果'}</strong>
            <span>{isScanning ? '候选会在扫描完成后排序。' : '选择目录后开始分析。'}</span>
          </div>
        )}

        {recommendations.map((item) => (
          <button
            key={`${item.signature}::${item.node.path}`}
            className={`candidate-row ${selectedSignature === item.signature ? 'selected' : ''}`}
            onClick={() => onSelect(item.signature)}
          >
            <span className="rank-no">{String(item.rank).padStart(2, '0')}</span>
            <span className="candidate-main">
              <span className="candidate-name">{item.node.name || item.label}</span>
              <span className="candidate-path">{item.node.path}</span>
            </span>
            <span className="candidate-meta">
              <span className={`risk risk-${item.risk}`}>
                {riskIcon(item.risk)}
                {riskText(item.risk)}
              </span>
              <span className="size-pill">{item.sizeText}</span>
              <span className="score-bar" aria-label={`score ${item.score}`}>
                <span style={{ width: `${Math.min(100, Math.max(8, item.score))}%` }} />
              </span>
            </span>
          </button>
        ))}
      </div>
    </section>
  )
}
