import { describe, it, expect, vi } from 'vitest'
import { createHookStore, withHookStore } from '../../src/core/hooks.js'
import { useStatusGlyph } from '../../src/core/status-glyph.js'
import { makeColors } from '../../src/core/colors.js'
import { makeSymbols } from '../../src/core/symbols.js'

function makeStore(onRender = () => {}) {
  const store = createHookStore(onRender)
  store.reset()
  return store
}

function render(store: ReturnType<typeof makeStore>, status: 'idle' | 'loading' | 'done' | 'canceled') {
  store.reset()
  const colors = makeColors({ level: 0 })
  const symbols = makeSymbols(true)
  const result = withHookStore(store, () => useStatusGlyph({ status, colors, symbols }))
  // flush effects
  for (const e of store.effects) e()
  return result
}

describe('useStatusGlyph', () => {
  it('shows the active step glyph when idle', () => {
    expect(render(makeStore(), 'idle')).toBe('◆')
  })
  it('shows the done glyph when done', () => {
    expect(render(makeStore(), 'done')).toBe('◇')
  })
  it('advances through spinner frames on each tick — no stale closure freeze', () => {
    vi.useFakeTimers()
    const renders: string[] = []
    const store = makeStore(() => {
      // Simulate a re-render by calling render again
      renders.push(render(store, 'loading'))
    })
    const first = render(store, 'loading')
    renders.push(first)

    vi.advanceTimersByTime(80)   // tick 1 → frame 1
    vi.advanceTimersByTime(80)   // tick 2 → frame 2
    vi.advanceTimersByTime(80)   // tick 3 → frame 3

    // Must have at least 3 distinct frames — proves the spinner isn't frozen
    const unique = new Set(renders)
    expect(unique.size).toBeGreaterThanOrEqual(3)

    vi.useRealTimers()
  })
})
