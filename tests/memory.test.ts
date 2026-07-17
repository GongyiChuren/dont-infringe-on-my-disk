import { describe, expect, it } from 'vitest'
import { buildRecord, summarizeRecords } from '../src/shared/memory'

describe('memory summary', () => {
  it('tracks cleaned and kept actions per signature', () => {
    const first = buildRecord({
      path: 'C:\\Temp\\cache',
      root: 'C:\\',
      category: 'cache',
      decision: 'cleaned',
      size: 100,
      signature: 'cache|dir||temp'
    })
    const second = buildRecord({
      path: 'C:\\Temp\\cache',
      root: 'C:\\',
      category: 'cache',
      decision: 'kept',
      size: 100,
      signature: 'cache|dir||temp'
    })

    const summary = summarizeRecords([first, second])
    expect(summary.bySignature['cache|dir||temp'].cleaned).toBe(1)
    expect(summary.bySignature['cache|dir||temp'].kept).toBe(1)
  })
})
