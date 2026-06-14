import type { PickItem } from '../types.js'

/**
 * Get a nested value from an object using dot-notation path.
 * e.g. getByPath({ a: { b: 'hello' } }, 'a.b') → 'hello'
 */
function getByPath(obj: any, path: string): unknown {
  let current = obj
  for (const part of path.split('.')) {
    if (current == null || typeof current !== 'object') return undefined
    current = current[part]
  }
  return current
}

/**
 * Extract searchable text from an item based on field paths.
 * Fields can reference top-level item properties or nested meta properties via dot-notation.
 */
function extractSearchText<V>(item: PickItem<V>, fields: string[]): string {
  if (item.searchText) return item.searchText

  const parts: string[] = []
  for (const field of fields) {
    let val: unknown
    if (field.includes('.')) {
      // dot-notation — look in meta first, then top-level
      val = getByPath(item.meta, field) ?? getByPath(item, field)
    } else {
      val = (item as any)[field] ?? getByPath(item.meta, field)
    }
    if (typeof val === 'string') {
      parts.push(val)
    }
  }
  return parts.join(' ')
}

/**
 * Case-insensitive substring search across configured fields.
 * Each term (space-separated) must match somewhere in the search text.
 */
export function createSearchFn<V>(
  fields: string[] = ['label', 'description'],
): (item: PickItem<V>, term: string) => boolean {
  return (item, term) => {
    const text = extractSearchText(item, fields).toLowerCase()
    const terms = term.toLowerCase().split(/\s+/).filter(Boolean)
    return terms.every((t) => text.includes(t))
  }
}
