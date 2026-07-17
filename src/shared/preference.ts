import { lowerPath } from './fs-utils'
import type { AssistantMemoryNote } from './types'

// 从助手记忆里解析出"不要扫描"的目录前缀。
// 只接受明确的盘符路径（X:\...），避免一句话就误排除整盘根。
// note 文本由 buildPreferenceNote 写成结构化格式："不要扫描/推荐目录：<路径>"
const SKIP_PREFIX = '不要扫描/推荐目录：'

export function parseExcludePaths(notes: AssistantMemoryNote[]): string[] {
  const result: string[] = []
  for (const note of notes) {
    const text = (note.text || '').trim()
    if (!text.startsWith(SKIP_PREFIX)) continue
    const rest = text.slice(SKIP_PREFIX.length).trim()
    if (/^[a-zA-Z]:\\/.test(rest)) {
      // 按分号或空格切，取第一段有效的盘符路径
      const candidate = rest.split(/[；;\s]/)[0].trim()
      if (/^[a-zA-Z]:\\/.test(candidate)) result.push(candidate)
    }
  }
  const seen = new Set<string>()
  return result.filter((p) => {
    const key = lowerPath(p)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export function describeExcludePaths(excludePaths: string[]): string {
  if (excludePaths.length === 0) return ''
  return '用户已要求不要扫描这些目录：' + excludePaths.join('；') + '。'
}
