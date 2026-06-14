import { describe, it, expect } from 'vitest'
import { createPicker } from '../../src/core/runtime.js'
import { useState, useKeypress } from '../../src/core/hooks.js'
import { isEnter, isPrintable } from '../../src/core/keys.js'
import { renderTest } from '../../src/core/testing.js'

// A trivial picker: echoes typed text, submits on Enter.
const echoPicker = createPicker<{ message: string }, string>((config, done) => {
  const [text, setText] = useState('')
  useKeypress((key, input) => {
    if (isEnter(key)) return done(text)
    if (isPrintable(key)) setText(text + key.sequence)
    void input
  })
  return `${config.message} ${text}`
})

// A multi-line picker where typing changes ONE line; the others are unchanged.
// This proves the virtual-screen harness reconstructs true state from a line-diff
// render stream (the unchanged lines must still be visible in getScreen()).
const multiLinePicker = createPicker<{ message: string }, string>((config, done) => {
  const [text, setText] = useState('')
  useKeypress((key, input) => {
    if (isEnter(key)) return done(text)
    if (isPrintable(key)) setText(text + key.sequence)
    void input
  })
  return [`${config.message}`, `static header line`, `typed: ${text}`, `static footer line`].join('\n')
})

describe('renderTest', () => {
  it('captures the screen and resolves the answer', async () => {
    const { answer, events, getScreen } = await renderTest(echoPicker, { message: 'Say:' })
    expect(getScreen()).toContain('Say:')
    events.type('hi')
    expect(getScreen()).toContain('Say: hi')
    events.keypress('enter')
    expect(await answer).toBe('hi')
  })

  it('reconstructs full screen state from a line-diff stream', async () => {
    const { events, getScreen } = await renderTest(multiLinePicker, { message: 'Title' })
    events.type('x')
    const screen = getScreen()
    // The changed line is updated AND the unchanged lines are still present.
    expect(screen).toContain('typed: x')
    expect(screen).toContain('static header line')
    expect(screen).toContain('static footer line')
    expect(screen).toContain('Title')
    events.type('y')
    const screen2 = getScreen()
    expect(screen2).toContain('typed: xy')
    expect(screen2).not.toContain('typed: x\n') // old single-x line fully replaced
  })
})
