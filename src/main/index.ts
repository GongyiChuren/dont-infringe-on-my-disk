import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import fs from 'node:fs/promises'
import os from 'node:os'
import { randomUUID } from 'node:crypto'
import { createMainWindow } from './window'
import {
  ensureDataDir,
  getDataDir,
  loadAiSettings,
  loadAssistantMemory,
  loadMemorySummary,
  loadSettings,
  recordDecision,
  resetAssistantMemory,
  resetMemory,
  saveAiSettings,
  saveAssistantMemory,
  saveSettings,
  readAiSettingsSecret
} from './storage'
import { runScanJob } from './jobs'
import { normalizeAiProvider, clampTopK, normalizeScanMode } from '../shared/settings'
import { buildRecord } from '../shared/memory'
import { appendAssistantTurn, createAssistantTurn } from '../shared/assistant'
import { callAiAssistant, toAiChatMessages } from './ai-provider'
import type { AiSettingsData, AiSettingsSavePayload, AssistantMemoryData, MemorySummary, Recommendation, ScanReport, SettingsData } from '../shared/types'

type ScanState = {
  abort: AbortController
  report?: ScanReport
}

const scanStates = new Map<string, ScanState>()
let memoryCache: MemorySummary | null = null
let settingsCache: SettingsData | null = null
let aiSettingsCache: AiSettingsData | null = null
let assistantMemoryCache: AssistantMemoryData | null = null
let lastReportCache: ScanReport | null = null
let dataDirCache = ''

async function listRoots(): Promise<string[]> {
  const roots = new Set<string>()
  for (const letter of 'CDEFGHIJKLMNOPQRSTUVWXYZ') {
    const candidate = `${letter}:\\`
    try {
      await fs.access(candidate)
      roots.add(candidate)
    } catch {
      continue
    }
  }
  if (roots.size === 0) roots.add(`${os.homedir().slice(0, 2)}\\`)
  return [...roots]
}

async function getState(): Promise<{ dataDir: string; settings: SettingsData; memory: MemorySummary; aiSettings: AiSettingsData }> {
  if (!dataDirCache) dataDirCache = getDataDir()
  await ensureDataDir(dataDirCache)
  if (!settingsCache) settingsCache = await loadSettings(dataDirCache)
  if (!aiSettingsCache) aiSettingsCache = await loadAiSettings(dataDirCache)
  if (!memoryCache) memoryCache = await loadMemorySummary(dataDirCache)
  if (!assistantMemoryCache) assistantMemoryCache = await loadAssistantMemory(dataDirCache)
  return { dataDir: dataDirCache, settings: settingsCache, memory: memoryCache, aiSettings: aiSettingsCache }
}

function sanitizeSettings(payload: Partial<SettingsData>): SettingsData {
  const rootPath = String(payload.rootPath || 'C:\\').trim() || 'C:\\'
  const topK = clampTopK(payload.topK ?? 10)
  const scanMode = normalizeScanMode(payload.scanMode)
  return { rootPath, topK, scanMode }
}

function sanitizeAiSettings(payload: Partial<AiSettingsSavePayload>): AiSettingsSavePayload {
  const provider = normalizeAiProvider(payload.provider)
  return {
    provider,
    baseUrl: String(payload.baseUrl || '').trim().slice(0, 300),
    model: String(payload.model || '').trim().slice(0, 120),
    apiKey: typeof payload.apiKey !== 'string' ? '' : payload.apiKey.slice(0, 4000),
    clearApiKey: Boolean(payload.clearApiKey)
  }
}

async function sendMemoryChanged() {
  if (!memoryCache) return
  const window = BrowserWindow.getAllWindows()[0]
  if (window) {
    window.webContents.send('memory:changed', {
      records: memoryCache.records.length,
      signatures: Object.keys(memoryCache.bySignature).length
    })
  }
}

function createScanId(payload: { scanId?: unknown }): string {
  const candidate = typeof payload.scanId === 'string' ? payload.scanId.trim() : ''
  if (/^[a-zA-Z0-9-]{8,80}$/.test(candidate)) return candidate
  return randomUUID()
}

function sanitizeAssistantInput(payload: { message?: unknown }): string {
  const message = String(payload.message || '').trim()
  if (!message) throw new Error('请输入要告诉助手的内容')
  if (message.length > 1200) throw new Error('消息太长了，请拆成几句发送')
  return message
}


function riskLabel(risk: Recommendation['risk']): string {
  return risk === 'low' ? '低风险' : risk === 'medium' ? '谨慎' : '高风险'
}

function buildAssistantSystemPrompt(state: { settings: SettingsData; memory: MemorySummary; report: ScanReport | null; assistantMemory: AssistantMemoryData }): string {
  const lines = [
    '你是 DIMD（Don\'t Infringe on My Disk）的清理助手。DIMD 只负责解释和推荐，永远不会替用户删除任何文件。',
    '回答用简体中文，简洁直接。',
    '当前设置：扫描根目录 ' + state.settings.rootPath + '；Top-K = ' + state.settings.topK + '；模式 = ' + state.settings.scanMode + '。',
    '',
    '当用户说"第 N 项 / 编号 N / N 号"时，对应下面 Top-K 里 rank=N 的那一项。',
    '低风险或谨慎的候选：可以解释它是什么、为什么会变大、删除后需要重建的代价；但仍要提醒用户自己手动删，不要替用户决定删除。',
    '高风险或个人/系统区候选：明确建议保留，不要鼓励删除。',
    '',
    '【当前 Top-K 详细清单】'
  ]
  const recs = state.report?.recommendations || []
  if (recs.length) {
    const top = recs.slice(0, state.settings.topK)
    top.forEach((item) => {
      lines.push(
        '#' + item.rank + ' ' + (item.node.name || item.label) +
        ' · ' + item.sizeText + ' · ' + riskLabel(item.risk) +
        ' · 类别=' + item.label +
        ' · 路径=' + item.node.path
      )
      lines.push('  用途：' + item.purpose.summary)
      if (item.purpose.details.length) lines.push('  细节：' + item.purpose.details.join('；'))
      lines.push('  删除影响：' + item.purpose.impact)
      if (item.reasons.length) lines.push('  依据：' + item.reasons.join('；'))
    })
  } else {
    lines.push('当前还没有扫描结果。可以引导用户先点开始扫描。')
  }
  const decisions = state.memory.records.length
  if (decisions > 0) {
    lines.push('')
    lines.push('用户已积累 ' + decisions + ' 条历史处理记录，可作为推荐倾向参考（被多次清理的 signature 更值得推荐）。')
  }
  const recentNotes = (state.assistantMemory?.notes || []).slice(-5).map((note) => note.text)
  if (recentNotes.length) {
    lines.push('')
    lines.push('【你已记住的用户偏好】')
    recentNotes.forEach((note) => lines.push('- ' + note))
    lines.push('若用户的新请求与这些偏好相关，请引用并遵守；若用户说"以后别扫描某目录/别推荐某类"，请确认已记录，并在回复里说明这会影响后续推荐倾向。')
  }
  lines.push('')
  lines.push('如果用户要你直接删除文件，请说明风险并提示用户自己手动删除，不要假装你已经执行了删除。')
  return lines.join('\n')
}

function registerIpc() {
  ipcMain.handle('app:get-state', async () => {
    const state = await getState()
    const roots = await listRoots()
    return {
      settings: state.settings,
      aiSettings: state.aiSettings,
      memory: {
        records: state.memory.records.length,
        signatures: Object.keys(state.memory.bySignature).length
      },
      roots
    }
  })

  ipcMain.handle('app:set-settings', async (_event, payload: Partial<SettingsData>) => {
    const state = await getState()
    settingsCache = await saveSettings(state.dataDir, sanitizeSettings(payload))
    return settingsCache
  })

  ipcMain.handle('app:save-current-settings', async (_event, payload: Partial<SettingsData>) => {
    const state = await getState()
    const next = sanitizeSettings({ ...state.settings, ...payload })
    settingsCache = await saveSettings(state.dataDir, next)
    return settingsCache
  })

  ipcMain.handle('app:list-roots', async () => listRoots())

  ipcMain.handle('ai:get-settings', async () => {
    const state = await getState()
    aiSettingsCache = await loadAiSettings(state.dataDir)
    return aiSettingsCache
  })

  ipcMain.handle('ai:save-settings', async (_event, payload: Partial<AiSettingsSavePayload>) => {
    const state = await getState()
    aiSettingsCache = await saveAiSettings(state.dataDir, sanitizeAiSettings(payload))
    return aiSettingsCache
  })

  ipcMain.handle('app:clear-memory', async () => {
    const state = await getState()
    memoryCache = await resetMemory(state.dataDir)
    await sendMemoryChanged()
    return {
      records: memoryCache.records.length,
      signatures: Object.keys(memoryCache.bySignature).length
    }
  })

  ipcMain.handle('assistant:get-memory', async () => {
    const state = await getState()
    assistantMemoryCache = await loadAssistantMemory(state.dataDir)
    return assistantMemoryCache
  })

  ipcMain.handle('assistant:clear-memory', async () => {
    const state = await getState()
    assistantMemoryCache = await resetAssistantMemory(state.dataDir)
    return assistantMemoryCache
  })

  ipcMain.handle('assistant:send-message', async (_event, payload: { message?: string }) => {
    const message = sanitizeAssistantInput(payload)
    const state = await getState()
    assistantMemoryCache = assistantMemoryCache || await loadAssistantMemory(state.dataDir)
    const turn = createAssistantTurn(message, {
      cleanupMemory: state.memory,
      assistantMemory: assistantMemoryCache,
      settings: state.settings,
      report: lastReportCache
    })
    const secret = await readAiSettingsSecret(state.dataDir)
    if (secret.configured) {
      try {
        const systemPrompt = buildAssistantSystemPrompt({
          settings: state.settings,
          memory: state.memory,
          report: lastReportCache,
          assistantMemory: assistantMemoryCache
        })
        const history = toAiChatMessages(assistantMemoryCache.messages)
        history.push({ role: 'user', content: message })
        const aiReply = await callAiAssistant({
          provider: secret.provider,
          baseUrl: secret.baseUrl,
          model: secret.model,
          apiKey: secret.apiKey,
          systemPrompt,
          messages: history
        })
        turn.assistant.content = aiReply
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error)
        turn.assistant.content = '（AI 调用失败，已回退本地规则模式：' + reason + '）\n' + turn.assistant.content
      }
    } else {
      turn.assistant.content = '（本地规则模式，未联网：在 AI 设置里填写 Base URL、模型和 API Key 即可接入）\n' + turn.assistant.content
    }
    assistantMemoryCache = await saveAssistantMemory(state.dataDir, appendAssistantTurn(assistantMemoryCache, turn))
    return {
      messages: assistantMemoryCache.messages,
      notes: assistantMemoryCache.notes,
      actions: turn.actions
    }
  })

  ipcMain.handle('app:record-decision', async (_event, payload: {
    path: string
    root: string
    category: Recommendation['category']
    decision: 'cleaned' | 'kept' | 'ignored'
    size: number
    signature: string
    note?: string
  }) => {
    const state = await getState()
    memoryCache = await recordDecision(state.dataDir, buildRecord({
      path: payload.path,
      root: payload.root,
      category: payload.category,
      decision: payload.decision,
      size: payload.size,
      signature: payload.signature,
      note: payload.note
    }))
    await sendMemoryChanged()
    return {
      records: memoryCache.records.length,
      signatures: Object.keys(memoryCache.bySignature).length
    }
  })

  ipcMain.handle('scan:start', async (_event, payload: Partial<SettingsData> & { scanId?: string }) => {
    const state = await getState()
    const settings = sanitizeSettings({ ...state.settings, ...payload })
    settingsCache = await saveSettings(state.dataDir, settings)
    const scanId = createScanId(payload)
    const abort = new AbortController()
    scanStates.set(scanId, { abort })

    runScanJob(state.dataDir, settings, state.memory, abort.signal, (progress) => {
      const window = BrowserWindow.getAllWindows()[0]
      if (window) window.webContents.send('scan:progress', { id: scanId, ...progress })
    }, assistantMemoryCache)
      .then(({ report }) => {
        const slot = scanStates.get(scanId)
        if (slot) slot.report = report
        lastReportCache = report
        const window = BrowserWindow.getAllWindows()[0]
        if (window) window.webContents.send('scan:done', { id: scanId, report })
        scanStates.delete(scanId)
      })
      .catch((error: unknown) => {
        const window = BrowserWindow.getAllWindows()[0]
        if (window) window.webContents.send('scan:error', {
          id: scanId,
          message: error instanceof Error ? error.message : String(error)
        })
        scanStates.delete(scanId)
      })

    return { id: scanId, settings }
  })

  ipcMain.handle('scan:cancel', async (_event, payload: { id: string }) => {
    const slot = scanStates.get(payload.id)
    if (!slot) return { cancelled: false }
    slot.abort.abort()
    scanStates.delete(payload.id)
    return { cancelled: true }
  })

  ipcMain.handle('app:dialog:select-folder', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory', 'createDirectory']
    })
    return result.canceled ? '' : result.filePaths[0] || ''
  })
}

async function bootstrap() {
  await app.whenReady()
  registerIpc()
  createMainWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow()
  })
}

app.setAppUserModelId('com.dimd.app')
bootstrap().catch((error) => {
  console.error(error)
  app.quit()
})
