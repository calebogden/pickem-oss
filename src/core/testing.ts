import { EventEmitter } from 'node:events'
import type { KeyEvent } from './keys.js'

class FakeInput extends EventEmitter {
  isTTY = false
  setRawMode() {}
  resume() {}
  // The key reader calls readline.emitKeypressEvents then listens on 'keypress'.
  // For tests we bypass readline and emit 'keypress' directly via pushKey().
  pushKey(name: string, mods: Partial<KeyEvent> = {}) {
    const key = { name, sequence: mods.sequence ?? '', ctrl: !!mods.ctrl, meta: !!mods.meta, shift: !!mods.shift }
    this.emit('keypress', key.sequence, key)
  }
}

/**
 * A minimal virtual terminal. It records every write and, on demand, replays the
 * whole stream into a line buffer — honoring cursor moves, line/whole-screen
 * erases, and carriage returns. This is what makes a *line-diff* renderer (which
 * only re-emits the lines that changed) testable: `getScreen()` reflects the true
 * on-screen state, not just the bytes of the last frame. SGR/colour and private
 * modes (synchronized output, cursor hide/show) are zero-width and ignored.
 */
class FakeOutput extends EventEmitter {
  columns = 80
  rows?: number
  isTTY = true
  private writes = ''

  write(s: string) {
    this.writes += s
    return true
  }

  /** Replay the full write stream into a fresh line buffer and return it. */
  screen(): string {
    const lines: string[] = ['']
    let row = 0
    let col = 0
    const s = this.writes
    let i = 0

    const ensureRow = () => {
      while (lines.length <= row) lines.push('')
    }
    const put = (ch: string) => {
      ensureRow()
      let line = lines[row]
      if (line.length < col) line += ' '.repeat(col - line.length)
      lines[row] = line.slice(0, col) + ch + line.slice(col + 1)
      col += 1
    }

    while (i < s.length) {
      const ch = s[i]
      if (ch === '\x1b' && s[i + 1] === '[') {
        // Parse a CSI sequence: ESC [ [?] params final
        let j = i + 2
        let question = false
        if (s[j] === '?') {
          question = true
          j += 1
        }
        let params = ''
        while (j < s.length && /[0-9;]/.test(s[j])) {
          params += s[j]
          j += 1
        }
        const final = s[j] ?? ''
        const n = parseInt(params, 10) || 0
        if (!question) {
          switch (final) {
            case 'A':
              row = Math.max(0, row - Math.max(1, n))
              break
            case 'B':
              row += Math.max(1, n)
              ensureRow()
              break
            case 'C':
              col += Math.max(1, n)
              break
            case 'D':
              col = Math.max(0, col - Math.max(1, n))
              break
            case 'G':
              col = Math.max(0, (n || 1) - 1)
              break
            case 'K': // erase line (0/2 → whole line for our purposes)
              ensureRow()
              lines[row] = ''
              break
            case 'J': // erase from cursor down
              ensureRow()
              lines[row] = lines[row].slice(0, col)
              lines.length = row + 1
              break
            // 'm' (SGR) and anything else: no layout effect
          }
        }
        // private modes (?2026h/l, ?25h/l) and SGR: skip
        i = j + 1
        continue
      }
      if (ch === '\n') {
        row += 1
        col = 0
        ensureRow()
        i += 1
        continue
      }
      if (ch === '\r') {
        col = 0
        i += 1
        continue
      }
      put(ch)
      i += 1
    }

    return lines.join('\n')
  }
}

export interface TestEvents {
  keypress(name: string, mods?: Partial<KeyEvent>): void
  type(text: string): void
}

export interface TestHandle<V> {
  answer: Promise<V>
  events: TestEvents
  getScreen(): string
}

export async function renderTest<Config, V>(
  picker: (config: Config, opts: { input?: any; output?: any }) => Promise<V>,
  config: Config,
  opts: { rows?: number; columns?: number } = {},
): Promise<TestHandle<V>> {
  const input = new FakeInput()
  const output = new FakeOutput()
  if (opts.rows !== undefined) output.rows = opts.rows
  if (opts.columns !== undefined) output.columns = opts.columns
  const answer = picker(config, { input: input as any, output: output as any })

  const events: TestEvents = {
    keypress(name, mods = {}) {
      input.pushKey(name, mods)
    },
    type(text) {
      for (const ch of text) input.pushKey(ch, { sequence: ch })
    },
  }
  // Let the initial render settle.
  await Promise.resolve()
  return { answer, events, getScreen: () => output.screen().replace(/[ \t]+$/gm, '').replace(/\n+$/, '') }
}
