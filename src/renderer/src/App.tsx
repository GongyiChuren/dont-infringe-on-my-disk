import { useEffect, useMemo, useRef, useState } from 'react'
import { Sparkles } from 'lucide-react'
import type { AiSettingsData, AiSettingsSavePayload, AssistantAction, AssistantMessage, Recommendation, ScanProgress, ScanReport, SettingsData } from '../../shared/types'
import { clampTopK } from '../../shared/settings'
import { AiSettingsDialog } from './components/AiSettingsDialog'
import { AssistantDrawer } from './components/AssistantDrawer'
import { CandidateList } from './components/CandidateList'
import { DetailPanel } from './components/DetailPanel'
import { ScanControlPanel } from './components/ScanControlPanel'
import { TopBar } from './components/TopBar'

type MemoryStats = { records: number; signatures: number }

const initialSettings: SettingsData = { rootPath: 'C:\\', topK: 10, scanMode: 'quick' }
const initialAiSettings: AiSettingsData = { provider: 'local-codex', baseUrl: '', model: '', apiKeySet: false }

export function App() {
  const [settings, setSettings] = useState<SettingsData>(initialSettings)
  const [roots, setRoots] = useState<string[]>([])
  const [memory, setMemory] = useState<MemoryStats>({ records: 0, signatures: 0 })
  const [report, setReport] = useState<ScanReport | null>(null)
  const [progress, setProgress] = useState<ScanProgress | null>(null)
  const [scanId, setScanId] = useState('')
  const [selectedSignature, setSelectedSignature] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [aiSettings, setAiSettings] = useState<AiSettingsData>(initialAiSettings)
  const [aiSettingsOpen, setAiSettingsOpen] = useState(false)
  const [aiSettingsSaving, setAiSettingsSaving] = useState(false)
  const [aiSettingsNotice, setAiSettingsNotice] = useState('')
  const [assistantOpen, setAssistantOpen] = useState(false)
  const [assistantMessages, setAssistantMessages] = useState<AssistantMessage[]>([])
  const [assistantNotes, setAssistantNotes] = useState(0)
  const [assistantDraft, setAssistantDraft] = useState('')
  const [assistantBusy, setAssistantBusy] = useState(false)
  const [assistantNotice, setAssistantNotice] = useState('')
  const activeScanId = useRef('')

  const selected = useMemo(() => {
    const rows = report?.recommendations || []
    return rows.find((item) => item.signature === selectedSignature) || rows[0] || null
  }, [report, selectedSignature])

  useEffect(() => {
    window.dimdApi.getState().then((state) => {
      setSettings({
        rootPath: state.settings.rootPath || initialSettings.rootPath,
        topK: clampTopK(state.settings.topK),
        scanMode: state.settings.scanMode || initialSettings.scanMode
      })
      setAiSettings(state.aiSettings || initialAiSettings)
      setRoots(state.roots || [])
      setMemory(state.memory)
    })
    window.dimdApi.getAssistantMemory().then((memoryData) => {
      setAssistantMessages(memoryData.messages)
      setAssistantNotes(memoryData.notes.length)
    })

    const offProgress = window.dimdApi.onScanProgress((payload) => {
      if (payload.id !== activeScanId.current) return
      setProgress({
        scanned: payload.scanned,
        directories: payload.directories,
        files: payload.files,
        currentPath: payload.currentPath
      })
    })
    const offDone = window.dimdApi.onScanDone((payload) => {
      if (payload.id !== activeScanId.current) return
      setReport(payload.report)
      setScanId('')
      activeScanId.current = ''
      setProgress(null)
      setSelectedSignature(payload.report.recommendations[0]?.signature || '')
      setNotice(`已完成：${payload.report.candidateCount} 个候选`)
    })
    const offError = window.dimdApi.onScanError((payload) => {
      if (payload.id !== activeScanId.current) return
      setScanId('')
      activeScanId.current = ''
      setProgress(null)
      setError(payload.message)
    })
    const offMemory = window.dimdApi.onMemoryChanged((payload) => {
      setMemory(payload)
    })
    return () => {
      offProgress()
      offDone()
      offError()
      offMemory()
    }
  }, [])

  function updateTopK(value: number) {
    setSettings((current) => ({ ...current, topK: clampTopK(value) }))
  }

  function updateScanMode(value: SettingsData['scanMode']) {
    setSettings((current) => ({ ...current, scanMode: value }))
  }

  async function chooseFolder() {
    const folder = await window.dimdApi.selectFolder()
    if (!folder) return
    setSettings((current) => ({ ...current, rootPath: folder }))
  }

  async function startScan(overrides: Partial<SettingsData> = {}) {
    setError('')
    setNotice('')
    setReport(null)
    const base = { ...settings, ...overrides }
    const next = {
      rootPath: base.rootPath.trim() || 'C:\\',
      topK: clampTopK(base.topK),
      scanMode: base.scanMode || 'quick'
    }
    const requestedScanId = crypto.randomUUID()
    setSettings(next)
    setScanId(requestedScanId)
    activeScanId.current = requestedScanId
    setProgress({ scanned: 0, directories: 0, files: 0, currentPath: next.rootPath })
    const started = await window.dimdApi.startScan({ ...next, scanId: requestedScanId })
    setScanId(started.id)
    activeScanId.current = started.id
  }

  async function applyAssistantActions(actions: AssistantAction[]) {
    if (actions.length === 0) return
    let nextSettings = { ...settings }
    let shouldSave = false
    let shouldScan = false
    for (const action of actions) {
      if (action.type === 'setTopK') {
        nextSettings = { ...nextSettings, topK: action.topK }
        shouldSave = true
      }
      if (action.type === 'setRootPath') {
        nextSettings = { ...nextSettings, rootPath: action.rootPath }
        shouldSave = true
      }
      if (action.type === 'startScan') shouldScan = true
    }
    setSettings(nextSettings)
    if (shouldSave) await window.dimdApi.saveCurrentSettings(nextSettings)
    if (shouldScan && !scanId) await startScan(nextSettings)
    setAssistantNotice(`已执行：${actions.map((action) => action.label).join('，')}`)
  }

  async function sendAssistantMessage() {
    const message = assistantDraft.trim()
    if (!message || assistantBusy) return
    setAssistantBusy(true)
    setAssistantNotice('')
    try {
      const response = await window.dimdApi.sendAssistantMessage({ message })
      setAssistantMessages(response.messages)
      setAssistantNotes(response.notes.length)
      setAssistantDraft('')
      await applyAssistantActions(response.actions)
    } catch (caught) {
      setAssistantNotice(caught instanceof Error ? caught.message : String(caught))
    } finally {
      setAssistantBusy(false)
    }
  }

  async function saveAiSettings(payload: AiSettingsSavePayload) {
    setAiSettingsSaving(true)
    setAiSettingsNotice('')
    try {
      const next = await window.dimdApi.saveAiSettings(payload)
      setAiSettings(next)
      setAiSettingsNotice('AI 设置已保存')
    } catch (caught) {
      setAiSettingsNotice(caught instanceof Error ? caught.message : String(caught))
    } finally {
      setAiSettingsSaving(false)
    }
  }

  async function clearAssistantMemory() {
    const confirmed = window.confirm('清空 AI 助手记忆后，它会忘记你在聊天里说过的偏好。继续？')
    if (!confirmed) return
    const memoryData = await window.dimdApi.clearAssistantMemory()
    setAssistantMessages(memoryData.messages)
    setAssistantNotes(memoryData.notes.length)
    setAssistantNotice('助手记忆已清空')
  }

  async function cancelScan() {
    if (!scanId) return
    await window.dimdApi.cancelScan(scanId)
    setScanId('')
    activeScanId.current = ''
    setProgress(null)
    setNotice('已停止扫描')
  }

  async function clearMemory() {
    const confirmed = window.confirm('清空推荐记忆后，Top-K 不再参考历史处理倾向。继续？')
    if (!confirmed) return
    const next = await window.dimdApi.clearMemory()
    setMemory(next)
    setNotice('推荐记忆已清空')
  }

  async function recordDecision(item: Recommendation, decision: 'cleaned' | 'kept' | 'ignored') {
    const next = await window.dimdApi.recordDecision({
      path: item.node.path,
      root: report?.root || settings.rootPath,
      category: item.category,
      decision,
      size: item.node.size,
      signature: item.signature
    })
    setMemory(next)
    const label = decision === 'cleaned' ? '已清理' : decision === 'kept' ? '保留' : '忽略'
    setNotice(`已记录：${label}`)
  }

  return (
    <div className="app-shell">
      <div className="grain" />
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      <TopBar
        scanning={Boolean(scanId)}
        onAssistant={() => setAssistantOpen(true)}
        onAiSettings={() => setAiSettingsOpen(true)}
        onClearMemory={clearMemory}
        onStartScan={() => startScan()}
        onCancelScan={cancelScan}
      />

      <main className="workspace">
        <ScanControlPanel
          settings={settings}
          roots={roots}
          memory={memory}
          report={report}
          progress={progress}
          error={error}
          notice={notice}
          onSettingsChange={setSettings}
          onTopKChange={updateTopK}
          onScanModeChange={updateScanMode}
          onChooseFolder={chooseFolder}
        />

        <section className="result-area">
          <CandidateList
            recommendations={report?.recommendations || []}
            selectedSignature={selected?.signature || ''}
            isScanning={Boolean(scanId)}
            onSelect={setSelectedSignature}
          />
          <DetailPanel recommendation={selected} onDecision={recordDecision} />
        </section>
      </main>

      <footer className="footer-line">
        <Sparkles size={15} />
        <span>只记录你的选择，不替你删除。</span>
      </footer>

      <AssistantDrawer
        open={assistantOpen}
        messages={assistantMessages}
        notesCount={assistantNotes}
        draft={assistantDraft}
        busy={assistantBusy}
        notice={assistantNotice}
        onDraftChange={setAssistantDraft}
        onSend={sendAssistantMessage}
        onClear={clearAssistantMemory}
        onClose={() => setAssistantOpen(false)}
      />

      <AiSettingsDialog
        open={aiSettingsOpen}
        settings={aiSettings}
        saving={aiSettingsSaving}
        notice={aiSettingsNotice}
        onSave={saveAiSettings}
        onClose={() => setAiSettingsOpen(false)}
      />
    </div>
  )
}
