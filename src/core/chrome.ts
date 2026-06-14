// src/core/chrome.ts  (canonical: docs/standards/selector-ui.md)
import type { Colors } from './colors.js'
import type { Symbols } from './symbols.js'
import { displayWidth, stripAnsi } from './width.js'

export interface ChromeDeps {
  colors: Colors
  symbols: Symbols
  /** Terminal column count, snapshotted once per render to avoid per-row reads. */
  columns?: number
}

export interface RowArgs {
  label: string
  meta?: string[]
  active?: boolean
  glyph?: string
  /** Filter term to highlight inside the label on inactive rows. */
  term?: string
}

export interface SearchBoxArgs {
  value: string
  placeholder?: string
  focused?: boolean
  width?: number
}

export interface FooterArgs {
  moreAbove?: number
  moreBelow?: number
  summary?: string
}

function padToWidth(str: string, width: number): string {
  const w = displayWidth(str)
  return w >= width ? str : str + ' '.repeat(width - w)
}

export function makeChrome({ colors, symbols }: ChromeDeps) {
  const dot = colors.dim(' · ')
  const accent = colors.accent

  return {
    /** Accent+bold title, then a dim "·"-joined hint line. */
    header(title: string, hints: string[] = []): string {
      const head = colors.bold(accent(title))
      if (hints.length === 0) return head
      return `${head}\n${colors.dim(hints.join(' · '))}`
    },

    /**
     * Rounded boxed search input (searchable pickers only). When empty, the block
     * cursor sits at the START of the input (where typing begins) with the
     * placeholder dimmed behind it — not parked after the placeholder text.
     */
    searchBox({ value, placeholder = '', focused = true, width = 40 }: SearchBoxArgs): string {
      const w = Math.max(20, Math.min(width, 60))
      const cursor = focused ? colors.inverse(' ') : ''
      const text = value.length ? `${value}${cursor}` : `${cursor}${colors.dim(placeholder)}`
      const content = `${colors.dim(symbols.search)} ${text}`
      const inner = padToWidth(content, w)
      const top = colors.dim(symbols.cornerTL + symbols.line.repeat(w + 1) + symbols.cornerTR)
      const mid = `${colors.dim(symbols.boxV)} ${inner}${colors.dim(symbols.boxV)}`
      const bot = colors.dim(symbols.cornerBL + symbols.line.repeat(w + 1) + symbols.cornerBR)
      return `${top}\n${mid}\n${bot}`
    },

    /**
     * One columnar list row. Every row begins with the same `❯` chevron cell, so
     * the column is reserved identically on every row and the label NEVER shifts
     * as the cursor moves — the chevron is simply concealed (invisible) on
     * inactive rows and lit in accent on the active row. The active label is also
     * recolored to accent (bold); the caller's own ANSI is stripped first so the
     * accent always wins (an embedded reset can't cancel it), which is why the
     * highlight shows on colored rows too. Inactive rows highlight matched `term`.
     */
    row({ label, meta = [], active = false, glyph = '', term = '' }: RowArgs): string {
      const chevron = active ? `${accent(symbols.pointer)} ` : `${colors.conceal(symbols.pointer)} `
      const g = glyph ? `${glyph} ` : ''
      const m = meta.length ? dot + colors.dim(meta.join(' · ')) : ''
      if (active) return `${chevron}${g}${colors.bold(accent(stripAnsi(label)))}${m}`
      if (!term) return `${chevron}${g}${label}${m}`
      const i = label.toLowerCase().indexOf(term.toLowerCase())
      const hl = i < 0 ? label
        : label.slice(0, i) + accent(label.slice(i, i + term.length)) + label.slice(i + term.length)
      return `${chevron}${g}${hl}${m}`
    },

    /** Dim pagination/summary footer. */
    footer({ moreAbove = 0, moreBelow = 0, summary = '' }: FooterArgs): string {
      const bits: string[] = []
      if (moreAbove) bits.push(colors.dim(`${symbols.moreAbove} ${moreAbove} more above`))
      if (moreBelow) bits.push(colors.dim(`${symbols.moreBelow} ${moreBelow} more below`))
      if (summary) bits.push(colors.dim(summary))
      return bits.join('   ')
    },
  }
}

export type Chrome = ReturnType<typeof makeChrome>
