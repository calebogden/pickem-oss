// src/core/symbols.ts

// Conservative Unicode-capability check (Windows legacy consoles excluded).
export function isUnicodeSupported(env: NodeJS.ProcessEnv = process.env): boolean {
  if (process.platform !== 'win32') return env.TERM !== 'linux'
  return (
    Boolean(env.WT_SESSION) || // Windows Terminal
    Boolean(env.TERMINUS_SUBLIME) ||
    env.ConEmuTask === '{cmd::Cmder}' ||
    env.TERM_PROGRAM === 'vscode' ||
    env.TERM === 'xterm-256color' ||
    env.TERM === 'alacritty'
  )
}

export function makeSymbols(unicode = isUnicodeSupported()) {
  const u = <T>(uni: T, ascii: T) => (unicode ? uni : ascii)
  return {
    railBar: u('│', '|'),
    railEnd: u('└', '—'),
    railStart: u('◆', '*'),
    stepActive: u('◆', '*'),
    stepDone: u('◇', 'o'),
    stepCancel: u('■', 'x'),
    stepError: u('▲', '!'),
    radioOn: u('●', '>'),
    radioOff: u('○', ' '),
    checkOn: u('◼', '[x]'),
    checkOff: u('◻', '[ ]'),
    pointer: u('❯', '>'),
    pointerLeft: u('❮', '<'),
    cornerTL: u('╭', '+'),
    cornerTR: u('╮', '+'),
    cornerBL: u('╰', '+'),
    cornerBR: u('╯', '+'),
    line: u('─', '-'),
    boxV: u('│', '|'),
    // selector UI glyphs (docs/standards/selector-ui.md)
    search: u('⌕', '/'),
    moreBelow: u('↓', 'v'),
    moreAbove: u('↑', '^'),
    spinnerFrames: unicode ? ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'] : ['-', '\\', '|', '/'],
  }
}

export type Symbols = ReturnType<typeof makeSymbols>
