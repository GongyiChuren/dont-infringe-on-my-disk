import { formatBytes, lowerPath, tailSegments } from './fs-utils'
import type { Category, PurposeAnalysis, ScanNode } from './types'

type PurposeRule = {
  matches: (node: ScanNode, normalizedPath: string) => boolean
  create: (node: ScanNode) => PurposeAnalysis
}

const purpose = (
  title: string,
  summary: string,
  details: string[],
  impact: string,
  confidence = 0.82
): PurposeAnalysis => ({ title, summary, details, impact, confidence })

const namedPath = (node: ScanNode): string => tailSegments(node.path, 3).join('\\') || node.name

const packageCache = (name: string, manager: string, impact: string): PurposeAnalysis => purpose(
  `${manager} 缓存`,
  `${name} 通常保存 ${manager} 下载过的包、压缩包或解压后的内容，用来加速下次安装。`,
  [
    `位置特征：${name}`,
    '这类目录变大通常来自频繁安装依赖、切换项目或多版本包共存。',
    '它不是你的源代码本体，更像“可重建的下载仓库”。'
  ],
  impact
)

const rules: PurposeRule[] = [
  {
    matches: (_node, p) => p.includes('/npm-cache') || p.includes('/_cacache') || p.includes('/content-v2') || p.includes('/sha512'),
    create: (node) => packageCache(namedPath(node), 'npm', '删除后 npm 可能重新下载依赖，首次安装会慢一些。')
  },
  {
    matches: (_node, p) => p.includes('/uv/cache') || p.includes('/uv\\cache') || p.includes('/archive-v0'),
    create: (node) => packageCache(namedPath(node), 'uv / Python', '删除后 uv 可能重新下载 Python 包或重新解压缓存。')
  },
  {
    matches: (_node, p) => p.includes('/pip/cache') || p.includes('/pip/cache'),
    create: (node) => packageCache(namedPath(node), 'pip / Python', '删除后 pip 可能重新下载 wheel 或源码包。')
  },
  {
    matches: (_node, p) => p.includes('/pnpm-store') || p.includes('/pnpm/store'),
    create: (node) => packageCache(namedPath(node), 'pnpm', '删除后 pnpm 会重新下载依赖，多个项目共享缓存会暂时失效。')
  },
  {
    matches: (_node, p) => p.includes('/yarn/cache') || p.includes('/yarn/berry/cache'),
    create: (node) => packageCache(namedPath(node), 'Yarn', '删除后 Yarn 会重新拉取依赖包。')
  },
  {
    matches: (_node, p) => p.includes('/dxcache') || p.includes('/glcache') || p.includes('/shadercache'),
    create: (node) => purpose('显卡 Shader 缓存', `${namedPath(node)} 通常是显卡驱动或游戏生成的着色器缓存。`, [
      '它用于减少游戏、设计软件或图形程序下次启动时的编译等待。',
      '体积变大通常来自运行过多个游戏、模拟器或图形应用。',
      '它通常可以重建，但删除后相关应用首次启动可能卡顿。'
    ], '删除后会自动重建，短期内游戏或图形应用可能重新编译 shader。')
  },
  {
    matches: (_node, p) => p.includes('/chrome/user data') || p.includes('/edge/user data') || p.includes('/chromium') || p.includes('/browser cache'),
    create: (node) => purpose('浏览器缓存', `${namedPath(node)} 多半是浏览器缓存、Service Worker 或页面资源。`, [
      '它保存网页图片、脚本、视频片段和站点临时数据。',
      '常见来源是 Chrome、Edge、Electron 应用或 Chromium 内核软件。',
      '如果包含登录态或站点数据，清理前要谨慎。'
    ], '删除纯缓存通常安全，但站点数据目录可能影响登录状态。')
  },
  {
    matches: (_node, p) => p.includes('/crash') || p.includes('/crashpad') || p.includes('/dumps') || p.includes('/crashdumps'),
    create: (node) => purpose('崩溃报告', `${namedPath(node)} 通常保存应用崩溃转储和诊断日志。`, [
      '它用于开发者或系统排查崩溃原因。',
      '普通使用者长期保留价值通常不高。',
      '如果你正在排查某个软件崩溃，可以先保留最近的报告。'
    ], '删除后一般不影响软件运行，但会失去对应崩溃现场。')
  }
]

export function explainPurpose(node: ScanNode, category: Category): PurposeAnalysis {
  const normalizedPath = lowerPath(node.path)
  const matched = rules.find((rule) => rule.matches(node, normalizedPath))
  if (matched) return matched.create(node)
  const size = formatBytes(node.size)
  if (category === 'cache') {
    return purpose('通用缓存', `${node.name} 看起来是缓存目录，用来加速应用或工具下次运行。`, [
      `当前估算占用 ${size}。`,
      '缓存通常可以重建，但第一次重新使用会慢一些。',
      '建议确认对应应用不在运行后再手动处理。'
    ], '删除后多半会重新生成，主要代价是重新下载或重新计算。', 0.62)
  }
  if (category === 'installer' || category === 'archive') {
    return purpose('安装包 / 归档文件', `${node.name} 像下载过的安装包、压缩包或镜像。`, [
      `当前估算占用 ${size}。`,
      '如果软件已经安装、归档已解压，通常可以转移或删除。',
      '如果它是唯一备份，请先保留。'
    ], '删除后不影响已安装软件，但会失去这份离线安装/备份文件。', 0.7)
  }
  return purpose('用途不明确', `${node.name} 的路径特征不够明确，只能做保守判断。`, [
    `当前估算占用 ${size}。`,
    '建议先看路径、创建时间和文件名，再决定是否处理。',
    'DIMD 不会替你删除这个项目。'
  ], '不确定来源时更适合先忽略或保留。', 0.38)
}
