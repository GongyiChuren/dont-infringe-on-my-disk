import { describe, expect, it } from 'vitest'
import { callAiAssistant } from '../src/main/ai-provider'

// 真实联网测试：用本机 ccswitch 的 anthropic 路由打 /v1/messages。
// 默认跳过，仅 DIMD_REAL_API=1 时运行，避免 CI 花钱/挂掉。
const skip = process.env.DIMD_REAL_API !== '1'

const baseUrl = process.env.DIMD_REAL_BASE_URL || 'https://runanytime.hxi.me'
const apiKey = process.env.DIMD_REAL_KEY || 'sk-NjElqah5ZJ4mJZ3nTiVLOPAF60X4CxeN2GQ3cv8Q16IyAsbp'
const model = process.env.DIMD_REAL_MODEL || 'deepseek/deepseek-v4-pro'

describe.skipIf(skip)('callAiAssistant against real anthropic-compatible endpoint', () => {
  it('anthropic-compatible returns a clean text reply from /v1/messages', async () => {
    const text = await callAiAssistant({
      provider: 'anthropic-compatible',
      baseUrl,
      model,
      apiKey,
      systemPrompt: '你是 DIMD 清理助手，只解释推荐不删文件。用简体中文回答。',
      messages: [{ role: 'user', content: '用一句简体中文回答：1+1等于几？' }],
      maxTokens: 200,
      timeoutMs: 60000
    })
    expect(text.length).toBeGreaterThan(0)
    expect(text).toContain('2')
  }, 90000)
})
