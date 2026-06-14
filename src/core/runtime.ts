import { createKeyReader } from './key-reader.js'
import { Screen } from './screen.js'
import { createHookStore, withHookStore, type HookStore } from './hooks.js'
import type { KeyEvent } from './keys.js'
import { isCtrlC } from './keys.js'

export type Status = 'idle' | 'loading' | 'done' | 'canceled'

/** The input-buffer controller passed to keypress handlers (pickem's `rl` replacement). */
export interface PickerInput {
  line: string
  setLine(value: string): void
  clearLine(): void
}

export interface PickerContext {
  status: Status
}

export type View<Config, Value> = (
  config: Config,
  done: (value: Value) => void,
) => string | [string, string]

export interface RunOptions {
  input?: NodeJS.ReadStream
  output?: NodeJS.WriteStream
}

export class CancelError extends Error {
  constructor() {
    super('Picker canceled')
    this.name = 'CancelError'
  }
}

export function createPicker<Config, Value>(view: View<Config, Value>) {
  return (config: Config, opts: RunOptions = {}): Promise<Value> => {
    const input = opts.input ?? process.stdin
    const output = opts.output ?? process.stdout
    const screen = new Screen(output)
    const reader = createKeyReader(input)

    return new Promise<Value>((resolve, reject) => {
      let store: HookStore
      let inputBuffer = ''
      let finished = false

      const pickerInput: PickerInput = {
        get line() {
          return inputBuffer
        },
        setLine(value: string) {
          inputBuffer = value
        },
        clearLine() {
          inputBuffer = ''
        },
      }

      const cleanup = () => {
        reader.close()
        screen.done()
      }

      const done = (value: Value) => {
        if (finished) return
        finished = true
        render() // final frame (status 'done')
        cleanup()
        resolve(value)
      }

      const render = () => {
        store.reset()
        const frame = withHookStore(store, () => view(config, done))
        // Flush effects queued during render.
        for (const effect of store.effects) effect()
        const [body, bottom] = Array.isArray(frame) ? frame : [frame, '']
        screen.render(body, bottom)
      }

      store = createHookStore(
        () => {
          if (!finished) render()
        },
        () => output.rows || Infinity,
      )

      reader.on('key', (key: KeyEvent) => {
        if (isCtrlC(key)) {
          finished = true
          cleanup()
          reject(new CancelError())
          return
        }
        for (const handler of store.keypressHandlers) handler(key, pickerInput)
        if (!finished) render()
      })

      screen.start()
      render()
    })
  }
}
