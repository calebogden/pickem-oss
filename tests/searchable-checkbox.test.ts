import { describe, it, expect } from 'vitest'
import { renderTest } from '../src/core/testing.js'
import type { PickItem } from '../src/types.js'
import { searchableCheckbox } from '../src/prompts/searchable-checkbox.js'
import { createSearchFn } from '../src/search/search.js'
import { createFormatter } from '../src/display/format.js'

const items: PickItem[] = [
  { label: 'Apple', value: 'apple' },
  { label: 'Banana', value: 'banana' },
  { label: 'Blueberry', value: 'blueberry' },
  { label: 'Cherry', value: 'cherry' },
]

const baseConfig = {
  message: 'Pick fruits:',
  items,
  pageSize: 10,
  required: false,
  defaultChecked: [] as string[],
  allowFreeText: false,
  searchFn: createSearchFn(),
  formatFn: createFormatter({ badgeStyle: 'none' as const }),
  usageStats: null,
}

describe('searchableCheckbox', () => {
  it('renders the message and all items initially', async () => {
    const { getScreen, events } = await renderTest(searchableCheckbox as any, baseConfig)
    expect(getScreen()).toContain('Pick fruits:')
    expect(getScreen()).toContain('Apple')
    expect(getScreen()).toContain('Banana')
    expect(getScreen()).toContain('Blueberry')
    expect(getScreen()).toContain('Cherry')
    events.keypress('escape')
  })

  it('uses filled-circle glyphs (no ascii checkbox fallback)', async () => {
    const { getScreen, events } = await renderTest(searchableCheckbox as any, baseConfig)
    const initial = getScreen()
    expect(initial).toContain('○')   // unchecked
    expect(initial).not.toContain('[ ]')
    expect(initial).not.toContain('[x]')

    events.keypress('space')          // toggle Apple
    await new Promise((r) => setTimeout(r, 10))
    expect(getScreen()).toContain('●')  // checked glyph appears
    events.keypress('escape')
  })

  it('filters as user types', async () => {
    const { getScreen, events } = await renderTest(searchableCheckbox as any, baseConfig)
    events.type('bl')
    await new Promise((r) => setTimeout(r, 10))
    const screen = getScreen()
    expect(screen).toContain('Blueberry')
    expect(screen).not.toContain('Apple')
    expect(screen).not.toContain('Cherry')
  })

  it('backspace removes filter chars', async () => {
    const { getScreen, events } = await renderTest(searchableCheckbox as any, baseConfig)
    events.type('bl')
    events.keypress('backspace')
    await new Promise((r) => setTimeout(r, 10))
    const screen = getScreen()
    expect(screen).toContain('Banana')
    expect(screen).toContain('Blueberry')
    expect(screen).not.toContain('Apple')
  })

  it('escape clears filter', async () => {
    const { getScreen, events } = await renderTest(searchableCheckbox as any, baseConfig)
    events.type('cherry')
    events.keypress('escape')
    await new Promise((r) => setTimeout(r, 10))
    const screen = getScreen()
    expect(screen).toContain('Apple')
    expect(screen).toContain('Cherry')
  })

  it('space toggles current item; enter submits', async () => {
    const { events, answer } = await renderTest(searchableCheckbox as any, baseConfig)
    events.keypress('space')
    events.keypress('down')
    events.keypress('space')
    events.keypress('enter')
    expect(await answer).toEqual(['apple', 'banana'])
  })

  it('returns [] when nothing selected and not required', async () => {
    const { events, answer } = await renderTest(searchableCheckbox as any, baseConfig)
    events.keypress('enter')
    expect(await answer).toEqual([])
  })

  it('blocks submit when required and nothing selected', async () => {
    const { events, getScreen, answer } = await renderTest(searchableCheckbox as any, {
      ...baseConfig,
      required: true,
    })
    events.keypress('enter')
    await new Promise((r) => setTimeout(r, 10))
    expect(getScreen()).toMatch(/at least one/i)
    events.keypress('space')
    events.keypress('enter')
    expect(await answer).toEqual(['apple'])
  })

  it('honors defaultChecked', async () => {
    const { events, answer } = await renderTest(searchableCheckbox as any, {
      ...baseConfig,
      defaultChecked: ['banana', 'cherry'],
    })
    events.keypress('enter')
    expect(await answer).toEqual(['banana', 'cherry'])
  })

  it('checked items remain in result even if filter hides them', async () => {
    const { events, answer } = await renderTest(searchableCheckbox as any, baseConfig)
    events.keypress('space')             // toggle Apple
    events.type('bl')                    // hide Apple, show Blueberry
    events.keypress('space')             // toggle Blueberry
    events.keypress('enter')
    expect(await answer).toEqual(['apple', 'blueberry'])
  })

  it('keeps pin: first items at top of filtered set', async () => {
    const pinnedItems: PickItem[] = [
      { label: 'Apple', value: 'apple' },
      { label: 'Banana', value: 'banana' },
      { label: 'All Fruits', value: '__all', pin: 'first' },
    ]
    const { getScreen, events } = await renderTest(searchableCheckbox as any, {
      ...baseConfig,
      items: pinnedItems,
    })
    const screen = getScreen()
    const idxAll = screen.indexOf('All Fruits')
    const idxApple = screen.indexOf('Apple')
    expect(idxAll).toBeGreaterThan(-1)
    expect(idxAll).toBeLessThan(idxApple)
    events.keypress('escape')
  })

  it('returns selected values in source order regardless of toggle order', async () => {
    const { events, answer } = await renderTest(searchableCheckbox as any, baseConfig)
    // items order: Apple, Banana, Blueberry, Cherry
    // Toggle: Cherry first, then Apple
    events.keypress('down')                  // cursor → Banana
    events.keypress('down')                  // cursor → Blueberry
    events.keypress('down')                  // cursor → Cherry
    events.keypress('space')                 // toggle Cherry
    events.keypress('up')
    events.keypress('up')
    events.keypress('up')                    // back to Apple
    events.keypress('space')                 // toggle Apple
    events.keypress('enter')
    expect(await answer).toEqual(['apple', 'cherry'])  // source order, not toggle order
  })

  it('pin: first item is hidden when it does not match the filter', async () => {
    const pinnedItems: PickItem[] = [
      { label: 'Apple', value: 'apple' },
      { label: 'All Fruits', value: '__all', pin: 'first' },
    ]
    const { getScreen, events } = await renderTest(searchableCheckbox as any, {
      ...baseConfig,
      items: pinnedItems,
    })
    events.type('apple')
    await new Promise((r) => setTimeout(r, 10))
    expect(getScreen()).toContain('Apple')
    expect(getScreen()).not.toContain('All Fruits')
  })

  it('allowFreeText: Enter on no-match adds typed text as checked, clears filter, stays open', async () => {
    const { events, getScreen, answer } = await renderTest(searchableCheckbox as any, {
      ...baseConfig,
      allowFreeText: true,
    })
    events.type('grape')
    await new Promise((r) => setTimeout(r, 10))
    expect(getScreen()).toContain('(no matches)')

    events.keypress('enter')
    await new Promise((r) => setTimeout(r, 10))

    // Filter cleared, list shows originals + new "grape" item, "grape" is checked
    const screen = getScreen()
    expect(screen).toContain('Apple')
    expect(screen).toContain('grape')
    expect(screen).toContain('1 selected')

    // Now hit enter again to submit
    events.keypress('enter')
    expect(await answer).toEqual(['grape'])
  })

  it('allowFreeText: can mix free-text with existing items', async () => {
    const { events, answer } = await renderTest(searchableCheckbox as any, {
      ...baseConfig,
      allowFreeText: true,
    })
    events.keypress('space')           // toggle Apple
    events.type('FOO')
    events.keypress('enter')           // adds FOO and checks it
    await new Promise((r) => setTimeout(r, 10))
    events.keypress('enter')           // submit
    expect(await answer).toEqual(['apple', 'FOO']) // source order: original items first, then extras
  })

  it('allowFreeText: false, Enter with no matches does not add free-text (submits empty)', async () => {
    // With allowFreeText: false and not required, Enter on a no-match filter
    // submits normally with whatever is currently checked (here: nothing).
    // The typed text is NOT promoted into a checked item.
    const { events, answer } = await renderTest(searchableCheckbox as any, baseConfig)
    events.type('grape')
    await new Promise((r) => setTimeout(r, 10))
    events.keypress('enter')
    expect(await answer).toEqual([])
  })
})
