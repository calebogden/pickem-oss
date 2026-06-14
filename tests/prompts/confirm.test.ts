// tests/prompts/confirm.test.ts
import { describe, it, expect } from 'vitest'
import { confirmPicker } from '../../src/prompts/confirm.js'
import { renderTest } from '../../src/core/testing.js'

describe('confirmPicker', () => {
  it('returns true for y', async () => {
    const { answer, events } = await renderTest(confirmPicker as any, { message: 'OK?' })
    events.type('y')
    events.keypress('enter')
    expect(await answer).toBe(true)
  })
  it('returns the default on empty enter', async () => {
    const { answer, events } = await renderTest(confirmPicker as any, { message: 'OK?', default: false })
    events.keypress('enter')
    expect(await answer).toBe(false)
  })
})
