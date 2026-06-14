// tests/prompts/select.test.ts
import { describe, it, expect } from 'vitest'
import { selectPicker } from '../../src/prompts/select.js'
import { renderTest } from '../../src/core/testing.js'

const choices = [
  { name: 'Alpha', value: 'a' },
  { name: 'Bravo', value: 'b' },
  { name: 'Charlie', value: 'c' },
]

describe('selectPicker', () => {
  it('renders choices and submits the highlighted value', async () => {
    const { answer, events, getScreen } = await renderTest(selectPicker as any, { message: 'Pick', choices })
    expect(getScreen()).toContain('Alpha')
    events.keypress('down')
    events.keypress('enter')
    expect(await answer).toBe('b')
  })
  it('wraps navigation with loop', async () => {
    const { answer, events } = await renderTest(selectPicker as any, { message: 'Pick', choices })
    events.keypress('up') // wrap to last
    events.keypress('enter')
    expect(await answer).toBe('c')
  })
})
