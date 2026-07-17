import { KeyRound, Save, Settings, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { AiProviderKind, AiSettingsData, AiSettingsSavePayload } from '../../../shared/types'

interface Props {
  open: boolean
  settings: AiSettingsData
  saving: boolean
  notice: string
  onSave: (payload: AiSettingsSavePayload) => void
  onClose: () => void
}

const providerOptions: Array<{ value: AiProviderKind; label: string; hint: string }> = [
  { value: 'openai-compatible', label: 'OpenAI-compatible Chat API', hint: '大多数兼容服务走 /v1/chat/completions。' },
  { value: 'openai-responses', label: 'OpenAI Responses API', hint: 'OpenAI 官方新版接口，通常是 /v1/responses。' },
  { value: 'anthropic-compatible', label: 'Anthropic-compatible API', hint: '填写 baseURL、模型和 API Key。' }
]

export function AiSettingsDialog({ open, settings, saving, notice, onSave, onClose }: Props) {
  const [provider, setProvider] = useState<AiProviderKind>(settings.provider)
  const [baseUrl, setBaseUrl] = useState(settings.baseUrl)
  const [model, setModel] = useState(settings.model)
  const [apiKey, setApiKey] = useState('')
  const [clearApiKey, setClearApiKey] = useState(false)

  useEffect(() => {
    if (!open) return
    setProvider(settings.provider)
    setBaseUrl(settings.baseUrl)
    setModel(settings.model)
    setApiKey('')
    setClearApiKey(false)
  }, [open, settings])

  if (!open) return null

  const hint = providerOptions.find((item) => item.value === provider)?.hint || ''
  const savePayload: AiSettingsSavePayload = { provider, baseUrl, model, apiKey, clearApiKey }

  return (
    <div className="modal-layer">
      <section className="ai-dialog" role="dialog" aria-modal="true" aria-label="AI 设置">
        <div className="assistant-head">
          <div>
            <div className="assistant-title">
              <Settings size={18} />
              <span>AI 设置</span>
            </div>
            <p>只保存 DIMD 自己的配置，不写入全局工具配置。</p>
          </div>
          <button className="icon-button compact" onClick={onClose} title="关闭设置">
            <X size={16} />
          </button>
        </div>

        <label className="field-label" htmlFor="aiProvider">接入方式</label>
        <select id="aiProvider" value={provider} onChange={(event) => setProvider(event.target.value as AiProviderKind)}>
          {providerOptions.map((item) => (
            <option key={item.value} value={item.value}>{item.label}</option>
          ))}
        </select>
        <p className="field-hint">{hint}</p>

        <label className="field-label" htmlFor="aiBaseUrl">Base URL</label>
        <input id="aiBaseUrl" value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} placeholder="例如：https://api.openai.com/v1" />

        <label className="field-label" htmlFor="aiModel">模型</label>
        <input id="aiModel" value={model} onChange={(event) => setModel(event.target.value)} placeholder="例如：gpt-5-mini / claude-sonnet-4-5" />

        <label className="field-label" htmlFor="aiKey">API Key</label>
        <div className="key-row">
          <input id="aiKey" type="password" value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder={settings.apiKeySet ? '已保存；留空则保留' : '需要填 Base URL 后在此粘贴 Key'} />
          <span className={`key-state ${settings.apiKeySet ? 'saved' : ''}`}>
            <KeyRound size={14} />
            {settings.apiKeySet ? '已保存' : '未保存'}
          </span>
        </div>

        <label className="checkbox-row">
          <input type="checkbox" checked={clearApiKey} onChange={(event) => setClearApiKey(event.target.checked)} />
          <span>清除已保存 API Key</span>
        </label>

        {notice && <div className="assistant-notice">{notice}</div>}

        <button className="primary-button send-button" disabled={saving} onClick={() => onSave(savePayload)}>
          <Save size={16} />
          {saving ? '保存中' : '保存设置'}
        </button>
      </section>
    </div>
  )
}
