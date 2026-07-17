import { Brain, Loader2, Send, Sparkles, Trash2, X } from 'lucide-react'
import type { FormEvent } from 'react'
import type { AssistantMessage } from '../../../shared/types'

interface Props {
  open: boolean
  messages: AssistantMessage[]
  notesCount: number
  draft: string
  busy: boolean
  notice: string
  onDraftChange: (value: string) => void
  onSend: () => void
  onClear: () => void
  onClose: () => void
}

function formatTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

export function AssistantDrawer({
  open,
  messages,
  notesCount,
  draft,
  busy,
  notice,
  onDraftChange,
  onSend,
  onClear,
  onClose
}: Props) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSend()
  }

  return (
    <aside className={`assistant-drawer ${open ? 'open' : ''}`} aria-hidden={!open}>
      <div className="assistant-head">
        <div>
          <div className="assistant-title">
            <Brain size={18} />
            <span>AI 助手</span>
          </div>
          <p>本地记忆 · 安全执行</p>
        </div>
        <button className="icon-button compact" onClick={onClose} title="关闭助手">
          <X size={16} />
        </button>
      </div>

      <div className="assistant-memory-row">
        <span>
          <Sparkles size={14} />
          {notesCount} 条助手记忆
        </span>
        <button onClick={onClear}>
          <Trash2 size={14} />
          清空
        </button>
      </div>

      <div className="assistant-messages">
        {messages.length === 0 && (
          <div className="assistant-empty">
            <Sparkles size={26} />
            <strong>告诉我你的清理习惯</strong>
            <span>例如：以后不要推荐照片；Top-K 改成 20；扫描 D:\Downloads。</span>
          </div>
        )}

        {messages.map((message) => (
          <div key={message.id} className={`chat-bubble ${message.role}`}>
            <p>{message.content}</p>
            <span>{formatTime(message.createdAt)}</span>
          </div>
        ))}

        {busy && (
          <div className="chat-bubble assistant thinking-bubble" aria-live="polite">
            <p>
              <Loader2 size={14} className="spin" />
              正在思考……
            </p>
          </div>
        )}
      </div>

      {notice && <div className="assistant-notice">{notice}</div>}

      <form className="assistant-compose" onSubmit={submit}>
        <textarea
          value={draft}
          onChange={(event) => onDraftChange(event.target.value)}
          placeholder="输入你的要求，比如：以后别推荐照片，先看下载目录。"
          rows={3}
        />
        <button className="primary-button send-button" disabled={busy || !draft.trim()} type="submit">
          <Send size={16} />
          {busy ? '思考中' : '发送'}
        </button>
      </form>
    </aside>
  )
}
