import fs from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'
import type { Decision, MemoryRecord, MemorySummary, MemorySummaryEntry } from './types'

const FILE_NAME = 'history.json'

function blankSummary(): MemorySummary {
  return { records: [], bySignature: {} }
}

export function createRecordId(): string {
  return crypto.randomUUID()
}

export function resolveDataFile(dataDir: string): string {
  return path.join(dataDir, FILE_NAME)
}

export function summarizeRecords(records: MemoryRecord[]): MemorySummary {
  const summary: MemorySummary = blankSummary()
  summary.records = [...records]
  for (const record of records) {
    const current = summary.bySignature[record.signature] || {
      cleaned: 0,
      kept: 0,
      ignored: 0,
      lastDecision: record.decision,
      lastAt: record.createdAt
    }
    current[record.decision] += 1
    current.lastDecision = record.decision
    current.lastAt = record.createdAt
    summary.bySignature[record.signature] = current
  }
  return summary
}

export function decisionLabel(decision: Decision): string {
  const labels: Record<Decision, string> = {
    cleaned: 'Cleaned',
    kept: 'Kept',
    ignored: 'Ignored'
  }
  return labels[decision]
}

export async function loadMemory(dataDir: string): Promise<MemorySummary> {
  const file = resolveDataFile(dataDir)
  try {
    const raw = await fs.readFile(file, 'utf8')
    const parsed = JSON.parse(raw) as { records?: MemoryRecord[] }
    if (!parsed || !Array.isArray(parsed.records)) return blankSummary()
    const records = parsed.records.filter(Boolean)
    return summarizeRecords(records)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return blankSummary()
    throw error
  }
}

export async function saveMemory(dataDir: string, summary: MemorySummary): Promise<void> {
  await fs.mkdir(dataDir, { recursive: true })
  const file = resolveDataFile(dataDir)
  const temp = `${file}.tmp`
  const payload = JSON.stringify({ records: summary.records }, null, 2)
  await fs.writeFile(temp, payload, 'utf8')
  await fs.rename(temp, file)
}

export async function appendMemoryRecord(dataDir: string, record: MemoryRecord): Promise<MemorySummary> {
  const current = await loadMemory(dataDir)
  const next = summarizeRecords([...current.records, record])
  await saveMemory(dataDir, next)
  return next
}

export async function clearMemory(dataDir: string): Promise<MemorySummary> {
  const next = blankSummary()
  await saveMemory(dataDir, next)
  return next
}

export function buildRecord(
  input: Omit<MemoryRecord, 'id' | 'createdAt'> & { createdAt?: string }
): MemoryRecord {
  return {
    id: createRecordId(),
    createdAt: input.createdAt || new Date().toISOString(),
    path: input.path,
    signature: input.signature,
    root: input.root,
    category: input.category,
    decision: input.decision,
    size: input.size,
    note: input.note
  }
}

export function decisionToSentence(entry: MemorySummaryEntry | undefined): string {
  if (!entry) return 'No memory yet'
  return `cleaned ${entry.cleaned}, kept ${entry.kept}, ignored ${entry.ignored}`
}
