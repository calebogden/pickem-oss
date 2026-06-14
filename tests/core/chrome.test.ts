import { describe, it, expect } from 'vitest'
import { makeChrome } from '../../src/core/chrome.js'
import { makeColors } from '../../src/core/colors.js'
import { makeSymbols } from '../../src/core/symbols.js'
import { stripAnsi } from '../../src/core/width.js'

const chrome = makeChrome({ colors: makeColors({ level: 0 }), symbols: makeSymbols(true) })

describe('chrome', () => {
  it('builds a title + dim hint line', () => {
    expect(chrome.header('Pick one', ['type to filter', 'esc to clear'])).toBe(
      'Pick one\ntype to filter · esc to clear',
    )
  })
  it('reserves the same chevron cell on every row so content never shifts', () => {
    // Same visible width whether active or not — the chevron column is always present.
    const inactive = chrome.row({ label: 'beta', active: false })
    const active = chrome.row({ label: 'beta', active: true })
    expect(stripAnsi(inactive)).toBe(stripAnsi(active))
    expect(stripAnsi(inactive)).toBe('❯ beta')
    expect(chrome.row({ label: 'alpha', meta: ['plugin', '~60 tok'], active: false })).toBe(
      '❯ alpha · plugin · ~60 tok',
    )
  })
  it('conceals the chevron on inactive rows and lights it on the active row', () => {
    const colored = makeChrome({ colors: makeColors({ level: 3 }), symbols: makeSymbols(true) })
    const inactive = colored.row({ label: 'alpha', active: false })
    const active = colored.row({ label: 'alpha', active: true })
    expect(inactive).toContain('\x1b[8m❯\x1b[0m') // concealed (invisible but width-preserving)
    expect(active).not.toContain('\x1b[8m') // active chevron is lit, not concealed
    expect(stripAnsi(inactive)).toBe(stripAnsi(active)) // identical visible width — no shift
  })
  it('overrides a caller-colored label so the highlight shows on colored rows', () => {
    const colored = makeChrome({ colors: makeColors({ level: 3 }), symbols: makeSymbols(true) })
    const ownColor = '\x1b[38;2;255;120;0mShort\x1b[0m' // caller-supplied orange
    const r = colored.row({ label: ownColor, active: true })
    expect(stripAnsi(r)).toBe('❯ Short') // visible text preserved, no shift
    expect(r).not.toContain('255;120;0') // caller color stripped, replaced by accent
  })
  it('highlights the matched term on inactive rows once colored', () => {
    const colored = makeChrome({ colors: makeColors({ level: 1 }), symbols: makeSymbols(true) })
    const r = colored.row({ label: 'banana', term: 'nan', active: false })
    expect(r).toContain('nan')
    expect(r.includes('\x1b[')).toBe(true) // the matched slice is wrapped in accent styling
  })
  it('renders a rounded search box containing the value', () => {
    const box = chrome.searchBox({ value: 'ap', placeholder: 'Search…', width: 20 })
    expect(box.split('\n')).toHaveLength(3)
    expect(box).toContain('⌕')
    expect(box).toContain('ap')
    expect(box).toContain('╭')
    expect(box).toContain('╰')
  })
  it('renders a more-below footer', () => {
    expect(chrome.footer({ moreBelow: 41 })).toBe('↓ 41 more below')
  })
})
