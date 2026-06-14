// tests/prompts/input.test.ts
import { describe, it, expect } from 'vitest'
import { inputPicker } from '../../src/prompts/input.js'
import { renderTest } from '../../src/core/testing.js'

describe('inputPicker', () => {
  it('collects typed text and submits on enter', async () => {
    const { answer, events } = await renderTest(inputPicker as any, { message: 'Name?' })
    events.type('Ada')
    events.keypress('enter')
    expect(await answer).toBe('Ada')
  })
  it('uses the default when submitted empty', async () => {
    const { answer, events } = await renderTest(inputPicker as any, { message: 'Name?', default: 'Grace' })
    events.keypress('enter')
    expect(await answer).toBe('Grace')
  })
  it('blocks submit and shows the validation error', async () => {
    const { answer, events, getScreen } = await renderTest(inputPicker as any, {
      message: 'Name?',
      validate: (v: string) => (v.length > 0 ? true : 'required'),
    })
    events.keypress('enter')
    expect(getScreen()).toContain('required')
    events.type('x')
    events.keypress('enter')
    expect(await answer).toBe('x')
  })
})
