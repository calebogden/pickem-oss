import type { PickItem, Source } from '../types.js'

export function defineSource<V = string>(
  name: string,
  load: () => Promise<PickItem<V>[]>,
): Source<V> {
  return { name, load }
}

/**
 * Load items from multiple sources in parallel.
 * Each item gets its group set to the source name (unless already set).
 */
export async function loadSources<V>(sources: Source<V>[]): Promise<PickItem<V>[]> {
  const results = await Promise.all(
    sources.map(async (source) => {
      const items = await source.load()
      return items.map((item) => ({
        ...item,
        group: item.group ?? source.name,
      }))
    }),
  )
  return results.flat()
}
