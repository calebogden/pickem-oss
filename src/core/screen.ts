import { ansi } from './ansi.js'
import { onExit } from './cleanup.js'
import { displayWidth, wrapToWidth } from './width.js'

/**
 * Line-diffing terminal renderer. Only the lines that actually changed since the
 * previous frame are repainted (per-line `eraseLine`), so unchanged lines never
 * flash — even on terminals that don't support DEC synchronized output (e.g.
 * macOS Terminal.app). Sync-output markers are still emitted as a bonus for
 * terminals that do support them (atomic repaint).
 */
export class Screen {
  private prevLines: string[] = []
  private offExit: (() => void) | null = null
  private onResize = () => this.lastRender && this.render(this.lastRender[0], this.lastRender[1])
  private lastRender: [string, string] | null = null

  constructor(private readonly out: NodeJS.WriteStream) {}

  private get columns(): number {
    return this.out.columns || 80
  }

  start(): void {
    this.out.write(ansi.hideCursor)
    this.offExit = onExit(() => this.out.write(ansi.showCursor))
    this.out.on?.('resize', this.onResize)
  }

  private wrap(frame: string): string[] {
    return frame
      .split('\n')
      .flatMap((line) => (line === '' ? [''] : wrapToWidth(line, this.columns)))
  }

  render(body: string, bottom = ''): void {
    this.lastRender = [body, bottom]
    const frame = bottom ? `${body}\n${bottom}` : body
    const next = this.wrap(frame)
    const prev = this.prevLines

    let buf = ansi.beginSync

    if (prev.length === 0) {
      // First paint — write the whole frame once.
      buf += next.join('\n')
    } else {
      // Move to column 0 of the first line of the previous block.
      buf += '\r'
      if (prev.length > 1) buf += ansi.cursorUp(prev.length - 1)

      const max = Math.max(prev.length, next.length)
      for (let i = 0; i < max; i++) {
        if (i > 0) buf += '\n\r' // advance to next line, column 0
        if (i < next.length) {
          // Overwrite in-place rather than erase-then-write: write the new content
          // then pad with spaces to the terminal width. This covers any longer old
          // content in a single write, so the line never flashes blank.
          if (next[i] !== prev[i]) {
            const pad = Math.max(0, this.columns - displayWidth(next[i]))
            buf += next[i] + ' '.repeat(pad)
          }
        } else {
          // Line existed before but not now — blank it.
          buf += ansi.eraseLine
        }
      }

      // If the new frame is shorter, the cursor is parked on an old (now-blank)
      // line; move it back up to the real last content line so height tracking
      // stays correct for the next diff.
      if (next.length < prev.length) buf += ansi.cursorUp(prev.length - next.length)
    }

    buf += ansi.endSync
    this.out.write(buf)
    this.prevLines = next
  }

  done(): void {
    this.out.write(`${ansi.showCursor}\n`)
    this.out.off?.('resize', this.onResize)
    this.offExit?.()
    this.prevLines = []
    this.lastRender = null
  }
}
