# Don't Infringe on My Disk

[English](#english) | [中文](#中文)

## English

Don't Infringe on My Disk, or DIMD, is a Windows desktop assistant for finding suspicious disk growth and explaining what the biggest cleanup candidates probably are.

It is designed for cautious cleanup: DIMD recommends, explains, and records your choices. It does not automatically delete files.

### Download

Download the latest Windows build from [GitHub Releases](https://github.com/GongyiChuren/dont-infringe-on-my-disk/releases).

- `DIMD-0.1.5-x64.exe`: portable version.
- `DIMD-Setup-0.1.5-x64.exe`: installer version.

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

Real provider calls are wired. Configure a provider in the AI settings with Base URL, model, and API Key:

- OpenAI Responses API uses the official `/v1/responses` style endpoint.
- OpenAI-compatible Chat API uses the common `/v1/chat/completions` style endpoint supported by many third-party services.
- Anthropic-compatible API uses `/v1/messages`.

The API key is encrypted with Electron `safeStorage`. When a provider is not fully configured, or a request fails, the assistant falls back to a local rule engine with a visible offline label and never fake-deletes files.

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
CHANGELOG.md    Version history in English and Chinese
```

### License

MIT

## 中文

Don't Infringe on My Disk，简称 DIMD，是一个 Windows 桌面工具，用来发现“是谁让磁盘变大了”，并解释哪些 Top-K 候选项更可能是可以清理的空间占用。

它的定位是谨慎清理：DIMD 只推荐、解释并记录你的选择，不会自动删除文件。

### 下载

最新版 Windows 构建可以从 [GitHub Releases](https://github.com/GongyiChuren/dont-infringe-on-my-disk/releases) 下载。

- `DIMD-0.1.5-x64.exe`：便携版，直接运行。
- `DIMD-Setup-0.1.5-x64.exe`：安装版，可选择安装目录。

### 功能

- 扫描用户选择的 Windows 路径，并给出最可能值得关注的 Top-K 候选。
- Top-K 默认是 10，可设置范围是 10 到 100。
- 默认使用快速扫描，优先扫描临时目录、包管理缓存、Shader 缓存、崩溃转储、下载目录等高收益位置。
- 保留深度扫描模式，用于更慢但更完整的递归扫描。
- 解释候选项大概是什么、为什么会变大，以及清理后通常会有什么影响。
- 记录用户选择，例如已清理、保留、忽略，并用这些记忆调整后续推荐倾向。
- 提供带本地规则记忆的助手抽屉，用于安全地规划清理。
- 提供 AI 接入设置，包含 OpenAI Responses API、OpenAI-compatible Chat API 和 Anthropic-compatible API。助手可以基于当前 Top-K 回答"第 N 项是什么、能删吗"，并记住"别扫描 X:\"这类结构化偏好，scanner 会真的按这些前缀跳过匹配目录。

### 安全承诺

DIMD 不会替你删除文件。

第一版只做候选推荐、解释和本地记录。真正的清理动作仍然由用户在应用外自行决定和执行。

### 当前 AI 状态

真实 AI 调用已接通。在 AI 设置里填写 Base URL、模型和 API Key 即可：

- OpenAI Responses API 走官方 `/v1/responses` 风格接口。
- OpenAI-compatible Chat API 走很多兼容服务使用的 `/v1/chat/completions` 风格接口。
- Anthropic-compatible API 走 `/v1/messages`。

API Key 使用 Electron `safeStorage` 加密保存。未完整配置、或调用失败时，助手回退本地规则引擎并标记"未联网"，绝不伪装删除文件。

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
CHANGELOG.md    中英双语版本历史
```

### 许可证

MIT
