import type { PickItem, UsageStats } from '../types.js'
import { sanitizeDisplay } from '../core/width.js'

type BadgeStyle = 'none' | 'bracket' | 'dot' | ((group: string) => string)

const ANSI = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  gray: '\x1b[90m',
} as const

const DEFAULT_BADGE_COLORS: Record<string, keyof typeof ANSI> = {}

function colorize(text: string, color: string): string {
  const code = ANSI[color as keyof typeof ANSI] ?? ANSI.gray
  return `${code}${text}${ANSI.reset}`
}

function dim(text: string): string {
  return `${ANSI.dim}${text}${ANSI.reset}`
}

function renderBadge(
  group: string,
  style: BadgeStyle,
  colors: Record<string, string>,
): string {
  if (typeof style === 'function') {
    return style(group)
  }

  if (style === 'none') {
    return ''
  }

  const color = colors[group] ?? 'gray'

  if (style === 'dot') {
    return colorize('●', color) + ' '
  }

  // bracket (default)
  return colorize(`[${group}]`, color) + ' '
}

function renderUsageCount(count: number): string {
  if (count === 0) return ''
  return dim(` ${count}x`)
}

export interface FormatOptions {
  badgeStyle?: 'none' | 'bracket' | 'dot' | ((group: string) => string)
  badgeColors?: Record<string, string>
}

export function createFormatter<V>(
  options: FormatOptions = {},
): (item: PickItem<V>, stats: UsageStats | null) => string {
  const style = options.badgeStyle ?? 'none'
  const colors = { ...DEFAULT_BADGE_COLORS, ...options.badgeColors }

  return (item, stats) => {
    let result = ''

    // Item text is frequently attacker-controllable; neutralize terminal-control
    // injection (CWE-150) on every externally-supplied piece (this is a public
    // export, so sanitize here too — not only at the render boundary).
    if (item.group) {
      result += renderBadge(sanitizeDisplay(item.group), style, colors)
    }

    result += sanitizeDisplay(item.label)
    result += renderUsageCount(stats?.count ?? 0)

    if (item.description) {
      result += dim(` — ${sanitizeDisplay(item.description)}`)
    }

    return result
  }
}
