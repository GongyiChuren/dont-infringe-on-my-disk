import fs from 'node:fs/promises'
import path from 'node:path'
import { app, safeStorage } from 'electron'
import type { AiProviderKind, AiSettingsData, AiSettingsSavePayload, AssistantMemoryData, MemoryRecord, MemorySummary, SettingsData } from '../shared/types'
import { appendMemoryRecord, clearMemory, loadMemory } from '../shared/memory'
import { blankAssistantMemory, compactAssistantMemory } from '../shared/assistant'
import { DEFAULT_SCAN_MODE, normalizeAiProvider, normalizeScanMode } from '../shared/settings'

const SETTINGS_FILE = 'settings.json'
const ASSISTANT_MEMORY_FILE = 'assistant-memory.json'
const AI_SETTINGS_FILE = 'ai-settings.json'

type StoredAiSettings = Omit<AiSettingsData, 'apiKeySet'> & {
  encryptedApiKey?: string
}

const DEFAULT_AI_SETTINGS: AiSettingsData = {
  provider: 'openai-compatible',
  baseUrl: '',
  model: '',
  apiKeySet: false
}

export function getDataDir(): string {
  const envDir = process.env.DIMD_DATA_DIR
  if (envDir && envDir.trim()) return path.resolve(envDir.trim())
  const portableDir = process.env.PORTABLE_EXECUTABLE_DIR
  if (app.isPackaged && portableDir && portableDir.trim()) {
    return path.join(path.resolve(portableDir.trim()), '.dimd-data')
  }
  if (app.isPackaged) return path.join(path.dirname(process.execPath), '.dimd-data')
  return path.join(app.getAppPath(), '.dimd-data')
}

async function readJson<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(filePath, 'utf8')
    return JSON.parse(raw) as T
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return fallback
    throw error
  }
}

async function writeJson(filePath: string, value: unknown): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  const temp = `${filePath}.tmp`
  await fs.writeFile(temp, JSON.stringify(value, null, 2), 'utf8')
  await fs.rename(temp, filePath)
}

export async function loadSettings(dataDir: string): Promise<SettingsData> {
  const file = path.join(dataDir, SETTINGS_FILE)
  const fallback: SettingsData = { rootPath: 'C:\\', topK: 10, scanMode: DEFAULT_SCAN_MODE }
  const loaded = await readJson<Partial<SettingsData>>(file, fallback)
  return {
    rootPath: String(loaded.rootPath || fallback.rootPath),
    topK: Number(loaded.topK || fallback.topK),
    scanMode: normalizeScanMode(loaded.scanMode)
  }
}

export async function saveSettings(dataDir: string, settings: SettingsData): Promise<SettingsData> {
  const normalized: SettingsData = {
    rootPath: String(settings.rootPath || 'C:\\'),
    topK: Math.max(10, Math.min(100, Math.round(Number(settings.topK || 10)))),
    scanMode: normalizeScanMode(settings.scanMode)
  }
  await writeJson(path.join(dataDir, SETTINGS_FILE), normalized)
  return normalized
}

function publicAiSettings(stored: StoredAiSettings): AiSettingsData {
  const provider = normalizeAiProvider(stored.provider)
  return {
    provider,
    baseUrl: stored.baseUrl || '',
    model: stored.model || '',
    apiKeySet: Boolean(stored.encryptedApiKey)
  }
}

function encryptApiKey(value: string): string {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('当前系统不可用 Electron safeStorage，无法安全保存 API Key。')
  }
  return safeStorage.encryptString(value).toString('base64')
}


export interface AiSettingsSecret {
  provider: AiProviderKind
  baseUrl: string
  model: string
  apiKey: string
  configured: boolean
}

function decryptApiKey(encrypted: string): string {
  if (!safeStorage.isEncryptionAvailable()) return ''
  try {
    return safeStorage.decryptString(Buffer.from(encrypted, 'base64'))
  } catch {
    return ''
  }
}

export async function readAiSettingsSecret(dataDir: string): Promise<AiSettingsSecret> {
  const file = path.join(dataDir, AI_SETTINGS_FILE)
  const loaded = await readJson<Partial<StoredAiSettings>>(file, DEFAULT_AI_SETTINGS)
  const provider = normalizeAiProvider(loaded.provider)
  const apiKey = loaded.encryptedApiKey ? decryptApiKey(loaded.encryptedApiKey) : ''
  const baseUrl = String(loaded.baseUrl || '').trim()
  const model = String(loaded.model || '').trim()
  return { provider, baseUrl, model, apiKey, configured: Boolean(baseUrl && model && apiKey) }
}

export async function loadAiSettings(dataDir: string): Promise<AiSettingsData> {
  const file = path.join(dataDir, AI_SETTINGS_FILE)
  const loaded = await readJson<Partial<StoredAiSettings>>(file, DEFAULT_AI_SETTINGS)
  return publicAiSettings({
    provider: loaded.provider || DEFAULT_AI_SETTINGS.provider,
    baseUrl: String(loaded.baseUrl || ''),
    model: String(loaded.model || ''),
    encryptedApiKey: loaded.encryptedApiKey
  })
}

export async function saveAiSettings(dataDir: string, payload: AiSettingsSavePayload): Promise<AiSettingsData> {
  const file = path.join(dataDir, AI_SETTINGS_FILE)
  const previous = await readJson<Partial<StoredAiSettings>>(file, DEFAULT_AI_SETTINGS)
  const apiKey = String(payload.apiKey || '').trim()
  const provider = normalizeAiProvider(payload.provider)
  const next: StoredAiSettings = {
    provider,
    baseUrl: String(payload.baseUrl || '').trim(),
    model: String(payload.model || '').trim(),
    encryptedApiKey: payload.clearApiKey ? undefined : previous.encryptedApiKey
  }
  if (apiKey) next.encryptedApiKey = encryptApiKey(apiKey)
  await writeJson(file, next)
  return publicAiSettings(next)
}

export async function loadAssistantMemory(dataDir: string): Promise<AssistantMemoryData> {
  const file = path.join(dataDir, ASSISTANT_MEMORY_FILE)
  const loaded = await readJson<Partial<AssistantMemoryData>>(file, blankAssistantMemory())
  if (!Array.isArray(loaded.messages) || !Array.isArray(loaded.notes)) return blankAssistantMemory()
  return compactAssistantMemory({
    messages: loaded.messages.filter(Boolean) as AssistantMemoryData['messages'],
    notes: loaded.notes.filter(Boolean) as AssistantMemoryData['notes']
  })
}

export async function saveAssistantMemory(dataDir: string, memory: AssistantMemoryData): Promise<AssistantMemoryData> {
  const normalized = compactAssistantMemory(memory)
  await writeJson(path.join(dataDir, ASSISTANT_MEMORY_FILE), normalized)
  return normalized
}

export async function resetAssistantMemory(dataDir: string): Promise<AssistantMemoryData> {
  return saveAssistantMemory(dataDir, blankAssistantMemory())
}

export async function loadMemorySummary(dataDir: string): Promise<MemorySummary> {
  return loadMemory(dataDir)
}

export async function recordDecision(dataDir: string, record: MemoryRecord): Promise<MemorySummary> {
  return appendMemoryRecord(dataDir, record)
}

export async function resetMemory(dataDir: string): Promise<MemorySummary> {
  return clearMemory(dataDir)
}

export async function ensureDataDir(dataDir: string): Promise<void> {
  await fs.mkdir(dataDir, { recursive: true })
}
