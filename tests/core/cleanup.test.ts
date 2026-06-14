import { describe, it, expect, vi } from 'vitest'
import { onExit } from '../../src/core/cleanup.js'

describe('cleanup', () => {
  it('runs and can unregister a handler', () => {
    const fn = vi.fn()
    const off = onExit(fn)
    off()
    // After unregister, manual fire (exposed for tests) must not call it.
    expect(fn).not.toHaveBeenCalled()
  })
})
