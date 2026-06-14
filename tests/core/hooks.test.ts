import { describe, it, expect, vi } from 'vitest'
import { createHookStore, withHookStore, useState, useMemo, useRef } from '../../src/core/hooks.js'

function render(store: ReturnType<typeof createHookStore>, view: () => unknown) {
  store.reset()
  return withHookStore(store, view)
}

describe('hooks', () => {
  it('useState persists across renders and re-renders on set', () => {
    const schedule = vi.fn()
    const store = createHookStore(schedule)
    let setter!: (n: number) => void
    const view = () => {
      const [n, setN] = useState(0)
      setter = setN
      return n
    }
    expect(render(store, view)).toBe(0)
    setter(5)
    expect(schedule).toHaveBeenCalledOnce()
    expect(render(store, view)).toBe(5)
  })

  it('useMemo recomputes only when deps change', () => {
    const store = createHookStore(() => {})
    const fn = vi.fn(() => 42)
    let deps = [1]
    const view = () => useMemo(fn, deps)
    render(store, view)
    render(store, view)
    expect(fn).toHaveBeenCalledOnce()
    deps = [2]
    render(store, view)
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('useRef keeps a stable container', () => {
    const store = createHookStore(() => {})
    const view = () => useRef({ x: 1 })
    const a = render(store, view)
    const b = render(store, view)
    expect(a).toBe(b)
  })
})
