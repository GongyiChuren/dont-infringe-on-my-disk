# Changelog

## v0.1.5 (2026-07-18)

First published build with a real wired assistant, scan speed, and UX cleanup.

### Assistant — real AI providers

- The assistant drawer now calls a real remote endpoint when a provider is fully configured. OpenAI-compatible Chat API (`/chat/completions`), OpenAI Responses API (`/responses`), and Anthropic-compatible API (`/v1/messages`) are supported. API keys are stored via Electron `safeStorage`. On any call failure, the fallback local rule engine is used with a visible prefix, never faking success.
- When no provider is configured, the assistant stays in local rule mode labeled "offline".

### Assistant — rank-aware Q&A

- The AI system prompt now embeds per-candidate detail (category, purpose summary, details, impact, reasons). Asking "what is item N, can I delete it?" returns a grounded answer about that exact candidate instead of echoing the list.
- Low-risk candidates are explained with their purpose and rebuild cost; high-risk / personal / system areas are recommended to keep.

### Assistant — real-time and skip preferences

- A "thinking..." animated bubble is shown while the model replies.
- Phrases like "don't scan/recommend `X:\...`" are captured as structured notes and parsed into exclusion prefixes that the scanner honors; matching subtrees are skipped and a warning is recorded in the report.

### Scan improvements

- Progress reporting is throttled by time (~200ms) instead of every 80 items, so large dirs don't flood IPC and small dirs report sooner.
- Candidate regexes are hoisted to module-level constants to avoid recompiling on each walk.

### UI fixes

- Candidate list keys now combine signature and path to avoid collisions.
- Thought bubble, sharper focused compose outline, and styled inline code in chat bubbles.

### Removed

- Local CLI providers (local Codex / Claude Code / OpenCode) and their child-process spawn logic. Only Base URL + model + API Key providers remain.

### Tests

- Added `tests/ai-provider.test.ts` (mock HTTP for all three providers), `tests/ai-provider-real.test.ts` (real anthropic-compatible smoke, opt-in), `tests/recommendations.test.ts`, `tests/purpose.test.ts`, `tests/preference.test.ts`, and a scanner exclude-paths case.

## v0.1.1 (2026-07-17)

- Added the dedicated DIMD app icon (Lucide `hard-drive`, ISC License).
- Bilingual README and GitHub Releases packaging.

## v0.1.0 (2026-07-17)

- Initial desktop app: scan, Top-K, explanations, decision memory, assistant drawer (local rule MVP), AI settings UI.

# 更新日志

## v0.1.5 (2026-07-18)

第一个接通真实助手的发布版本，并在扫描速度与界面上做了清理。

### 助手 — 真实 AI Provider 接入

- 配置完整后，助手抽屉会真正调用远程接口：支持 OpenAI-compatible Chat API（`/chat/completions`）、OpenAI Responses API（`/responses`）、Anthropic-compatible API（`/v1/messages`）。API Key 使用 Electron `safeStorage` 加密保存。调用失败时回退本地规则引擎并加可见前缀，绝不伪造成功。
- 未配置 provider 时维持本地规则模式，标记为"未联网"。

### 助手 — 按编号问答

- AI 系统提示词现在注入每个候选的完整分析（类别、用途摘要、细节、删除影响、依据）。问"第 N 项是什么、能删吗"会基于那一项给出有依据的回答，而不是照抄列表。
- 低风险项会解释用途和重建代价，但仍提醒你自行删除；高风险/个人/系统区建议保留。

### 助手 — 实时对话与跳过偏好

- 等待模型回复时会显示"正在思考……"动画气泡。
- "别扫描/别推荐 `X:\...`"会被记成结构化偏好，并真被 scanner 跳过，扫描报告里会注明已跳过。

### 扫描优化

- 进度上报改为按时间节流（约 200ms），大目录不再刷屏、小目录也能尽快报进度。
- 候选识别正则提为模块级常量，避免每次遍历重新编译。

### 界面修复

- 候选列表的 key 改为签名 + 路径组合，避免重复碰撞。
- 思考态气泡、发送框 focus 描边、聊天气泡内代码块样式。

### 移除

- 本地 CLI provider（Codex / Claude Code / OpenCode）及其 spawn 子进程逻辑。只保留填 Base URL + 模型 + API Key 的接入方式。

### 测试

- 新增 `tests/ai-provider.test.ts`（三种 provider 的 mock HTTP）、`tests/ai-provider-real.test.ts`（真实 anthropic-compatible 冒烟，默认跳过）、`tests/recommendations.test.ts`、`tests/purpose.test.ts`、`tests/preference.test.ts`，以及 scanner 的 excludePaths 用例。

## v0.1.1 (2026-07-17)

- 加入 DIMD 专用软件图标（基于 Lucide `hard-drive`，ISC License）。
- 中英双语 README 和 GitHub Releases 打包。

## v0.1.0 (2026-07-17)

- 初始桌面应用：扫描、Top-K、用途解释、处理记录记忆、助手抽屉（本地规则 MVP）、AI 设置界面。
