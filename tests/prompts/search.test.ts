// tests/prompts/search.test.ts
import { describe, it, expect } from 'vitest'
import { searchPicker } from '../../src/prompts/search.js'
import { renderTest } from '../../src/core/testing.js'

const all = [
  { name: 'apple', value: 'apple' },
  { name: 'apricot', value: 'apricot' },
  { name: 'banana', value: 'banana' },
]
const source = async (term: string) =>
  all.filter((c) => c.name.includes(term))

describe('searchPicker', () => {
  it('filters via source as you type and submits the highlighted value', async () => {
    const { answer, events, getScreen } = await renderTest(searchPicker as any, { message: 'Fruit', source })
    await Promise.resolve() // let initial source() resolve
    events.type('ap')
    await Promise.resolve()
    const screen = getScreen()
    expect(screen).toContain('apple')
    expect(screen).not.toContain('banana')
    events.keypress('enter')
    expect(await answer).toBe('apple')
  })
})
