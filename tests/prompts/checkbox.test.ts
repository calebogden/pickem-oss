// tests/prompts/checkbox.test.ts
import { describe, it, expect } from 'vitest'
import { checkboxPicker } from '../../src/prompts/checkbox.js'
import { renderTest } from '../../src/core/testing.js'

const choices = [
  { name: 'A', value: 'a' },
  { name: 'B', value: 'b' },
  { name: 'C', value: 'c', checked: true },
]

describe('checkboxPicker', () => {
  it('toggles with space and returns selections in SOURCE order', async () => {
    const { answer, events } = await renderTest(checkboxPicker as any, { message: 'Pick', choices })
    events.keypress('space') // toggle A on (cursor at 0)
    events.keypress('enter')
    expect(await answer).toEqual(['a', 'c']) // source order, not toggle order
  })
  it('blocks submit when required and nothing selected', async () => {
    const empty = [{ name: 'A', value: 'a' }]
    const { answer, events, getScreen } = await renderTest(checkboxPicker as any, {
      message: 'Pick',
      choices: empty,
      required: true,
    })
    events.keypress('enter')
    expect(getScreen()).toMatch(/at least one|required/i)
    events.keypress('space')
    events.keypress('enter')
    expect(await answer).toEqual(['a'])
  })
})
