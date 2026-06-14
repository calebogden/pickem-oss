import readline from 'node:readline'
import { EventEmitter } from 'node:events'
import type { KeyEvent } from './keys.js'

export interface KeyReader extends EventEmitter {
  close(): void
}

export function createKeyReader(input: NodeJS.ReadStream): KeyReader {
  const emitter = new EventEmitter() as KeyReader
  readline.emitKeypressEvents(input)
  const wasRaw = input.isTTY ? input.isRaw : false
  if (input.isTTY) input.setRawMode(true)

  const onKeypress = (str: string | undefined, key: readline.Key | undefined) => {
    const event: KeyEvent = {
      name: key?.name ?? '',
      sequence: key?.sequence ?? str ?? '',
      ctrl: key?.ctrl ?? false,
      meta: key?.meta ?? false,
      shift: key?.shift ?? false,
    }
    emitter.emit('key', event)
  }

  input.on('keypress', onKeypress)
  if (input.isTTY) input.resume()

  emitter.close = () => {
    input.off('keypress', onKeypress)
    if (input.isTTY) input.setRawMode(wasRaw)
  }
  return emitter
}
