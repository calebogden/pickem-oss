// tests/core/ansi.test.ts
import { describe, it, expect } from 'vitest'
import { ansi } from '../../src/core/ansi.js'

describe('ansi', () => {
  it('moves the cursor up by n lines', () => {
    expect(ansi.cursorUp(3)).toBe('\x1b[3A')
  })
  it('hides and shows the cursor', () => {
    expect(ansi.hideCursor).toBe('\x1b[?25l')
    expect(ansi.showCursor).toBe('\x1b[?25h')
  })
  it('erases a whole line', () => {
    expect(ansi.eraseLine).toBe('\x1b[2K')
  })
  it('wraps a frame in synchronized output', () => {
    expect(ansi.beginSync).toBe('\x1b[?2026h')
    expect(ansi.endSync).toBe('\x1b[?2026l')
  })
  it('builds an OSC-8 hyperlink', () => {
    expect(ansi.link('https://x.test', 'go')).toBe('\x1b]8;;https://x.test\x07go\x1b]8;;\x07')
  })
})
