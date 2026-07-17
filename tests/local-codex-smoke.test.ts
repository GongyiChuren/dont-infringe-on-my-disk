import { spawn } from 'node:child_process'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

// 该测试真实调用本机 `codex exec`，依赖登录态且消耗额度、约 20s。
// 仅手动验证用；不放进默认 CI。运行命令：
//   CODEX_RUN_REAL=1 npx vitest run tests/local-codex-smoke.test.ts
// 环境 CODEX_SKIP 把它整体跳过。
const skip = process.env.CODEX_RUN_REAL !== '1'

describe.skipIf(skip)('local-codex smoke (real CLI)', () => {
  it('codex exec --skip-git-repo-check --ephemeral -o writes a clean reply', async () => {
    const tmpDir = await mkdtemp(path.join(os.tmpdir(), 'dimd-smoke-'))
    const outFile = path.join(tmpDir, 'reply.txt')
    try {
      const prompt = [
        '你是 DIMD 清理助手。用简体中文简短回答。',
        'user: 只看 Top-K 不删，安全吗？',
        '请作为 DIMD 助手简短回应。'
      ].join('\n')
      const args = ['exec', '--skip-git-repo-check', '--ephemeral', '-s', 'read-only', '-o', outFile, '-']
      await new Promise<void>((resolve, reject) => {
        const child = spawn('codex', args, { cwd: process.cwd(), shell: process.platform === 'win32' })
        child.stdin?.end(prompt, 'utf8')
        let stderr = ''
        child.stderr?.on('data', (chunk: Buffer) => { stderr += chunk.toString('utf8') })
        child.on('error', reject)
        child.on('close', (code) => {
          if (code !== 0) reject(new Error('codex exit ' + code + ': ' + stderr.slice(-300)))
          else resolve()
        })
      })
      let reply = ''
      try { reply = await readFile(outFile, 'utf8') } catch { reply = '' }
      expect(reply.trim().length).toBeGreaterThan(0)
    } finally {
      await rm(tmpDir, { recursive: true, force: true })
    }
  }, 120000)
})
