import { formatBytes, lowerPath, tailSegments } from './fs-utils'
import { explainPurpose } from './purpose'
import type { AnalysisResult, Category, MemorySummary, ScanNode } from './types'

const PROTECTED_SEGMENTS = [
  'windows',
  'program files',
  'program files (x86)',
  'programdata',
  'system volume information',
  '$recycle.bin',
  'recovery',
  'boot',
  'perf logs',
  'msocache'
]

const CACHE_SEGMENTS = ['cache', '.cache', 'temp', 'tmp', 'shadercache', 'code cache', 'crashpad', 'gpucache']
const TEMP_SEGMENTS = ['temp', 'tmp', 'logs', 'log', 'dump', 'crash', 'diagnostics', 'report']
const DOWNLOAD_SEGMENTS = ['downloads', 'download', 'installer', 'setup', 'update', 'updates', 'upgrade']
const ARCHIVE_EXTS = ['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz', 'iso', 'img']
const MEDIA_EXTS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'mp4', 'mkv', 'mov', 'avi', 'mp3', 'flac', 'wav', 'aac', 'heic']
const CODE_EXTS = ['ts', 'tsx', 'js', 'jsx', 'py', 'go', 'rs', 'c', 'cc', 'cpp', 'cs', 'java', 'kt', 'swift', 'html', 'css', 'json', 'yml', 'yaml', 'md']
const APP_DATA_SEGMENTS = ['appdata', 'local', 'roaming', 'locallow', '.config', '.npm', '.pnpm-store', '.cache', 'electron', 'app-data']
const PERSONAL_SEGMENTS = ['desktop', 'documents', 'downloads', 'pictures', 'videos', 'music', 'notes', 'projects', 'workspace']

const CATEGORY_LABEL: Record<Category, string> = {
  cache: '缓存',
  temp: '临时文件',
  download: '下载内容',
  installer: '安装包',
  archive: '压缩包 / 镜像',
  media: '媒体文件',
  code: '项目 / 构建产物',
  personal: '个人文件',
  system: '系统区域',
  'app-data': '应用数据',
  logs: '日志',
  unknown: '未知类型'
}

const CATEGORY_RISK: Record<Category, AnalysisResult['risk']> = {
  cache: 'low',
  temp: 'low',
  download: 'low',
  installer: 'medium',
  archive: 'low',
  media: 'medium',
  code: 'medium',
  personal: 'high',
  system: 'high',
  'app-data': 'medium',
  logs: 'low',
  unknown: 'medium'
}

function pathTokens(node: ScanNode): string[] {
  const tokens = lowerPath(node.path)
    .split('/')
    .filter(Boolean)
  if (node.ext) {
    tokens.push(node.ext.toLowerCase())
  }
  return tokens
}

function hasToken(tokens: string[], pool: string[]): boolean {
  return pool.some((item) => tokens.some((token) => token.includes(item)))
}

function classifyCategory(node: ScanNode): { category: Category; reasons: string[] } {
  const tokens = pathTokens(node)
  const reasons: string[] = []

  if (hasToken(tokens, PROTECTED_SEGMENTS)) {
    return { category: 'system', reasons: ['Windows 受保护区域'] }
  }
  if (hasToken(tokens, CACHE_SEGMENTS)) {
    reasons.push('路径像缓存目录')
    return { category: 'cache', reasons }
  }
  if (hasToken(tokens, TEMP_SEGMENTS)) {
    reasons.push('路径像临时文件或日志')
    return { category: 'temp', reasons }
  }
  if (hasToken(tokens, DOWNLOAD_SEGMENTS)) {
    reasons.push('常见下载或安装包路径')
    return { category: 'download', reasons }
  }
  if (hasToken(tokens, APP_DATA_SEGMENTS)) {
    reasons.push('应用数据目录')
    return { category: 'app-data', reasons }
  }
  if (hasToken(tokens, PERSONAL_SEGMENTS)) {
    reasons.push('可能是用户个人文件')
    return { category: 'personal', reasons }
  }
  if (node.isDirectory && (tokens.includes('node_modules') || tokens.includes('dist') || tokens.includes('build') || tokens.includes('out'))) {
    reasons.push('项目依赖或构建产物')
    return { category: 'code', reasons }
  }
  if (!node.isDirectory && ARCHIVE_EXTS.includes(node.ext.toLowerCase())) {
    reasons.push('压缩包或磁盘镜像')
    return { category: 'archive', reasons }
  }
  if (!node.isDirectory && MEDIA_EXTS.includes(node.ext.toLowerCase())) {
    reasons.push('媒体文件')
    return { category: 'media', reasons }
  }
  if (!node.isDirectory && CODE_EXTS.includes(node.ext.toLowerCase())) {
    reasons.push('源码或文本文件')
    return { category: 'code', reasons }
  }
  if (!node.isDirectory && node.ext.toLowerCase() === 'log') {
    reasons.push('日志文件')
    return { category: 'logs', reasons }
  }
  if (!node.isDirectory && ['exe', 'msi', 'pkg', 'dmg'].includes(node.ext.toLowerCase())) {
    reasons.push('安装包或可执行文件')
    return { category: 'installer', reasons }
  }
  return { category: 'unknown', reasons: ['路径特征不明显'] }
}

function confidenceFromSignals(signals: string[]): number {
  return Math.max(0.25, Math.min(0.98, 0.5 + signals.length * 0.12))
}

function baseScore(node: ScanNode): number {
  const sizeMb = node.size / (1024 * 1024)
  return Math.log2(sizeMb + 1) * 6
}

function categoryScore(category: Category): number {
  const weights: Record<Category, number> = {
    cache: 40,
    temp: 32,
    download: 24,
    installer: 18,
    archive: 20,
    media: 8,
    code: 12,
    personal: -38,
    system: -120,
    'app-data': -8,
    logs: 28,
    unknown: 0
  }
  return weights[category]
}

function sizeScore(node: ScanNode): number {
  if (node.size >= 1024 * 1024 * 1024) return 20
  if (node.size >= 512 * 1024 * 1024) return 15
  if (node.size >= 128 * 1024 * 1024) return 10
  if (node.size >= 32 * 1024 * 1024) return 5
  return 0
}

function ageScore(node: ScanNode): number {
  if (!node.mtimeMs) return 0
  const days = (Date.now() - node.mtimeMs) / (1000 * 60 * 60 * 24)
  if (days >= 365) return 10
  if (days >= 180) return 7
  if (days >= 45) return 3
  if (days <= 7) return -10
  if (days <= 30) return -4
  return 0
}

function memoryScore(signature: string, memory: MemorySummary): number {
  const entry = memory.bySignature[signature]
  if (!entry) return 0
  const cleanedBias = entry.cleaned * 8
  const keptBias = entry.kept * -6
  const ignoredBias = entry.ignored * -2
  return Math.max(-20, Math.min(24, cleanedBias + keptBias + ignoredBias))
}

function recommendationSentence(category: Category, node: ScanNode, reasons: string[]): string {
  const sizeText = formatBytes(node.size)
  const tail = tailSegments(node.path, 2).join('\\')
  const fallback = node.isDirectory ? '较大的目录候选' : '较大的文件候选'
  const lead = CATEGORY_LABEL[category] || fallback
  const extra = reasons[0] || fallback
  return `${lead} · ${extra} · ${tail || node.name} · ${sizeText}`
}

function explanationLines(category: Category, node: ScanNode, reasons: string[], memoryBoost: number): string[] {
  const lines = [
    node.isDirectory ? '这是一个目录。' : '这是一个文件。',
    `推测类型：${CATEGORY_LABEL[category] || '未知类型'}。`
  ]
  if (reasons.length) {
    lines.push(...reasons.slice(0, 3).map((reason) => reason.endsWith('。') ? reason : `${reason}。`))
  }
  if (memoryBoost > 0) {
    lines.push(`历史清理记录让它更像可处理项（+${memoryBoost}）。`)
  } else if (memoryBoost < 0) {
    lines.push(`历史选择让它更像需要保留的项目（${memoryBoost}）。`)
  }
  return lines
}

function categoryShouldRecommend(category: Category, score: number): boolean {
  if (category === 'system' || category === 'personal') return false
  return score >= 8
}

export function createSignature(node: ScanNode, category: Category): string {
  const tail = tailSegments(node.path, 4).join('|')
  const ext = node.ext.toLowerCase()
  return `${category}|${node.isDirectory ? 'dir' : 'file'}|${ext}|${tail}`
}

export function analyzeNode(node: ScanNode, memory: MemorySummary): AnalysisResult {
  const classified = classifyCategory(node)
  const signature = createSignature(node, classified.category)
  const reasons = [...classified.reasons]
  if (node.size >= 1024 * 1024 * 1024) reasons.push('占用空间很大')
  else if (node.size >= 100 * 1024 * 1024) reasons.push('占用空间值得关注')
  if (!node.isDirectory && ['zip', 'rar', '7z', 'iso', 'img'].includes(node.ext.toLowerCase())) {
    reasons.push('压缩包或镜像文件')
  }
  if (!node.isDirectory && ['log', 'tmp', 'cache', 'dmp', 'bak', 'old'].includes(node.ext.toLowerCase())) {
    reasons.push('临时文件风格扩展名')
  }
  const memoryBoost = memoryScore(signature, memory)
  const score = Math.round(
    baseScore(node) +
      categoryScore(classified.category) +
      sizeScore(node) +
      ageScore(node) +
      memoryBoost +
      (node.childCount >= 500 ? 6 : 0)
  )
  const risk = CATEGORY_RISK[classified.category]
  const confidence = confidenceFromSignals(reasons)
  const summary = recommendationSentence(classified.category, node, reasons)
  const purpose = explainPurpose(node, classified.category)
  return {
    category: classified.category,
    label: CATEGORY_LABEL[classified.category] || 'Unknown',
    summary,
    purpose,
    reasons,
    risk,
    confidence,
    score,
    memoryBoost,
    signature,
    shouldRecommend: categoryShouldRecommend(classified.category, score)
  }
}

export function explainNode(node: ScanNode, memory: MemorySummary): AnalysisResult {
  return analyzeNode(node, memory)
}
