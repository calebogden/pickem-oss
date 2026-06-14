// tests/core/colors.test.ts
import { describe, it, expect } from 'vitest'
import { makeColors } from '../../src/core/colors.js'

describe('colors', () => {
  it('disables color when level is 0', () => {
    const c = makeColors({ level: 0 })
    expect(c.cyan('hi')).toBe('hi')
    expect(c.bold('hi')).toBe('hi')
  })
  it('emits SGR codes at level >= 1', () => {
    const c = makeColors({ level: 1 })
    expect(c.bold('hi')).toBe('\x1b[1mhi\x1b[0m')
    expect(c.dim('hi')).toBe('\x1b[2mhi\x1b[0m')
  })
  it('uses truecolor at level 3 and 256 fallback at level 2', () => {
    expect(makeColors({ level: 3 }).rgb(0, 230, 118)('x')).toBe('\x1b[38;2;0;230;118mx\x1b[0m')
    expect(makeColors({ level: 2 }).rgb(0, 230, 118)('x')).toMatch(/^\x1b\[38;5;\d+mx\x1b\[0m$/)
  })
  it('exposes an accent color (lavender) with truecolor + plain fallback', () => {
    expect(makeColors({ level: 3 }).accent('x')).toBe('\x1b[38;2;180;160;250mx\x1b[0m')
    expect(makeColors({ level: 0 }).accent('x')).toBe('x')
  })
  it('detects level 0 when NO_COLOR is set', () => {
    expect(makeColors({ env: { NO_COLOR: '1' }, isTTY: true }).level).toBe(0)
  })
  it('detects truecolor from COLORTERM', () => {
    expect(makeColors({ env: { COLORTERM: 'truecolor' }, isTTY: true }).level).toBe(3)
  })
})
