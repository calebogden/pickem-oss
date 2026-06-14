import type { CheckboxOptions, PickItem, UsageStats } from './types.js'
import { checkboxPicker as standardCheckbox } from './prompts/checkbox.js'
import { UsageTracker } from './usage/tracker.js'
import { createFormatter } from './display/format.js'
import { createSearchFn } from './search/search.js'
import { resolveTrackOptions } from './internal/track.js'
import { searchableCheckbox } from './prompts/searchable-checkbox.js'

export async function checkbox<V = string>(
  items: PickItem<V>[],
  options: CheckboxOptions<V> = {},
): Promise<V[]> {
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

  const formatFn =
    options.format ??
    createFormatter<V>({
      badgeStyle: options.badgeStyle,
      badgeColors: options.badgeColors,
    })
  const searchFn = options.search ?? createSearchFn<V>(options.searchFields)

  const statsMap = new Map<V, UsageStats | null>()
  if (tracker) {
    for (const item of sorted) {
      statsMap.set(item.value, await tracker.getStats(keyFn(item)))
    }
  }

  // Build a value→item map once for O(n) post-submit lookups
  const valueToItem = new Map(sorted.map((item) => [item.value, item]))

  const useSearchable = options.searchable !== false

  let result: V[]
  if (useSearchable) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    result = (await searchableCheckbox({
      message: options.message ?? 'Pick:',
      items: sorted as PickItem<unknown>[],
      pageSize: options.pageSize ?? 15,
      required: options.required ?? false,
      defaultChecked: (options.defaultChecked ?? []) as unknown[],
      allowFreeText: options.allowFreeText ?? false,
      searchFn: searchFn as (item: PickItem<unknown>, term: string) => boolean,
      formatFn: formatFn as (item: PickItem<unknown>, stats: UsageStats | null) => string,
      usageStats: tracker ? (statsMap as Map<unknown, UsageStats | null>) : null,
    })) as V[]
  } else {
    const defaultCheckedSet = new Set(options.defaultChecked ?? [])
    result = (await standardCheckbox({
      message: options.message ?? 'Pick:',
      pageSize: options.pageSize ?? 15,
      required: options.required ?? false,
      choices: sorted.map((item) => ({
        name: formatFn(item, statsMap.get(item.value) ?? null),
        value: item.value,
        checked: defaultCheckedSet.has(item.value),
        description: undefined, // We handle description in formatFn
      })),
    })) as V[]
  }

  // Single combined pass — track usage and fire onSelect for each selected item
  for (const v of result) {
    const item = valueToItem.get(v)
    if (!item) continue
    if (tracker) await tracker.track(keyFn(item), trackOpts?.source)
    if (options.onSelect) await options.onSelect(item)
  }

  return result
}
