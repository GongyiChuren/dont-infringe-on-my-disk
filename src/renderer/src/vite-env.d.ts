/// <reference types="vite/client" />

import type { AiSettingsData, AiSettingsSavePayload, AssistantMemoryData, AssistantResponse, ScanReport, SettingsData } from '../../shared/types'

type ScanStartPayload = Partial<SettingsData> & { scanId?: string }

declare global {
  interface Window {
    dimdApi: {
      getState: () => Promise<{
        settings: SettingsData
        aiSettings: AiSettingsData
        memory: { records: number; signatures: number }
        roots: string[]
      }>
      setSettings: (payload: Partial<SettingsData>) => Promise<SettingsData>
      saveCurrentSettings: (payload: Partial<SettingsData>) => Promise<SettingsData>
      listRoots: () => Promise<string[]>
      clearMemory: () => Promise<{ records: number; signatures: number }>
      getAiSettings: () => Promise<AiSettingsData>
      saveAiSettings: (payload: AiSettingsSavePayload) => Promise<AiSettingsData>
      getAssistantMemory: () => Promise<AssistantMemoryData>
      clearAssistantMemory: () => Promise<AssistantMemoryData>
      sendAssistantMessage: (payload: { message: string }) => Promise<AssistantResponse>
      recordDecision: (payload: {
        path: string
        root: string
        category: string
        decision: 'cleaned' | 'kept' | 'ignored'
        size: number
        signature: string
        note?: string
      }) => Promise<{ records: number; signatures: number }>
      startScan: (payload: ScanStartPayload) => Promise<{ id: string; settings: SettingsData }>
      cancelScan: (id: string) => Promise<{ cancelled: boolean }>
      selectFolder: () => Promise<string>
      onScanProgress: (handler: (payload: { id: string; scanned: number; directories: number; files: number; currentPath: string }) => void) => () => void
      onScanDone: (handler: (payload: { id: string; report: ScanReport }) => void) => () => void
      onScanError: (handler: (payload: { id: string; message: string }) => void) => () => void
      onMemoryChanged: (handler: (payload: { records: number; signatures: number }) => void) => () => void
    }
  }
}

export {}
