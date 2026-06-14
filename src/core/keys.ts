// src/core/keys.ts
export interface KeyEvent {
  name: string
  sequence: string
  ctrl: boolean
  meta: boolean
  shift: boolean
}

export const isEnter = (k: KeyEvent) => k.name === 'enter' || k.name === 'return'
export const isUp = (k: KeyEvent) => k.name === 'up' || k.name === 'k' || (k.ctrl && k.name === 'p')
export const isDown = (k: KeyEvent) => k.name === 'down' || k.name === 'j' || (k.ctrl && k.name === 'n')
export const isSpace = (k: KeyEvent) => k.name === 'space' || k.sequence === ' '
export const isBackspace = (k: KeyEvent) => k.name === 'backspace'
export const isEscape = (k: KeyEvent) => k.name === 'escape'
export const isTab = (k: KeyEvent) => k.name === 'tab'
export const isCtrlC = (k: KeyEvent) => k.ctrl && k.name === 'c'

export function isPrintable(k: KeyEvent): boolean {
  if (k.ctrl || k.meta) return false
  if (!k.sequence || k.sequence.length !== 1) return false
  const code = k.sequence.codePointAt(0) ?? 0
  return code >= 0x20 && code !== 0x7f // printable, not DEL
}
