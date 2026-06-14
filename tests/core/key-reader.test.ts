import { describe, it, expect, vi } from 'vitest'
import { PassThrough } from 'node:stream'
import { createKeyReader } from '../../src/core/key-reader.js'

describe('createKeyReader', () => {
  it('emits normalized KeyEvents from keypress events', () => {
    const input = new PassThrough() as any
    input.isTTY = false // skip setRawMode in the test
    const reader = createKeyReader(input)
    const seen: string[] = []
    reader.on('key', (k) => seen.push(k.name))
    // readline parses raw bytes; write an 'a' and an up-arrow sequence.
    input.write('a')
    input.write('\x1b[A')
    reader.close()
    expect(seen).toContain('a')
    expect(seen).toContain('up')
  })
})
