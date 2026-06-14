import { describe, it, expect } from 'vitest'
import { makeTheme } from '../../src/core/theme.js'

describe('makeTheme', () => {
  it('bundles colors, symbols, and chrome', () => {
    const t = makeTheme({ colorLevel: 0, unicode: true })
    expect(t.colors.level).toBe(0)
    expect(t.symbols.pointer).toBe('❯')
    expect(typeof t.chrome.header).toBe('function')
    expect(typeof t.chrome.row).toBe('function')
    expect(typeof t.chrome.searchBox).toBe('function')
  })
})
