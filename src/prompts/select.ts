// src/prompts/select.ts
import { createPicker } from '../core/runtime.js'
import { useState, useKeypress, useTerminalRows } from '../core/hooks.js'
import { usePagination, fitPageSize } from '../core/pagination.js'
import { makeTheme } from '../core/theme.js'
import { isUp, isDown, isEnter } from '../core/keys.js'

export interface SelectChoice<V> {
  name: string
  value: V
  description?: string
}

export interface SelectConfig<V> {
  message: string
  choices: SelectChoice<V>[]
  pageSize?: number
}

export const selectPicker = createPicker<SelectConfig<unknown>, unknown>((config, done) => {
  const { chrome, colors } = makeTheme()
  const [cursor, setCursor] = useState(0)
  const [status, setStatus] = useState<'idle' | 'done'>('idle')
  const choices = config.choices
  // Clamp to the viewport: header(2) + blank(1) + footer(1) = 4 chrome rows.
  const pageSize = fitPageSize(config.pageSize ?? 15, useTerminalRows(), 4)

  useKeypress((key) => {
    if (isUp(key)) setCursor((cursor - 1 + choices.length) % choices.length)
    else if (isDown(key)) setCursor((cursor + 1) % choices.length)
    else if (isEnter(key)) {
      setStatus('done')
      done(choices[cursor].value)
    }
  })

  if (status === 'done') {
    return `${chrome.header(config.message)} ${colors.accent(choices[cursor].name)}`
  }

  const header = chrome.header(config.message, ['↑↓ to move', 'enter to select'])
  const { lines: page, windowTop } = usePagination({
    items: choices,
    active: cursor,
    pageSize,
    loop: true,
    renderItem: ({ item, isActive }) => chrome.row({ label: item.name, active: isActive }),
  })
  const footer = chrome.footer({
    moreBelow: Math.max(0, choices.length - (windowTop + pageSize)),
  })
  return footer ? `${header}\n\n${page}\n${footer}` : `${header}\n\n${page}`
})
