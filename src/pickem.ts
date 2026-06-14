import { searchPicker } from './prompts/search.js'
import { selectPicker } from './prompts/select.js'
import type { PickItem, PickOptions, Source, UsageStats } from './types.js'
import { checkbox } from './checkbox.js'
import { UsageTracker } from './usage/tracker.js'
import { createSearchFn } from './search/search.js'
import { createFormatter } from './display/format.js'
import { loadSources } from './source/source.js'
import { resolveTrackOptions } from './internal/track.js'

async function pick<V = string>(
  items: PickItem<V>[],
  options: PickOptions<V> = {},
): Promise<V> {
  const trackOpts = resolveTrackOptions(options.track)
  const tracker = trackOpts ? new UsageTracker(trackOpts) : null
  const keyFn = trackOpts?.key ?? ((item: PickItem<V>) => item.label)

  let sorted: PickItem<V>[]
  if (tracker) {
    sorted = await tracker.sortItems(items, keyFn, options.sort)
  } else if (options.sort) {
    sorted = [...items].sort(options.sort)
  } else {
    sorted = items
  }

  const searchFn = options.search ?? createSearchFn<V>(options.searchFields)

  const formatFn =
    options.format ??
    createFormatter<V>({
      badgeStyle: options.badgeStyle,
      badgeColors: options.badgeColors,
    })

  // Pre-build stats Map once — avoids per-item, per-keystroke tracker lookups in searchPicker.
  type Stats = UsageStats | null
  const statsMap = new Map<PickItem<V>, Stats>()
  if (tracker) {
    await Promise.all(sorted.map(async (item) => {
      statsMap.set(item, await tracker!.getStats(keyFn(item)))
    }))
  }
  const statsFor = (item: PickItem<V>): Stats => statsMap.get(item) ?? null

  // O(1) lookup for post-submit callbacks — avoids two linear scans.
  const valueToItem = new Map<V, PickItem<V>>(sorted.map((item) => [item.value, item]))

  let result: V

  if (options.searchable === false) {
    const choices = sorted.map((item) => ({
      name: formatFn(item, statsFor(item)),
      value: item.value,
      description: item.description,
    }))
    result = (await selectPicker({
      message: options.message ?? 'Pick one:',
      pageSize: options.pageSize ?? 15,
      choices,
    })) as V
  } else {
    result = (await searchPicker({
      message: options.message ?? 'Pick one:',
      pageSize: options.pageSize ?? 15,
      source: async (term) => {
        const filtered = term ? sorted.filter((item) => searchFn(item, term)) : sorted

        if (options.allowFreeText && term && !filtered.length) {
          return [{ name: term, value: term as unknown as V, description: undefined }]
        }

        return filtered.map((item) => ({
          name: formatFn(item, statsFor(item)),
          value: item.value,
          description: undefined,
        }))
      },
    })) as V
  }

  // Track usage
  if (tracker) {
    const selected = valueToItem.get(result)
    if (selected) await tracker.track(keyFn(selected), trackOpts?.source)
  }

  // onSelect callback
  if (options.onSelect) {
    const selected = valueToItem.get(result)
    if (selected) await options.onSelect(selected)
  }

  return result
}

/**
 * Pick from multiple sources loaded in parallel.
 */
async function pickFrom<V = string>(
  sources: Source<V>[],
  options: PickOptions<V> = {},
): Promise<V> {
  const items = await loadSources(sources)
  return pick(items, options)
}

// Attach .from as a method
const pickem = Object.assign(pick, { from: pickFrom, checkbox })

export { pickem }
