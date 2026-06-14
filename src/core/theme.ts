import { makeColors } from './colors.js'
import { makeSymbols, isUnicodeSupported } from './symbols.js'
import { makeChrome, type Chrome } from './chrome.js'
import type { Colors } from './colors.js'
import type { Symbols } from './symbols.js'

export interface ThemeOptions {
  colorLevel?: 0 | 1 | 2 | 3
  unicode?: boolean
}

export interface Theme {
  colors: Colors
  symbols: Symbols
  chrome: Chrome
}

export function makeTheme(opts: ThemeOptions = {}): Theme {
  const colors = makeColors(opts.colorLevel != null ? { level: opts.colorLevel } : {})
  const symbols = makeSymbols(opts.unicode ?? isUnicodeSupported())
  const columns = (typeof process !== 'undefined' && process.stdout?.columns) || 80
  const chrome = makeChrome({ colors, symbols, columns })
  return { colors, symbols, chrome }
}
