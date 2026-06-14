// tests/core/width.test.ts
import { describe, it, expect } from 'vitest'
import { displayWidth, truncateToWidth, wrapToWidth } from '../../src/core/width.js'

describe('width', () => {
  it('ignores ANSI when measuring', () => {
    expect(displayWidth('\x1b[1mhi\x1b[0m')).toBe(2)
  })
  it('counts CJK as width 2', () => {
    expect(displayWidth('你好')).toBe(4)
  })
  it('truncates by display columns with an ellipsis', () => {
    expect(truncateToWidth('hello world', 8)).toBe('hello w…')
  })
  it('does not truncate strings already within width', () => {
    expect(truncateToWidth('hi', 8)).toBe('hi')
  })
  it('wraps on display width', () => {
    expect(wrapToWidth('aaa bbb ccc', 7)).toEqual(['aaa bbb', 'ccc'])
  })
})
