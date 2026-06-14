// src/prompts/checkbox.ts
import { createPicker } from '../core/runtime.js'
import { useState, useKeypress, useTerminalRows } from '../core/hooks.js'
import { usePagination, fitPageSize } from '../core/pagination.js'
import { makeTheme } from '../core/theme.js'
import { isUp, isDown, isSpace, isEnter } from '../core/keys.js'

export interface CheckboxChoice<V> {
  name: string
  value: V
  checked?: boolean
  description?: string
}

export interface CheckboxConfig<V> {
  message: string
  choices: CheckboxChoice<V>[]
  pageSize?: number
  required?: boolean
}

export const checkboxPicker = createPicker<CheckboxConfig<unknown>, unknown[]>((config, done) => {
  const { chrome, colors, symbols } = makeTheme()
  const choices = config.choices
  const [cursor, setCursor] = useState(0)
  const [checked, setChecked] = useState<Set<number>>(
    new Set(choices.map((c, i) => (c.checked ? i : -1)).filter((i) => i >= 0)),
  )
  const [error, setError] = useState<string | undefined>(undefined)
  const [status, setStatus] = useState<'idle' | 'done'>('idle')

  const selected = () =>
    choices.filter((_, i) => checked.has(i)).map((c) => c.value) // SOURCE order

  useKeypress((key) => {
    if (isUp(key)) setCursor((cursor - 1 + choices.length) % choices.length)
    else if (isDown(key)) setCursor((cursor + 1) % choices.length)
    else if (isSpace(key)) {
      const next = new Set(checked)
      next.has(cursor) ? next.delete(cursor) : next.add(cursor)
      setChecked(next)
      setError(undefined)
    } else if (isEnter(key)) {
      if (config.required && checked.size === 0) {
        setError('Select at least one option.')
        return
      }
      setStatus('done')
      done(selected())
    }
  })

  if (status === 'done') {
    const names = choices.filter((_, i) => checked.has(i)).map((c) => c.name)
    return `${chrome.header(config.message)} ${colors.accent(names.join(', '))}`
  }

  // Clamp to the viewport: header(2) + blank(1) + footer(1) = 4 chrome rows.
  const pageSize = fitPageSize(config.pageSize ?? 15, useTerminalRows(), 4)
  const header = chrome.header(config.message, ['space to toggle', 'enter to confirm'])
  const { lines: page, windowTop } = usePagination({
    items: choices,
    active: cursor,
    pageSize,
    loop: true,
    renderItem: ({ item, index, isActive }) => {
      const box = checked.has(index) ? colors.green(symbols.radioOn) : colors.dim(symbols.radioOff)
      return chrome.row({ label: item.name, glyph: box, active: isActive })
    },
  })
  const footer = error
    ? chrome.footer({ summary: colors.red(error) })
    : chrome.footer({ moreBelow: Math.max(0, choices.length - (windowTop + pageSize)), summary: `${checked.size} selected` })
  return `${header}\n\n${page}\n${footer}`
})
