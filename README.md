# Don't Infringe on My Disk

Don't Infringe on My Disk, or DIMD, is a Windows desktop assistant for finding suspicious disk growth and explaining what the biggest cleanup candidates probably are.

It is designed for cautious cleanup: DIMD recommends, explains, and records your choices. It does not automatically delete files.

## What It Does

- Scans a selected Windows path and ranks the Top-K likely cleanup candidates.
- Defaults to Top-K 10, with a configurable range of 10 to 100.
- Uses a quick scan mode for common high-yield locations such as temp folders, package caches, shader caches, crash dumps, and downloads.
- Keeps a deep scan mode for slower recursive inspection.
- Explains what a candidate is likely used for, why it may grow, and what cleanup usually means.
- Records user decisions such as cleaned, kept, or ignored, then uses that memory to adjust later recommendations.
- Provides an assistant drawer with local rule-based memory for safe cleanup planning.
- Includes AI provider settings for local Codex, Claude Code, OpenCode, OpenAI Responses API, OpenAI-compatible chat APIs, and Anthropic-compatible APIs.

## Safety Promise

DIMD does not delete files for you.

The first version only produces candidate recommendations, explanations, and local records. Any cleanup action remains a user decision outside the app.

## Current AI Status

The settings UI and encrypted API key storage are implemented.

Real provider calls are not wired yet. The assistant drawer currently runs as a local rule-based MVP and only suggests safe actions such as changing Top-K, switching scan targets, starting scans, or remembering preferences.

API setting names mean:

- Local Codex, Claude Code, and OpenCode modes are local runner choices and do not need a URL or API key.
- OpenAI Responses API: official `/v1/responses` style endpoint.
- OpenAI-compatible Chat API: common `/v1/chat/completions` style endpoint used by many compatible providers.

## Requirements

- Windows for the packaged app.
- Node.js and npm for development.

## Development

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

## Packaging

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

## Local Data

DIMD stores runtime data in `.dimd-data/`.

This may include app settings, cleanup decision memory, assistant memory, and encrypted AI key data. It is intentionally ignored by Git and should not be committed, zipped into source releases, or shared publicly.

The project-level `memory.md` file is also local-only and ignored by Git.

## Repository Layout

```text
src/main/       Electron main process code
src/preload/    Preload bridge
src/renderer/   React UI
src/shared/     Shared scan, analysis, memory, and settings logic
tests/          Vitest tests
```

## License

MIT
