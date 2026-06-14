import { describe, it, expect } from 'vitest'
import { Screen } from '../../src/core/screen.js'
import { ansi } from '../../src/core/ansi.js'

function fakeStream() {
  const chunks: string[] = []
  return {
    columns: 80,
    isTTY: true,
    write: (s: string) => {
      chunks.push(s)
      return true
    },
    on() {},
    off() {},
    output: () => chunks.join(''),
    last: () => chunks[chunks.length - 1] ?? '',
  } as unknown as NodeJS.WriteStream & { output(): string; last(): string }
}

describe('Screen', () => {
  it('wraps a frame in synchronized output markers', () => {
    const out = fakeStream() as any
    const screen = new Screen(out)
    screen.start()
    screen.render('hello', '')
    expect(out.output()).toContain(ansi.beginSync)
    expect(out.output()).toContain(ansi.endSync)
    expect(out.output()).toContain('hello')
  })

  it('only repaints the lines that changed (line diff, no full-frame flash)', () => {
    const out = fakeStream() as any
    const screen = new Screen(out)
    screen.start()
    screen.render('alpha\nbeta', '') // first paint
    screen.render('alpha\ngamma', '') // only line 2 changes
    const second = out.last()
    expect(second).toContain('gamma') // changed line repainted
    expect(second).not.toContain('alpha') // unchanged line NOT re-emitted → no flash
    expect(second).not.toContain(ansi.eraseLine) // overwrite-in-place: no blank-then-fill flash
    expect(second).not.toContain(ansi.eraseDown)
  })

  it('moves the cursor up to the top of the previous block before diffing', () => {
    const out = fakeStream() as any
    const screen = new Screen(out)
    screen.start()
    screen.render('one\ntwo\nthree', '')
    screen.render('one\ntwo\nfour', '')
    expect(out.last()).toContain(ansi.cursorUp(2)) // 3-line block → up 2
  })
})
