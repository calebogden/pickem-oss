// src/prompts/search.ts
import { createPicker } from '../core/runtime.js'
import { useState, useKeypress, useEffect, useTerminalRows } from '../core/hooks.js'
import { usePagination, fitPageSize } from '../core/pagination.js'
import { useStatusGlyph } from '../core/status-glyph.js'
import { makeTheme } from '../core/theme.js'
import { sanitizeDisplay } from '../core/width.js'
import { isUp, isDown, isEnter, isBackspace, isPrintable } from '../core/keys.js'
import type { Status } from '../core/runtime.js'

export interface SearchChoice<V> {
  name: string
  value: V
  description?: string
}

export interface SearchConfig<V> {
  message: string
  source: (term: string) => Promise<SearchChoice<V>[]>
  pageSize?: number
}

export const searchPicker = createPicker<SearchConfig<unknown>, unknown>((config, done) => {
  const { chrome, colors, symbols } = makeTheme()
  const [term, setTerm] = useState('')
  const [results, setResults] = useState<SearchChoice<unknown>[]>([])
  const [cursor, setCursor] = useState(0)
  const [status, setStatus] = useState<Status>('loading')
  // Clamp to the viewport: header(2) + blank(1) + box(3) + blank(1) + footer(1) = 8 chrome rows.
  const pageSize = fitPageSize(config.pageSize ?? 15, useTerminalRows(), 8)

  // Re-query the source whenever the term changes; guard stale resolutions.
  useEffect(() => {
    let active = true
    setStatus('loading')
    void Promise.resolve(config.source(term)).then((r) => {
      if (!active) return
      setResults(r)
      setCursor(0)
      setStatus('idle')
    })
    return () => {
      active = false
    }
  }, [term])

  useKeypress((key) => {
    const n = Math.max(results.length, 1)
    if (isPrintable(key)) setTerm(term + key.sequence)
    else if (isBackspace(key)) setTerm(term.slice(0, -1))
    else if (isUp(key)) setCursor((cursor - 1 + n) % n)
    else if (isDown(key)) setCursor((cursor + 1) % n)
    else if (isEnter(key)) {
      if (results[cursor]) {
        setStatus('done')
        done(results[cursor].value)
      }
    }
  })

  const spinner = useStatusGlyph({ status, colors, symbols })
  if (status === 'done') return `${chrome.header(config.message)} ${colors.accent(sanitizeDisplay(results[cursor]?.name ?? ''))}`

  const hints =
    status === 'loading'
      ? [`${spinner} searching`, 'esc to clear']
      : ['type to filter', '↑↓ to move', 'enter to select']
  const header = chrome.header(config.message, hints)
  const box = chrome.searchBox({ value: term, placeholder: 'Search…' })
  if (results.length === 0) return `${header}\n\n${box}\n\n${chrome.footer({ summary: '(no matches)' })}`

  const { lines: page, windowTop } = usePagination({
    items: results,
    active: cursor,
    pageSize,
    loop: true,
    renderItem: ({ item, isActive }) => chrome.row({ label: item.name, active: isActive, term }),
  })
  const footer = chrome.footer({ moreBelow: Math.max(0, results.length - (windowTop + pageSize)), summary: `${results.length} matches` })
  return `${header}\n\n${box}\n\n${page}\n${footer}`
})
