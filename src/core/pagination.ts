import { useRef } from './hooks.js'

export interface RenderItemArgs<T> {
  item: T
  index: number
  isActive: boolean
}

export interface PaginationArgs<T> {
  items: readonly T[]
  active: number
  pageSize: number
  loop?: boolean
  renderItem: (args: RenderItemArgs<T>) => string
}

export interface PaginationResult {
  lines: string
  windowTop: number
}

/**
 * Clamp a requested page size so the whole frame fits the terminal viewport.
 * `chromeRows` is the number of non-list lines the prompt draws (header, search box,
 * blank separators, footer). A frame taller than the viewport scrolls the terminal and
 * desyncs the line-diff renderer, so we keep `chromeRows + page ≤ rows` (with a 1-row
 * safety margin). `rows = Infinity` (non-TTY: tests, pipes) leaves the request untouched.
 */
export function fitPageSize(requested: number, rows: number, chromeRows: number, min = 1): number {
  if (!Number.isFinite(rows)) return requested
  return Math.max(min, Math.min(requested, rows - chromeRows - 1))
}

export function usePagination<T>({
  items,
  active,
  pageSize,
  loop = true,
  renderItem,
}: PaginationArgs<T>): PaginationResult {
  const pointer = useRef(0) // active row position within the visible window
  const size = Math.min(pageSize, items.length)
  if (items.length === 0) return { lines: '', windowTop: 0 }

  // Keep the window stable: only scroll when the active item would leave the visible region.
  // Both loop and non-loop modes use the same edge-clamping logic so the window doesn't
  // shift on every keypress — the cursor moves to the edge first, then the list scrolls.
  if (size < items.length) {
    const half = Math.floor(size / 2)
    if (active < half) pointer.current = active
    else if (active >= items.length - half) pointer.current = size - (items.length - active)
    else pointer.current = half
  } else {
    pointer.current = active
  }

  const top = loop
    ? (active - pointer.current + items.length) % items.length
    : Math.max(0, Math.min(active - pointer.current, items.length - size))

  const lines: string[] = []
  for (let i = 0; i < size; i++) {
    const index = loop ? (top + i) % items.length : top + i
    lines.push(renderItem({ item: items[index], index, isActive: index === active }))
  }
  return { lines: lines.join('\n'), windowTop: top }
}
