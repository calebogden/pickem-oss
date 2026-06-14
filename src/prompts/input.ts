// src/prompts/input.ts
import { createPicker } from '../core/runtime.js'
import { useState, useKeypress } from '../core/hooks.js'
import { makeTheme } from '../core/theme.js'
import { sanitizeDisplay } from '../core/width.js'
import { isEnter, isBackspace, isPrintable } from '../core/keys.js'

export interface InputConfig {
  message: string
  default?: string
  validate?: (value: string) => boolean | string | Promise<boolean | string>
}

export const inputPicker = createPicker<InputConfig, string>((config, done) => {
  const { chrome, colors } = makeTheme()
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | undefined>(undefined)
  const [status, setStatus] = useState<'idle' | 'done'>('idle')

  useKeypress((key, _input) => {
    if (isEnter(key)) {
      const final = value.length === 0 && config.default != null ? config.default : value
      const rawResult = config.validate ? config.validate(final) : true
      const apply = (result: boolean | string) => {
        if (result === true) {
          setStatus('done')
          setValue(final)
          done(final)
        } else {
          setError(typeof result === 'string' ? result : 'Invalid input')
        }
      }
      // Handle synchronous validate results immediately (so the error renders
      // in the same synchronous keypress dispatch, visible to getScreen()).
      if (rawResult instanceof Promise) {
        void rawResult.then(apply)
      } else {
        apply(rawResult)
      }
    } else if (isBackspace(key)) {
      setError(undefined)
      setValue(value.slice(0, -1))
    } else if (isPrintable(key)) {
      setError(undefined)
      setValue(value + key.sequence)
    }
  })

  // Sanitize at the DISPLAY boundary only (CWE-150) — `default` is caller-supplied
  // and `value` may carry pasted control bytes. The returned answer stays raw.
  if (status === 'done') return `${chrome.header(config.message)} ${colors.accent(sanitizeDisplay(value))}`

  const shown =
    value.length === 0 && config.default != null
      ? colors.dim(sanitizeDisplay(config.default))
      : sanitizeDisplay(value)
  const lines = [`${chrome.header(config.message)} ${shown}${colors.inverse(' ')}`]
  if (error) lines.push(chrome.footer({ summary: colors.red(error) }))
  return lines.join('\n')
})
