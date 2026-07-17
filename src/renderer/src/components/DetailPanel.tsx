import { Ban, BookmarkCheck, Check, FileQuestion, Info, Sparkles, X } from 'lucide-react'
import { useState } from 'react'
import type { Recommendation } from '../../../shared/types'
import { HelpTip } from './HelpTip'

interface Props {
  recommendation: Recommendation | null
  onDecision: (item: Recommendation, decision: 'cleaned' | 'kept' | 'ignored') => void
}

function riskLabel(risk: Recommendation['risk']) {
  if (risk === 'low') return '低风险'
  if (risk === 'medium') return '需要确认'
  return '不建议处理'
}

export function DetailPanel({ recommendation, onDecision }: Props) {
  const [purposeOpen, setPurposeOpen] = useState(false)

  if (!recommendation) {
    return (
      <section className="detail-panel">
        <div className="panel-heading">
          <Info size={18} />
          <span>解释</span>
        </div>
        <div className="detail-empty">
          <Sparkles size={28} />
          <strong>选中候选后查看解释</strong>
          <span>这里会显示“这是什么”和“为什么排进 Top-K”。</span>
        </div>
      </section>
    )
  }

  return (
    <section className="detail-panel">
      <div className="panel-title-row">
        <div className="panel-heading">
          <Info size={18} />
          <span>解释</span>
        </div>
        <span className={`detail-risk risk-${recommendation.risk}`}>{riskLabel(recommendation.risk)}</span>
      </div>

      <div className="detail-head">
        <span className="detail-rank">#{recommendation.rank}</span>
        <div>
          <h2>{recommendation.node.name || recommendation.label}</h2>
          <p>{recommendation.node.path}</p>
        </div>
      </div>

      <div className="explain-block">
        <h3>{recommendation.label}</h3>
        <p>{recommendation.summary}</p>
      </div>

      <div className="purpose-row">
        <button className="ghost-button purpose-button" onClick={() => setPurposeOpen((open) => !open)}>
          <FileQuestion size={16} />
          用途分析
        </button>
        {purposeOpen && (
          <div className="purpose-popover">
            <div className="purpose-head">
              <strong>{recommendation.purpose.title}</strong>
              <button className="icon-button compact" onClick={() => setPurposeOpen(false)} title="关闭用途分析">
                <X size={14} />
              </button>
            </div>
            <p>{recommendation.purpose.summary}</p>
            <ul>
              {recommendation.purpose.details.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
            <span>{recommendation.purpose.impact}</span>
          </div>
        )}
      </div>

      <div className="detail-grid">
        <div>
          <span>
            大小
            <HelpTip text="扫描器估算的文件或目录占用空间。目录大小来自递归统计，可能会跳过无权限区域。" />
          </span>
          <strong>{recommendation.sizeText}</strong>
        </div>
        <div>
          <span>
            评分
            <HelpTip text="综合体积、路径特征、风险和历史记忆后的推荐分。分越高，越靠前。" />
          </span>
          <strong>{recommendation.score}</strong>
        </div>
        <div>
          <span>
            记忆倾向
            <HelpTip text="来自你过去选择的加减分。正数表示你以前更常清理类似项，负数表示更常保留。" />
          </span>
          <strong>{recommendation.memoryBoost > 0 ? `+${recommendation.memoryBoost}` : recommendation.memoryBoost}</strong>
        </div>
      </div>

      <div className="reason-list">
        {recommendation.reasons.slice(0, 5).map((reason) => (
          <span key={reason}>{reason}</span>
        ))}
      </div>

      <div className="decision-row">
        <button onClick={() => onDecision(recommendation, 'cleaned')}>
          <Check size={16} />
          记为已清理
        </button>
        <button onClick={() => onDecision(recommendation, 'kept')}>
          <BookmarkCheck size={16} />
          保留
        </button>
        <button onClick={() => onDecision(recommendation, 'ignored')}>
          <Ban size={16} />
          忽略
        </button>
      </div>
    </section>
  )
}
