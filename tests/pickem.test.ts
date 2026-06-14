import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { PickItem } from '../src/types.js'

// Mock native pickers to capture the source fn without running the TUI
vi.mock('../src/prompts/search.js', () => ({ searchPicker: vi.fn() }))
vi.mock('../src/prompts/select.js', () => ({ selectPicker: vi.fn() }))

import { searchPicker } from '../src/prompts/search.js'
import { selectPicker } from '../src/prompts/select.js'
import { pickem } from '../src/pickem.js'

const mockedSearch = vi.mocked(searchPicker)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('pickem allowFreeText', () => {
  it('returns the typed term when no items match and allowFreeText is true', async () => {
    let capturedSource: ((term: string) => Promise<any[]>) | undefined

    mockedSearch.mockImplementation(async (opts: any) => {
      capturedSource = opts.source
      return 'SNAP'
    })

    const items: PickItem[] = [{ label: 'AAPL', value: 'AAPL' }]
    const result = await pickem(items, { allowFreeText: true })

    expect(result).toBe('SNAP')

    // Also verify the source fn itself returns the free-text entry
    const sourceResult = await capturedSource!('SNAP')
    expect(sourceResult).toEqual([{ name: 'SNAP', value: 'SNAP', description: undefined }])
  })

  it('does not surface free text when allowFreeText is false', async () => {
    let capturedSource: ((term: string) => Promise<any[]>) | undefined

    mockedSearch.mockImplementation(async (opts: any) => {
      capturedSource = opts.source
      return 'AAPL'
    })

    const items: PickItem[] = [{ label: 'AAPL', value: 'AAPL' }]
    await pickem(items, { allowFreeText: false })

    const sourceResult = await capturedSource!('SNAP')
    expect(sourceResult).toEqual([])
  })
})

describe('pickem searchable opt-out', () => {
  const mockedSelect = vi.mocked(selectPicker)

  it('falls back to select prompt when searchable is false', async () => {
    mockedSelect.mockResolvedValueOnce('AAPL')
    const items: PickItem[] = [
      { label: 'AAPL', value: 'AAPL' },
      { label: 'TSLA', value: 'TSLA' },
    ]
    const result = await pickem(items, { searchable: false, message: 'Stock:' })
    expect(result).toBe('AAPL')
    expect(mockedSelect).toHaveBeenCalledTimes(1)
    expect(mockedSearch).not.toHaveBeenCalled()
    const call = mockedSelect.mock.calls[0][0]
    expect(call.message).toBe('Stock:')
    expect(call.choices).toHaveLength(2)
    expect((call.choices as any)[0].value).toBe('AAPL')
  })

  it('uses search prompt by default (searchable defaults to true)', async () => {
    mockedSearch.mockResolvedValueOnce('AAPL')
    await pickem([{ label: 'AAPL', value: 'AAPL' }])
    expect(mockedSearch).toHaveBeenCalled()
    expect(mockedSelect).not.toHaveBeenCalled()
  })
})
