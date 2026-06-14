import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { PickItem } from '../src/types.js'

vi.mock('../src/prompts/checkbox.js', () => ({ checkboxPicker: vi.fn() }))

vi.mock('../src/prompts/searchable-checkbox.js', () => ({
  searchableCheckbox: vi.fn(),
}))

import { checkboxPicker } from '../src/prompts/checkbox.js'
import { pickem } from '../src/pickem.js'
import { MemoryStorage } from '../src/usage/storage.js'
import { searchableCheckbox } from '../src/prompts/searchable-checkbox.js'

const mockCheckbox = vi.mocked(checkboxPicker)
const mockSearchable = vi.mocked(searchableCheckbox) as any

beforeEach(() => {
  vi.clearAllMocks()
})

describe('pickem.checkbox (non-searchable wrapper)', () => {
  const items: PickItem[] = [
    { label: 'Apple', value: 'apple' },
    { label: 'Banana', value: 'banana' },
    { label: 'Cherry', value: 'cherry' },
  ]

  it('returns selected values from the underlying checkbox', async () => {
    mockCheckbox.mockResolvedValueOnce(['apple', 'cherry'])
    const result = await pickem.checkbox(items, { searchable: false })
    expect(result).toEqual(['apple', 'cherry'])
  })

  it('passes message, pageSize, required to the underlying checkbox', async () => {
    mockCheckbox.mockResolvedValueOnce([])
    await pickem.checkbox(items, {
      searchable: false,
      message: 'Pick fruits:',
      pageSize: 20,
      required: true,
    })
    const call = mockCheckbox.mock.calls[0][0]
    expect(call.message).toBe('Pick fruits:')
    expect(call.pageSize).toBe(20)
    expect(call.required).toBe(true)
  })

  it('honors defaultChecked', async () => {
    mockCheckbox.mockResolvedValueOnce(['apple'])
    await pickem.checkbox(items, {
      searchable: false,
      defaultChecked: ['apple', 'cherry'],
    })
    const call = mockCheckbox.mock.calls[0][0]
    const choices = call.choices as Array<{ value: string; checked: boolean }>
    expect(choices.find((c) => c.value === 'apple')?.checked).toBe(true)
    expect(choices.find((c) => c.value === 'cherry')?.checked).toBe(true)
    expect(choices.find((c) => c.value === 'banana')?.checked).toBe(false)
  })

  it('tracks each selected item once on submit', async () => {
    const storage = new MemoryStorage()
    mockCheckbox.mockResolvedValueOnce(['apple', 'cherry'])
    await pickem.checkbox(items, {
      searchable: false,
      track: { storage },
    })
    const data = await storage.read()
    expect(data['Apple']?.count).toBe(1)
    expect(data['Cherry']?.count).toBe(1)
    expect(data['Banana']).toBeUndefined()
  })

  it('invokes onSelect for each selected item', async () => {
    mockCheckbox.mockResolvedValueOnce(['apple', 'cherry'])
    const onSelect = vi.fn()
    await pickem.checkbox(items, { searchable: false, onSelect })
    expect(onSelect).toHaveBeenCalledTimes(2)
    expect(onSelect).toHaveBeenCalledWith(items[0])
    expect(onSelect).toHaveBeenCalledWith(items[2])
  })

  it('sorts by usage when tracking is enabled', async () => {
    const storage = new MemoryStorage()
    await storage.write({
      Banana: { count: 5, lastUsed: Date.now() },
      Apple: { count: 1, lastUsed: Date.now() - 1000 },
    })
    mockCheckbox.mockResolvedValueOnce([])
    await pickem.checkbox(items, { searchable: false, track: { storage } })
    const call = mockCheckbox.mock.calls[0][0]
    const choices = call.choices as Array<{ value: string }>
    expect(choices.map((c) => c.value)).toEqual(['banana', 'apple', 'cherry'])
  })
})

describe('pickem.checkbox (searchable path, default)', () => {
  const items: PickItem[] = [
    { label: 'Apple', value: 'apple' },
    { label: 'Banana', value: 'banana' },
  ]

  it('uses the searchable prompt by default', async () => {
    mockSearchable.mockResolvedValueOnce(['apple'])
    const result = await pickem.checkbox(items)
    expect(result).toEqual(['apple'])
    expect(mockSearchable).toHaveBeenCalledTimes(1)
    expect(mockCheckbox).not.toHaveBeenCalled()
  })

  it('passes message, items, pageSize, required, defaultChecked, searchFn, formatFn', async () => {
    mockSearchable.mockResolvedValueOnce([])
    await pickem.checkbox(items, {
      message: 'Pick:',
      pageSize: 30,
      required: true,
      defaultChecked: ['apple'],
    })
    const call = mockSearchable.mock.calls[0][0]
    expect(call.message).toBe('Pick:')
    expect(call.pageSize).toBe(30)
    expect(call.required).toBe(true)
    expect(call.defaultChecked).toEqual(['apple'])
    expect(call.items).toBe(items) // unsorted, no tracker
    expect(typeof call.searchFn).toBe('function')
    expect(typeof call.formatFn).toBe('function')
  })

  it('routes to standard checkbox when searchable: false', async () => {
    mockCheckbox.mockResolvedValueOnce([])
    await pickem.checkbox(items, { searchable: false })
    expect(mockCheckbox).toHaveBeenCalledTimes(1)
    expect(mockSearchable).not.toHaveBeenCalled()
  })

  it('tracks selected items from the searchable path', async () => {
    const storage = new MemoryStorage()
    mockSearchable.mockResolvedValueOnce(['banana'])
    await pickem.checkbox(items, { track: { storage } })
    const data = await storage.read()
    expect(data['Banana']?.count).toBe(1)
  })

  it('passes allowFreeText through to searchable prompt', async () => {
    mockSearchable.mockResolvedValueOnce([])
    await pickem.checkbox(items, { allowFreeText: true })
    const call = mockSearchable.mock.calls[0][0]
    expect(call.allowFreeText).toBe(true)
  })

  it('defaults allowFreeText to false on searchable path', async () => {
    mockSearchable.mockResolvedValueOnce([])
    await pickem.checkbox(items, {})
    const call = mockSearchable.mock.calls[0][0]
    expect(call.allowFreeText).toBe(false)
  })
})
