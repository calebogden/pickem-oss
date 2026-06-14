// src/core/colors.ts
export interface ColorOptions {
  level?: 0 | 1 | 2 | 3
  env?: NodeJS.ProcessEnv
  isTTY?: boolean
}

export function detectLevel(env: NodeJS.ProcessEnv, isTTY: boolean): 0 | 1 | 2 | 3 {
  if ('NO_COLOR' in env && env.NO_COLOR !== '') return 0
  if (env.FORCE_COLOR != null) {
    const n = Number(env.FORCE_COLOR)
    return (Number.isNaN(n) ? 1 : Math.max(0, Math.min(3, n))) as 0 | 1 | 2 | 3
  }
  if (!isTTY) return 0
  const ct = env.COLORTERM ?? ''
  if (ct === 'truecolor' || ct === '24bit') return 3
  const term = env.TERM ?? ''
  if (/-256(color)?$/.test(term)) return 2
  if (term && term !== 'dumb') return 1
  return 0
}

// Map an 8-bit RGB triple to the closest xterm-256 cube index.
function rgbTo256(r: number, g: number, b: number): number {
  const q = (v: number) => (v < 48 ? 0 : v < 115 ? 1 : Math.round((v - 35) / 40))
  return 16 + 36 * q(r) + 6 * q(g) + q(b)
}

export function makeColors(opts: ColorOptions = {}) {
  const level = opts.level ?? detectLevel(opts.env ?? process.env, opts.isTTY ?? !!process.stdout.isTTY)
  const wrap = (open: string) => (s: string) => (level === 0 ? s : `\x1b[${open}m${s}\x1b[0m`)
  const rgb = (r: number, g: number, b: number) => (s: string) => {
    if (level === 0) return s
    if (level >= 3) return `\x1b[38;2;${r};${g};${b}m${s}\x1b[0m`
    return `\x1b[38;5;${rgbTo256(r, g, b)}m${s}\x1b[0m`
  }
  // Per-character truecolor interpolation (the Vite/Astro banner look).
  const gradient = (from: [number, number, number], to: [number, number, number]) => (s: string) => {
    if (level === 0) return s
    const chars = [...s]
    return chars
      .map((ch, i) => {
        const t = chars.length <= 1 ? 0 : i / (chars.length - 1)
        const c = [0, 1, 2].map((k) => Math.round(from[k] + (to[k] - from[k]) * t)) as [number, number, number]
        return rgb(c[0], c[1], c[2])(ch)
      })
      .join('')
  }
  return {
    level,
    bold: wrap('1'),
    dim: wrap('2'),
    italic: wrap('3'),
    underline: wrap('4'),
    inverse: wrap('7'),
    // SGR 8 — occupies its normal cell width but renders invisibly (where the
    // terminal supports it). Used for the always-present active-row chevron so
    // inactive rows reserve the exact same column without showing the glyph.
    conceal: wrap('8'),
    cyan: wrap('36'),
    green: wrap('32'),
    red: wrap('31'),
    yellow: wrap('33'),
    gray: wrap('90'),
    // pickem accent — lavender/violet (selector UI, see docs/standards/selector-ui.md).
    // truecolor → 256 fallback is handled by rgb().
    accent: rgb(180, 160, 250),
    rgb,
    gradient,
  }
}

export type Colors = ReturnType<typeof makeColors>
