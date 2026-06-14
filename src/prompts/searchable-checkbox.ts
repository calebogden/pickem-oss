// src/prompts/searchable-checkbox.ts
// Native engine port of the searchableCheckbox multi-select.
// Behavioral spec: src/prompt/searchable-checkbox.ts (the original implementation, now removed).
import { createPicker } from '../core/runtime.js'
import { useState, useMemo, useKeypress, useTerminalRows } from '../core/hooks.js'
import { usePagination, fitPageSize } from '../core/pagination.js'
import { makeTheme } from '../core/theme.js'
import { sanitizeDisplay } from '../core/width.js'
import { isUp, isDown, isSpace, isEnter, isBackspace, isEscape, isPrintable } from '../core/keys.js'
import type { PickItem, UsageStats } from '../types.js'

export interface SearchableCheckboxConfig<V = string> {
  message: string
  items: PickItem<V>[]
  pageSize: number
  required: boolean
  defaultChecked: V[]
  allowFreeText: boolean
  searchFn: (item: PickItem<V>, term: string) => boolean
  formatFn: (item: PickItem<V>, stats: UsageStats | null) => string
  usageStats: Map<V, UsageStats | null> | null
}

export const searchableCheckbox = createPicker<SearchableCheckboxConfig<unknown>, unknown[]>(
  (config, done) => {
    const { chrome, colors, symbols } = makeTheme()
    // Clamp to the viewport: header(2) + blank(1) + box(3) + blank(1) + footer(1) = 8 chrome rows.
    const pageSize = fitPageSize(config.pageSize, useTerminalRows(), 8)
    const [status, setStatus] = useState<'idle' | 'done'>('idle')
    const [filter, setFilter] = useState('')
    const [cursor, setCursor] = useState(0)
    const [checked, setChecked] = useState<Set<unknown>>(new Set(config.defaultChecked))
    const [extras, setExtras] = useState<PickItem<unknown>[]>([])
    const [error, setError] = useState<string | undefined>(undefined)

    // Full item pool: original items + free-text extras (source order).
    const pool = useMemo(() => (extras.length > 0 ? [...config.items, ...extras] : config.items), [extras])

    // Filtered + pin-reordered view. Pinned items respect the filter (hidden on no-match).
    const view = useMemo(() => {
      const matched = filter ? pool.filter((it) => config.searchFn(it, filter)) : pool
      const first = matched.filter((it) => it.pin === 'first')
      const last = matched.filter((it) => it.pin === 'last')
      const mid = matched.filter((it) => !it.pin)
      return [...first, ...mid, ...last]
    }, [filter, pool])

    const submit = () => {
      if (config.required && checked.size === 0) {
        setError('At least one item must be selected.')
        return
      }
      setStatus('done')
      // SOURCE order: original items then extras, filtered to checked set.
      done(pool.filter((it) => checked.has(it.value)).map((it) => it.value))
    }

    useKeypress((key, input) => {
      if (status === 'done') return

      if (isEnter(key)) {
        // Free-text path: filter has text, no visible matches, allowFreeText is on.
        if (config.allowFreeText && filter.length > 0 && view.length === 0) {
          const existing = extras.find((e) => e.value === (filter as unknown))
          const next = new Set(checked)
          if (existing) {
            // Dedup: already an extra — just ensure it is checked and clear filter.
            next.add(existing.value)
            setChecked(next)
          } else {
            const newItem: PickItem<unknown> = { label: filter, value: filter as unknown }
            setExtras([...extras, newItem])
            next.add(filter as unknown)
            setChecked(next)
          }
          setFilter('')
          setCursor(0)
          setError(undefined)
          input.clearLine()
          return
        }
        submit()
        return
      }

      // Space toggles before the printable-filter path (space is printable but is the toggle key).
      if (isSpace(key)) {
        if (view.length === 0) return
        const item = view[cursor]
        const next = new Set(checked)
        if (next.has(item.value)) next.delete(item.value)
        else next.add(item.value)
        setChecked(next)
        setError(undefined)
        return
      }

      // Printable input (excluding space, handled above) goes to the filter.
      // This ensures typing "j"/"k" appends to the filter rather than navigating.
      if (isPrintable(key)) {
        const next = filter + key.sequence
        setFilter(next)
        setCursor(0)
        setError(undefined)
        input.setLine(next)
        return
      }

      if (isUp(key)) {
        if (view.length === 0) return
        setCursor((cursor - 1 + view.length) % view.length)
        return
      }

      if (isDown(key)) {
        if (view.length === 0) return
        setCursor((cursor + 1) % view.length)
        return
      }

      if (isBackspace(key)) {
        if (filter.length > 0) {
          const next = filter.slice(0, -1)
          setFilter(next)
          setCursor(0)
          input.setLine(next)
        }
        return
      }

      if (isEscape(key)) {
        if (filter.length > 0) {
          setFilter('')
          setCursor(0)
          input.clearLine()
        }
        return
      }
    })

    if (status === 'done') {
      const labels = pool
        .filter((it) => checked.has(it.value))
        .map((it) => sanitizeDisplay(it.label))
        .join(', ')
      return `${chrome.header(config.message)} ${colors.accent(labels || '(none)')}`
    }

    const header = chrome.header(config.message, ['type to filter', 'space to toggle', 'enter to confirm'])
    const box = chrome.searchBox({ value: filter, placeholder: 'Filter…' })

    if (view.length === 0) {
      const msg = error ? colors.red(error) : '(no matches)'
      return `${header}\n\n${box}\n\n${chrome.footer({ summary: msg })}`
    }

    const { lines: page, windowTop } = usePagination({
      items: view,
      active: cursor,
      pageSize,
      loop: true,
      renderItem: ({ item, isActive }) => {
        const checkGlyph = checked.has(item.value)
          ? colors.green(symbols.radioOn)
          : colors.dim(symbols.radioOff)
        const stats = config.usageStats?.get(item.value) ?? null
        return chrome.row({ label: config.formatFn(item, stats), glyph: checkGlyph, active: isActive, term: filter })
      },
    })

    const footer = error
      ? chrome.footer({ summary: colors.red(error) })
      : chrome.footer({
          moreBelow: Math.max(0, view.length - (windowTop + pageSize)),
          summary: `${view.length} shown, ${checked.size} selected`,
        })

    return `${header}\n\n${box}\n\n${page}\n${footer}`
  },
)
