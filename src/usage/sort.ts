import type { PickItem, UsageData } from '../types.js'

/**
 * 4-tier sort: pin → count desc → lastUsed desc → tiebreaker → label alpha.
 * Pinned items always sort first/last regardless of usage.
 * Items with no usage data sort after items with usage.
 */
export function sortByUsage<V>(
  items: PickItem<V>[],
  usage: UsageData,
  keyFn: (item: PickItem<V>) => string = (item) => item.label,
  tiebreaker?: (a: PickItem<V>, b: PickItem<V>) => number,
): PickItem<V>[] {
  return [...items].sort((a, b) => {
    // Pin takes absolute priority
    const aPin = a.pin
    const bPin = b.pin
    if (aPin !== bPin) {
      if (aPin === 'first') return -1
      if (bPin === 'first') return 1
      if (aPin === 'last') return 1
      if (bPin === 'last') return -1
    }
    // Both pinned the same direction (or neither pinned) — continue to usage sort

    const aKey = keyFn(a)
    const bKey = keyFn(b)
    const aUsage = usage[aKey]
    const bUsage = usage[bKey]
    const aCount = aUsage?.count ?? 0
    const bCount = bUsage?.count ?? 0

    // Count descending
    if (aCount !== bCount) return bCount - aCount

    // Last used descending
    const aLast = aUsage?.lastUsed ?? 0
    const bLast = bUsage?.lastUsed ?? 0
    if (aLast !== bLast) return bLast - aLast

    // Custom tiebreaker
    if (tiebreaker) {
      const tie = tiebreaker(a, b)
      if (tie !== 0) return tie
    }

    // Alpha ascending
    return a.label.localeCompare(b.label)
  })
}
