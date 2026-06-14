// src/core/width.ts
// Zero external dependencies: uses Intl.Segmenter (Node 18+) and built-in Unicode
// property escapes. Replaces the string-width package.

// Ranges where a code point has East Asian Width "Wide" or "Fullwidth".
// Derived from Unicode 16 / get-east-asian-width lookup-data.js.
// Each pair is [start, end] inclusive.
const WIDE_RANGES: [number, number][] = [
  [0x1100, 0x115f], [0x231a, 0x231b], [0x2329, 0x232a], [0x23e9, 0x23ec],
  [0x23f0, 0x23f0], [0x23f3, 0x23f3], [0x25fd, 0x25fe], [0x2614, 0x2615],
  [0x2648, 0x2653], [0x267f, 0x267f], [0x2693, 0x2693], [0x26a1, 0x26a1],
  [0x26aa, 0x26ab], [0x26bd, 0x26be], [0x26c4, 0x26c5], [0x26ce, 0x26ce],
  [0x26d4, 0x26d4], [0x26ea, 0x26ea], [0x26f2, 0x26f3], [0x26f5, 0x26f5],
  [0x26fa, 0x26fa], [0x26fd, 0x26fd], [0x2702, 0x2702], [0x2705, 0x2705],
  [0x2708, 0x270d], [0x270f, 0x270f], [0x2712, 0x2712], [0x2714, 0x2714],
  [0x2716, 0x2716], [0x271d, 0x271d], [0x2721, 0x2721], [0x2728, 0x2728],
  [0x2733, 0x2734], [0x2744, 0x2744], [0x2747, 0x2747], [0x274c, 0x274c],
  [0x274e, 0x274e], [0x2753, 0x2755], [0x2757, 0x2757], [0x2763, 0x2764],
  [0x2795, 0x2797], [0x27a1, 0x27a1], [0x27b0, 0x27b0], [0x27bf, 0x27bf],
  [0x2934, 0x2935], [0x2b05, 0x2b07], [0x2b1b, 0x2b1c], [0x2b50, 0x2b50],
  [0x2b55, 0x2b55], [0x2e80, 0x2ef3], [0x2f00, 0x2fd5], [0x2ff0, 0x2ffb],
  [0x3000, 0x303e], [0x3041, 0x3096], [0x3099, 0x30ff], [0x3105, 0x312f],
  [0x3131, 0x318e], [0x3190, 0x31e3], [0x31f0, 0x321e], [0x3220, 0x3247],
  [0x3250, 0x4dbf], [0x4e00, 0xa48c], [0xa490, 0xa4c6], [0xa960, 0xa97c],
  [0xac00, 0xd7a3], [0xf900, 0xfaff], [0xfe10, 0xfe19], [0xfe30, 0xfe52],
  [0xfe54, 0xfe66], [0xfe68, 0xfe6b], [0x16fe0, 0x16fe4], [0x16ff0, 0x16ff1],
  [0x17000, 0x187f7], [0x18800, 0x18cd5], [0x18d00, 0x18d08], [0x1aff0, 0x1aff3],
  [0x1aff5, 0x1affb], [0x1affd, 0x1affe], [0x1b000, 0x1b122], [0x1b132, 0x1b132],
  [0x1b150, 0x1b152], [0x1b155, 0x1b155], [0x1b164, 0x1b167], [0x1b170, 0x1b2fb],
  [0x1f004, 0x1f004], [0x1f0cf, 0x1f0cf], [0x1f18e, 0x1f18e], [0x1f191, 0x1f19a],
  [0x1f1e6, 0x1f1ff], [0x1f201, 0x1f202], [0x1f21a, 0x1f21a], [0x1f22f, 0x1f22f],
  [0x1f232, 0x1f23a], [0x1f250, 0x1f251], [0x1f300, 0x1f321], [0x1f324, 0x1f393],
  [0x1f396, 0x1f397], [0x1f399, 0x1f39b], [0x1f39e, 0x1f3f0], [0x1f3f3, 0x1f3f5],
  [0x1f3f7, 0x1f4fd], [0x1f4ff, 0x1f53d], [0x1f549, 0x1f54e], [0x1f550, 0x1f567],
  [0x1f56f, 0x1f570], [0x1f573, 0x1f57a], [0x1f587, 0x1f587], [0x1f58a, 0x1f58d],
  [0x1f590, 0x1f590], [0x1f595, 0x1f596], [0x1f5a4, 0x1f5a5], [0x1f5a8, 0x1f5a8],
  [0x1f5b1, 0x1f5b2], [0x1f5bc, 0x1f5bc], [0x1f5c2, 0x1f5c4], [0x1f5d1, 0x1f5d3],
  [0x1f5dc, 0x1f5de], [0x1f5e1, 0x1f5e1], [0x1f5e3, 0x1f5e3], [0x1f5e8, 0x1f5e8],
  [0x1f5ef, 0x1f5ef], [0x1f5f3, 0x1f5f3], [0x1f5fa, 0x1f64f], [0x1f680, 0x1f6c5],
  [0x1f6cb, 0x1f6d2], [0x1f6d5, 0x1f6d7], [0x1f6dc, 0x1f6df], [0x1f6e0, 0x1f6e5],
  [0x1f6e9, 0x1f6e9], [0x1f6eb, 0x1f6ec], [0x1f6f0, 0x1f6f0], [0x1f6f3, 0x1f6fc],
  [0x1f7e0, 0x1f7eb], [0x1f7f0, 0x1f7f0], [0x1f90c, 0x1f93a], [0x1f93c, 0x1f945],
  [0x1f947, 0x1f9ff], [0x1fa00, 0x1fa53], [0x1fa60, 0x1fa6d], [0x1fa70, 0x1fa7c],
  [0x1fa80, 0x1fa88], [0x1fa90, 0x1fabd], [0x1fabf, 0x1fac5], [0x1face, 0x1fadb],
  [0x1fae0, 0x1fae8], [0x1faf0, 0x1faf8], [0x20000, 0x2fffd], [0x30000, 0x3fffd],
]

const FULLWIDTH_RANGES: [number, number][] = [
  [0xff01, 0xff60], [0xffe0, 0xffe6],
]

function inRange(cp: number, ranges: [number, number][]): boolean {
  let lo = 0, hi = ranges.length - 1
  while (lo <= hi) {
    const mid = (lo + hi) >>> 1
    const [s, e] = ranges[mid]
    if (cp < s) hi = mid - 1
    else if (cp > e) lo = mid + 1
    else return true
  }
  return false
}

// Detects emoji presentation (width-2 symbols rendered as pictographs).
// Try the more precise RGI_Emoji (Node 20+), fall back to Emoji_Presentation (Node 18).
let IS_EMOJI: RegExp
try {
  IS_EMOJI = new RegExp('\\p{RGI_Emoji}', 'v')
} catch {
  IS_EMOJI = new RegExp('\\p{Emoji_Presentation}', 'u')
}

// eslint-disable-next-line no-control-regex
const ANSI_RE = /\x1b(?:\[[0-9;?]*[A-Za-z]|\][^\x07]*\x07|[^[\]])/g

const segmenter = new Intl.Segmenter()

export function displayWidth(str: string): number {
  const clean = str.replace(ANSI_RE, '')
  let width = 0
  for (const { segment } of segmenter.segment(clean)) {
    const cp = segment.codePointAt(0) ?? 0
    // Skip: null, control chars, combining diacriticals, zero-width, variation selectors,
    // Unicode Tags block, and other Default_Ignorable ranges.
    if (cp === 0) continue
    if (cp < 0x20 || (cp >= 0x7f && cp < 0xa0)) continue
    if (cp >= 0x0300 && cp <= 0x036f) continue // Combining Diacritical Marks
    if (cp >= 0x1ab0 && cp <= 0x1aff) continue // Combining Diacritical Marks Extended
    if (cp >= 0x1dc0 && cp <= 0x1dff) continue // Combining Diacritical Marks Supplement
    if (cp >= 0x20d0 && cp <= 0x20ff) continue // Combining Diacritical Marks for Symbols
    if (cp >= 0xfe20 && cp <= 0xfe2f) continue // Combining Half Marks
    if (cp >= 0x200b && cp <= 0x200f) continue // Zero-width spaces / joiners
    if (cp === 0xfeff) continue                  // BOM / ZWNBSP
    if (cp >= 0xfe00 && cp <= 0xfe0f) continue  // Variation Selectors
    if (cp >= 0xe0000 && cp <= 0xe01ff) continue // Unicode Tags
    if (IS_EMOJI.test(segment) || inRange(cp, WIDE_RANGES) || inRange(cp, FULLWIDTH_RANGES)) {
      width += 2
    } else {
      width += 1
    }
  }
  return width
}

export function stripAnsi(str: string): string {
  return str.replace(ANSI_RE, '')
}

/** Truncate to `max` display columns, appending an ellipsis when cut. */
export function truncateToWidth(str: string, max: number, ellipsis = '…'): string {
  if (displayWidth(str) <= max) return str
  const budget = max - displayWidth(ellipsis)
  let out = ''
  let w = 0
  for (const { segment } of segmenter.segment(str.replace(ANSI_RE, ''))) {
    const cw = displayWidth(segment)
    if (w + cw > budget) break
    out += segment
    w += cw
  }
  return out + ellipsis
}

/** Greedy word-wrap on display width. ANSI sequences count as zero width. */
export function wrapToWidth(str: string, max: number): string[] {
  const words = str.split(' ')
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word
    if (displayWidth(candidate) > max && line) {
      lines.push(line)
      line = word
    } else {
      line = candidate
    }
  }
  if (line) lines.push(line)
  return lines
}
