// tests/core/keys.test.ts
import { describe, it, expect } from 'vitest'
import { isEnter, isUp, isDown, isSpace, isBackspace, isEscape, isCtrlC, isPrintable } from '../../src/core/keys.js'

const k = (over: Partial<{ name: string; sequence: string; ctrl: boolean }>) =>
  ({ name: '', sequence: '', ctrl: false, meta: false, shift: false, ...over })

describe('key predicates', () => {
  it('detects enter / return', () => {
    expect(isEnter(k({ name: 'return' }))).toBe(true)
    expect(isEnter(k({ name: 'enter' }))).toBe(true)
  })
  it('detects up incl. vim k and emacs ctrl-p', () => {
    expect(isUp(k({ name: 'up' }))).toBe(true)
    expect(isUp(k({ name: 'k' }))).toBe(true)
    expect(isUp(k({ name: 'p', ctrl: true }))).toBe(true)
  })
  it('detects down incl. vim j and emacs ctrl-n', () => {
    expect(isDown(k({ name: 'down' }))).toBe(true)
    expect(isDown(k({ name: 'j' }))).toBe(true)
    expect(isDown(k({ name: 'n', ctrl: true }))).toBe(true)
  })
  it('detects space, backspace, escape, ctrl-c', () => {
    expect(isSpace(k({ name: 'space' }))).toBe(true)
    expect(isBackspace(k({ name: 'backspace' }))).toBe(true)
    expect(isEscape(k({ name: 'escape' }))).toBe(true)
    expect(isCtrlC(k({ name: 'c', ctrl: true }))).toBe(true)
  })
  it('detects printable characters', () => {
    expect(isPrintable(k({ name: 'a', sequence: 'a' }))).toBe(true)
    expect(isPrintable(k({ name: 'up', sequence: '\x1b[A' }))).toBe(false)
    expect(isPrintable(k({ name: 'c', ctrl: true, sequence: '\x03' }))).toBe(false)
  })
})
