import { describe, it, expect } from 'vitest'
import { createSearchFn } from '../src/search/search.js'
import type { PickItem } from '../src/types.js'

describe('createSearchFn', () => {
  const items: PickItem[] = [
    { label: 'Deploy Production', value: 'deploy', description: 'Push to prod' },
    { label: 'Run Tests', value: 'test', description: 'Execute test suite' },
    { label: 'Lint Code', value: 'lint', description: 'Check formatting' },
  ]

  it('matches on label by default', () => {
    const search = createSearchFn()
    expect(search(items[0], 'deploy')).toBe(true)
    expect(search(items[0], 'test')).toBe(false)
  })

  it('matches on description by default', () => {
    const search = createSearchFn()
    expect(search(items[0], 'prod')).toBe(true)
  })

  it('is case insensitive', () => {
    const search = createSearchFn()
    expect(search(items[0], 'DEPLOY')).toBe(true)
    expect(search(items[0], 'Deploy')).toBe(true)
  })

  it('matches multiple terms (all must match)', () => {
    const search = createSearchFn()
    expect(search(items[0], 'deploy prod')).toBe(true)
    expect(search(items[0], 'deploy test')).toBe(false)
  })

  it('respects searchText override', () => {
    const item: PickItem = {
      label: 'Secret',
      value: 'x',
      searchText: 'findme keyword',
    }
    const search = createSearchFn()
    expect(search(item, 'findme')).toBe(true)
    expect(search(item, 'Secret')).toBe(false)
  })

  it('searches custom fields including meta dot-notation', () => {
    const item: PickItem = {
      label: 'Deploy',
      value: 'deploy',
      meta: { tags: { env: 'production' } },
    }
    const search = createSearchFn(['label', 'tags.env'])
    expect(search(item, 'production')).toBe(true)
  })

  it('handles empty search term', () => {
    const search = createSearchFn()
    expect(search(items[0], '')).toBe(true)
    expect(search(items[0], '   ')).toBe(true)
  })
})
