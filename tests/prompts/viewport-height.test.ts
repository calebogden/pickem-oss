// tests/prompts/viewport-height.test.ts
// Regression: a picker must NEVER render a frame taller than the terminal viewport.
// When it does, the line-diff renderer's relative cursorUp saturates at the top of a
// scrolled viewport and every subsequent repaint lands at a misaligned origin —
// producing duplicate rows, duplicate chevrons, and ghost lines below the footer
// (observed in a small split pane). See src/core/screen.ts.
import { describe, it, expect } from 'vitest'
import { selectPicker } from '../../src/prompts/select.js'
import { searchPicker } from '../../src/prompts/search.js'
import { searchableCheckbox } from '../../src/prompts/searchable-checkbox.js'
import { renderTest } from '../../src/core/testing.js'

const many = Array.from({ length: 40 }, (_, i) => ({
  name: `item-${String(i).padStart(2, '0')}`,
  value: i,
}))

function height(screen: string): number {
  return screen.split('\n').length
}

describe('viewport height clamping', () => {
  it('selectPicker never exceeds a short terminal height', async () => {
    const rows = 14
    const { getScreen, events } = await renderTest(
      selectPicker as any,
      { message: 'Pick a project', choices: many },
      { rows },
    )
    expect(height(getScreen())).toBeLessThanOrEqual(rows)
    // Navigate — height must stay bounded across re-renders.
    for (let i = 0; i < 6; i++) events.keypress('down')
    expect(height(getScreen())).toBeLessThanOrEqual(rows)
  })

  it('searchPicker (searchable single-select) never exceeds a short terminal height', async () => {
    const rows = 16
    const { getScreen, events } = await renderTest(
      searchPicker as any,
      { message: 'Pick', source: async () => many },
      { rows },
    )
    await Promise.resolve()
    expect(height(getScreen())).toBeLessThanOrEqual(rows)
    events.type('item')
    await Promise.resolve()
    expect(height(getScreen())).toBeLessThanOrEqual(rows)
  })

  it('searchableCheckbox never exceeds a short terminal height', async () => {
    const rows = 16
    const items = many.map((c) => ({ label: c.name, value: c.value }))
    const { getScreen } = await renderTest(
      searchableCheckbox as any,
      {
        message: 'Pick many',
        items,
        pageSize: 15,
        required: false,
        defaultChecked: [],
        allowFreeText: false,
        searchFn: (it: any, term: string) => it.label.includes(term),
        formatFn: (it: any) => it.label,
        usageStats: null,
      },
      { rows },
    )
    await Promise.resolve()
    expect(height(getScreen())).toBeLessThanOrEqual(rows)
  })
})
