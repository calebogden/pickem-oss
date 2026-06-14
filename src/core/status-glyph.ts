import { useState, useEffect, useRef } from './hooks.js'
import type { Status } from './runtime.js'
import type { Colors } from './colors.js'
import type { Symbols } from './symbols.js'

export interface StatusGlyphArgs {
  status: Status
  colors: Colors
  symbols: Symbols
}

export function useStatusGlyph({ status, colors, symbols }: StatusGlyphArgs): string {
  const frameRef = useRef(0)
  // _tick is only read by useState to trigger re-renders; frame value lives in frameRef.
  const [_tick, forceRender] = useState(0)
  useEffect(() => {
    if (status !== 'loading') return
    let tick = 0
    const id = setInterval(() => {
      frameRef.current = (frameRef.current + 1) % symbols.spinnerFrames.length
      forceRender(++tick)
    }, 80)
    return () => clearInterval(id)
  }, [status])

  if (status === 'loading') return colors.cyan(symbols.spinnerFrames[frameRef.current])
  if (status === 'done') return colors.green(symbols.stepDone)
  if (status === 'canceled') return colors.red(symbols.stepCancel)
  return colors.cyan(symbols.stepActive)
}
