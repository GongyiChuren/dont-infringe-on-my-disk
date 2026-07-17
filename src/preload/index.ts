import { contextBridge, ipcRenderer } from 'electron'
import type { AiSettingsData, AiSettingsSavePayload, AssistantMemoryData, AssistantResponse, MemorySummary, SettingsData } from '../shared/types'
import type { ScanReport } from '../shared/types'

type ScanStartPayload = Partial<SettingsData> & { scanId?: string }

const api = {
  getState: () => ipcRenderer.invoke('app:get-state'),
  setSettings: (payload: Partial<SettingsData>) => ipcRenderer.invoke('app:set-settings', payload),
  saveCurrentSettings: (payload: Partial<SettingsData>) => ipcRenderer.invoke('app:save-current-settings', payload),
  listRoots: () => ipcRenderer.invoke('app:list-roots'),
  clearMemory: () => ipcRenderer.invoke('app:clear-memory'),
  getAiSettings: () => ipcRenderer.invoke('ai:get-settings') as Promise<AiSettingsData>,
  saveAiSettings: (payload: AiSettingsSavePayload) => ipcRenderer.invoke('ai:save-settings', payload) as Promise<AiSettingsData>,
  getAssistantMemory: () => ipcRenderer.invoke('assistant:get-memory') as Promise<AssistantMemoryData>,
  clearAssistantMemory: () => ipcRenderer.invoke('assistant:clear-memory') as Promise<AssistantMemoryData>,
  sendAssistantMessage: (payload: { message: string }) => ipcRenderer.invoke('assistant:send-message', payload) as Promise<AssistantResponse>,
  recordDecision: (payload: {
    path: string
    root: string
    category: string
    decision: 'cleaned' | 'kept' | 'ignored'
    size: number
    signature: string
    note?: string
  }) => ipcRenderer.invoke('app:record-decision', payload),
  startScan: (payload: ScanStartPayload) => ipcRenderer.invoke('scan:start', payload),
  cancelScan: (id: string) => ipcRenderer.invoke('scan:cancel', { id }),
  selectFolder: () => ipcRenderer.invoke('app:dialog:select-folder'),
  onScanProgress: (handler: (payload: { id: string; scanned: number; directories: number; files: number; currentPath: string }) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, payload: unknown) => handler(payload as { id: string; scanned: number; directories: number; files: number; currentPath: string })
    ipcRenderer.on('scan:progress', listener)
    return () => ipcRenderer.removeListener('scan:progress', listener)
  },
  onScanDone: (handler: (payload: { id: string; report: ScanReport }) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, payload: unknown) => handler(payload as { id: string; report: ScanReport })
    ipcRenderer.on('scan:done', listener)
    return () => ipcRenderer.removeListener('scan:done', listener)
  },
  onScanError: (handler: (payload: { id: string; message: string }) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, payload: unknown) => handler(payload as { id: string; message: string })
    ipcRenderer.on('scan:error', listener)
    return () => ipcRenderer.removeListener('scan:error', listener)
  },
  onMemoryChanged: (handler: (payload: { records: number; signatures: number }) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, payload: unknown) => handler(payload as { records: number; signatures: number })
    ipcRenderer.on('memory:changed', listener)
    return () => ipcRenderer.removeListener('memory:changed', listener)
  }
}

contextBridge.exposeInMainWorld('dimdApi', api)

export type DimdApi = typeof api
