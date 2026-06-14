import { describe, it, expect } from 'vitest'
import { createHookStore, withHookStore } from '../../src/core/hooks.js'
import { usePagination } from '../../src/core/pagination.js'

function paginate(args: Parameters<typeof usePagination>[0]) {
  const store = createHookStore(() => {})
  store.reset()
  return withHookStore(store, () => usePagination(args))
}

const items = Array.from({ length: 10 }, (_, i) => `item${i}`)
const renderItem = ({ item, isActive }: { item: string; isActive: boolean }) =>
  `${isActive ? '>' : ' '}${item}`

describe('usePagination', () => {
  it('renders a window of pageSize rows', () => {
    const { lines } = paginate({ items, active: 0, renderItem, pageSize: 4, loop: true })
    expect(lines.split('\n')).toHaveLength(4)
    expect(lines).toContain('>item0')
  })
  it('keeps the active item visible when scrolled down', () => {
    const { lines } = paginate({ items, active: 8, renderItem, pageSize: 4, loop: false })
    expect(lines).toContain('>item8')
    expect(lines.split('\n')).toHaveLength(4)
  })
  it('moreBelow is zero when the active item is at the bottom', () => {
    const { windowTop } = paginate({ items, active: 9, renderItem, pageSize: 4, loop: false })
    expect(Math.max(0, items.length - (windowTop + 4))).toBe(0)
  })
})
