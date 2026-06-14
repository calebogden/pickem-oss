// src/prompts/confirm.ts
import { createPicker } from '../core/runtime.js'
import { useState, useKeypress } from '../core/hooks.js'
import { makeTheme } from '../core/theme.js'
import { isEnter, isPrintable } from '../core/keys.js'

export interface ConfirmConfig {
  message: string
  default?: boolean
}

export const confirmPicker = createPicker<ConfirmConfig, boolean>((config, done) => {
  const { chrome, colors } = makeTheme()
  const def = config.default ?? true
  const [value, setValue] = useState<boolean | undefined>(undefined)
  const [status, setStatus] = useState<'idle' | 'done'>('idle')

  useKeypress((key) => {
    if (isPrintable(key)) {
      const ch = key.sequence.toLowerCase()
      if (ch === 'y') setValue(true)
      else if (ch === 'n') setValue(false)
    } else if (isEnter(key)) {
      const final = value ?? def
      setStatus('done')
      setValue(final)
      done(final)
    }
  })

  const effective = value ?? def
  const hint = def ? `${colors.bold('Y')}/n` : `y/${colors.bold('N')}`
  if (status === 'done') return `${chrome.header(config.message)} ${colors.accent(effective ? 'yes' : 'no')}`
  return `${chrome.header(config.message)} ${colors.dim(`(${hint})`)} ${value == null ? '' : effective ? 'yes' : 'no'}`
})
