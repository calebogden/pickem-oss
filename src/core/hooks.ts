import { AsyncLocalStorage } from 'node:async_hooks'
import type { KeyEvent } from './keys.js'
import type { PickerInput } from './runtime.js'

interface Slot {
  value?: unknown
  deps?: unknown[]
  cleanup?: () => void
}

export interface HookStore {
  slots: Slot[]
  cursor: number
  scheduleRender: () => void
  /** Current terminal height in rows (Infinity when the output is not a sized TTY). */
  getRows: () => number
  keypressHandlers: ((key: KeyEvent, input: PickerInput) => void)[]
  effects: (() => void)[]
  reset(): void
}

const als = new AsyncLocalStorage<HookStore>()

export function createHookStore(
  scheduleRender: () => void,
  getRows: () => number = () => Infinity,
): HookStore {
  const store: HookStore = {
    slots: [],
    cursor: 0,
    scheduleRender,
    getRows,
    keypressHandlers: [],
    effects: [],
    reset() {
      this.cursor = 0
      this.keypressHandlers = []
      this.effects = []
    },
  }
  return store
}

export function withHookStore<T>(store: HookStore, fn: () => T): T {
  return als.run(store, fn)
}

function current(): HookStore {
  const s = als.getStore()
  if (!s) throw new Error('hook called outside of a picker render')
  return s
}

function nextSlot(): Slot {
  const s = current()
  const slot = (s.slots[s.cursor] ??= {})
  s.cursor += 1
  return slot
}

export function useState<T>(initial: T): [T, (next: T) => void] {
  const store = current()
  const slot = nextSlot()
  if (!('value' in slot)) slot.value = initial
  const set = (next: T) => {
    if (slot.value === next) return
    slot.value = next
    store.scheduleRender()
  }
  return [slot.value as T, set]
}

export function useRef<T>(initial: T): { current: T } {
  const slot = nextSlot()
  if (!('value' in slot)) slot.value = { current: initial }
  return slot.value as { current: T }
}

function depsChanged(a: unknown[] | undefined, b: unknown[]): boolean {
  if (!a || a.length !== b.length) return true
  return a.some((v, i) => !Object.is(v, b[i]))
}

export function useMemo<T>(factory: () => T, deps: unknown[]): T {
  const slot = nextSlot()
  if (depsChanged(slot.deps, deps)) {
    slot.value = factory()
    slot.deps = deps
  }
  return slot.value as T
}

export function useEffect(effect: () => void | (() => void), deps: unknown[]): void {
  const store = current()
  const slot = nextSlot()
  if (depsChanged(slot.deps, deps)) {
    slot.deps = deps
    store.effects.push(() => {
      slot.cleanup?.()
      const cleanup = effect()
      slot.cleanup = typeof cleanup === 'function' ? cleanup : undefined
    })
  }
}

export function useKeypress(handler: (key: KeyEvent, input: PickerInput) => void): void {
  current().keypressHandlers.push(handler)
}

/**
 * Current terminal height in rows, or `Infinity` when the output is not a sized TTY
 * (tests, pipes). Read each render so resize is picked up. Prompts use this to clamp
 * page size so a frame never grows taller than the viewport — a frame that overflows
 * scrolls the terminal and desyncs the line-diff renderer (see src/core/screen.ts).
 */
export function useTerminalRows(): number {
  return current().getRows()
}
