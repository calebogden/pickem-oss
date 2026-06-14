// src/core/ansi.ts
const ESC = '\x1b'
const CSI = `${ESC}[`

export const ansi = {
  cursorUp: (n = 1) => `${CSI}${n}A`,
  cursorDown: (n = 1) => `${CSI}${n}B`,
  cursorTo: (col: number) => `${CSI}${col + 1}G`, // 0-based → 1-based column
  hideCursor: `${CSI}?25l`,
  showCursor: `${CSI}?25h`,
  eraseLine: `${CSI}2K`,
  eraseDown: `${CSI}0J`,
  eraseScreen: `${CSI}2J`,
  // DEC private mode 2026 — atomic frame repaint (anti-flicker); ignored if unsupported
  beginSync: `${CSI}?2026h`,
  endSync: `${CSI}?2026l`,
  enterAltScreen: `${CSI}?1049h`,
  exitAltScreen: `${CSI}?1049l`,
  // OSC-8 hyperlink — degrades to plain text on unsupporting terminals
  link: (url: string, text: string) => `${ESC}]8;;${url}\x07${text}${ESC}]8;;\x07`,
} as const
