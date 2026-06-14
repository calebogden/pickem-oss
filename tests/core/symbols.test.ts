// tests/core/symbols.test.ts
import { describe, it, expect } from 'vitest'
import { makeSymbols } from '../../src/core/symbols.js'

describe('symbols', () => {
  it('uses Unicode glyphs when supported', () => {
    const s = makeSymbols(true)
    expect(s.railBar).toBe('│')
    expect(s.railEnd).toBe('└')
    expect(s.radioOn).toBe('●')
    expect(s.radioOff).toBe('○')
    expect(s.pointer).toBe('❯')
    expect(s.stepActive).toBe('◆')
    expect(s.stepDone).toBe('◇')
    expect(s.search).toBe('⌕')
    expect(s.moreBelow).toBe('↓')
    expect(s.boxV).toBe('│')
    expect(s.pointer).toBe('❯')
    expect(s.pointerLeft).toBe('❮')
  })
  it('falls back to ASCII when Unicode is unsupported', () => {
    const s = makeSymbols(false)
    expect(s.railBar).toBe('|')
    expect(s.radioOn).toBe('>')
    expect(s.pointer).toBe('>')
  })
})
