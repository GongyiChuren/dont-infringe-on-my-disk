# Don't Infringe on My Disk

[English](#english) | [中文](#中文)

## English

Don't Infringe on My Disk, or DIMD, is a Windows desktop assistant for finding suspicious disk growth and explaining what the biggest cleanup candidates probably are.

It is designed for cautious cleanup: DIMD recommends, explains, and records your choices. It does not automatically delete files.

### Download

Download the latest Windows build from [GitHub Releases](https://github.com/GongyiChuren/dont-infringe-on-my-disk/releases).

- `DIMD-0.1.1-x64.exe`: portable version.
- `DIMD-Setup-0.1.1-x64.exe`: installer version.

### What It Does

- Scans a selected Windows path and ranks the Top-K likely cleanup candidates.
- Defaults to Top-K 10, with a configurable range of 10 to 100.
- Uses quick scan mode for common high-yield locations such as temp folders, package caches, shader caches, crash dumps, and downloads.
- Keeps deep scan mode for slower recursive inspection.
- Explains what a candidate is likely used for, why it may grow, and what cleanup usually means.
- Records user decisions such as cleaned, kept, or ignored, then uses that memory to adjust later recommendations.
- Provides an assistant drawer with local rule-based memory for safe cleanup planning.
- Includes AI provider settings for local Codex, Claude Code, OpenCode, OpenAI Responses API, OpenAI-compatible chat APIs, and Anthropic-compatible APIs.

### Safety Promise

DIMD does not delete files for you.

The first version only produces candidate recommendations, explanations, and local records. Any cleanup action remains a user decision outside the app.

### Current AI Status

The settings UI and encrypted API key storage are implemented.

Real provider calls are not wired yet. The assistant drawer currently runs as a local rule-based MVP and only suggests safe actions such as changing Top-K, switching scan targets, starting scans, or remembering preferences.

API setting names mean:

- Local Codex, Claude Code, and OpenCode modes are local runner choices and do not need a URL or API key.
- OpenAI Responses API: official `/v1/responses` style endpoint.
- OpenAI-compatible Chat API: common `/v1/chat/completions` style endpoint used by many compatible providers.

### Requirements

- Windows for the packaged app.
- Node.js and npm for development.

### Development

Install dependencies:

```bash
npm install
```

Run in development mode:

```bash
npm run dev
```

Run tests:

```bash
npm test
```

Run TypeScript checks:

```bash
npm run typecheck
```

Build the app:

```bash
npm run build
```

### Packaging

Build both portable and installer artifacts:

```bash
npm run dist
```

Build only the portable executable:

```bash
npm run dist:portable
```

Build only the NSIS installer:

```bash
npm run dist:installer
```

Packaging output is written to `release/`. This directory is ignored by Git and should be uploaded as a GitHub Release artifact instead of being committed to the source repository.

### Local Data

DIMD stores runtime data in `.dimd-data/`.

This may include app settings, cleanup decision memory, assistant memory, and encrypted AI key data. It is intentionally ignored by Git and should not be committed, zipped into source releases, or shared publicly.

The project-level `memory.md` file is also local-only and ignored by Git.

### Icon Credit

The app icon is based on Lucide's `hard-drive` icon under the ISC License, with a custom DIMD composition. See `THIRD_PARTY_NOTICES.md`.

### Repository Layout

```text
src/main/       Electron main process code
src/preload/    Preload bridge
src/renderer/   React UI
src/shared/     Shared scan, analysis, memory, and settings logic
tests/          Vitest tests
```

### License

MIT

## 中文

Don't Infringe on My Disk，简称 DIMD，是一个 Windows 桌面工具，用来发现“是谁让磁盘变大了”，并解释哪些 Top-K 候选项更可能是可以清理的空间占用。

它的定位是谨慎清理：DIMD 只推荐、解释并记录你的选择，不会自动删除文件。

### 下载

最新版 Windows 构建可以从 [GitHub Releases](https://github.com/GongyiChuren/dont-infringe-on-my-disk/releases) 下载。

- `DIMD-0.1.1-x64.exe`：便携版，直接运行。
- `DIMD-Setup-0.1.1-x64.exe`：安装版，可选择安装目录。

### 功能

- 扫描用户选择的 Windows 路径，并给出最可能值得关注的 Top-K 候选。
- Top-K 默认是 10，可设置范围是 10 到 100。
- 默认使用快速扫描，优先扫描临时目录、包管理缓存、Shader 缓存、崩溃转储、下载目录等高收益位置。
- 保留深度扫描模式，用于更慢但更完整的递归扫描。
- 解释候选项大概是什么、为什么会变大，以及清理后通常会有什么影响。
- 记录用户选择，例如已清理、保留、忽略，并用这些记忆调整后续推荐倾向。
- 提供带本地规则记忆的助手抽屉，用于安全地规划清理。
- 提供 AI 接入设置，包含本地 Codex、Claude Code、OpenCode、OpenAI Responses API、OpenAI-compatible Chat API 和 Anthropic-compatible API。

### 安全承诺

DIMD 不会替你删除文件。

第一版只做候选推荐、解释和本地记录。真正的清理动作仍然由用户在应用外自行决定和执行。

### 当前 AI 状态

设置界面和 API Key 加密保存已经实现。

真实 AI Provider 调用还没有接入。当前助手抽屉仍然是本地规则型 MVP，只会建议安全动作，例如修改 Top-K、切换扫描路径、开始扫描或记住偏好。

AI 设置里的名称含义：

- 本地 Codex、Claude Code、OpenCode 是本机运行器选项，不需要 URL 或 API Key。
- OpenAI Responses API 指官方 `/v1/responses` 风格接口。
- OpenAI-compatible Chat API 指很多兼容服务使用的 `/v1/chat/completions` 风格接口。

### 环境要求

- 打包后的应用面向 Windows。
- 开发需要 Node.js 和 npm。

### 开发

安装依赖：

```bash
npm install
```

启动开发模式：

```bash
npm run dev
```

运行测试：

```bash
npm test
```

运行 TypeScript 检查：

```bash
npm run typecheck
```

构建应用：

```bash
npm run build
```

### 打包

同时构建便携版和安装版：

```bash
npm run dist
```

只构建便携版：

```bash
npm run dist:portable
```

只构建 NSIS 安装包：

```bash
npm run dist:installer
```

打包产物会写入 `release/`。这个目录被 Git 忽略，应该作为 GitHub Release 附件上传，不应该提交进源码仓库。

### 本地数据

DIMD 会把运行时数据保存在 `.dimd-data/`。

这里可能包含应用设置、清理决策记忆、助手记忆和加密后的 AI Key 数据。该目录会被 Git 忽略，不应提交、打进源码压缩包或公开分享。

项目级 `memory.md` 也是本地文件，会被 Git 忽略。

### 图标来源

应用图标基于 Lucide 的 `hard-drive` 图标制作，使用 ISC License，并做了 DIMD 自己的组合设计。详情见 `THIRD_PARTY_NOTICES.md`。

### 仓库结构

```text
src/main/       Electron 主进程代码
src/preload/    Preload 桥接代码
src/renderer/   React 界面
src/shared/     扫描、分析、记忆和设置等共享逻辑
tests/          Vitest 测试
```

### 许可证

MIT
