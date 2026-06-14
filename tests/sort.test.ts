import { describe, it, expect } from 'vitest'
import { sortByUsage } from '../src/usage/sort.js'
import type { PickItem, UsageData } from '../src/types.js'

describe('sortByUsage', () => {
  const items: PickItem[] = [
    { label: 'alpha', value: 'a' },
    { label: 'beta', value: 'b' },
    { label: 'gamma', value: 'c' },
    { label: 'delta', value: 'd' },
  ]

  it('sorts by count descending', () => {
    const usage: UsageData = {
      gamma: { count: 10, lastUsed: 1000 },
      alpha: { count: 5, lastUsed: 1000 },
      beta: { count: 1, lastUsed: 1000 },
    }
    const sorted = sortByUsage(items, usage)
    expect(sorted.map((i) => i.label)).toEqual(['gamma', 'alpha', 'beta', 'delta'])
  })

  it('breaks count ties by lastUsed descending', () => {
    const usage: UsageData = {
      alpha: { count: 5, lastUsed: 2000 },
      beta: { count: 5, lastUsed: 3000 },
    }
    const sorted = sortByUsage(items, usage)
    expect(sorted[0].label).toBe('beta')
    expect(sorted[1].label).toBe('alpha')
  })

  it('breaks all ties alphabetically', () => {
    const sorted = sortByUsage(items, {})
    expect(sorted.map((i) => i.label)).toEqual(['alpha', 'beta', 'delta', 'gamma'])
  })

  it('does not mutate original array', () => {
    const original = [...items]
    sortByUsage(items, {})
    expect(items).toEqual(original)
  })

  it('supports custom key function', () => {
    const usage: UsageData = {
      a: { count: 10, lastUsed: 1000 },
    }
    const sorted = sortByUsage(items, usage, (item) => item.value)
    expect(sorted[0].label).toBe('alpha')
  })

  it('supports custom tiebreaker', () => {
    const sorted = sortByUsage(items, {}, undefined, (a, b) =>
      b.label.localeCompare(a.label),
    )
    // With no usage, all counts/lastUsed equal, tiebreaker is reverse-alpha
    expect(sorted.map((i) => i.label)).toEqual(['gamma', 'delta', 'beta', 'alpha'])
  })

  describe('pin', () => {
    it('pin: last sorts after all unpinned items', () => {
      const withPinned: PickItem[] = [
        { label: 'create', value: 'create', pin: 'last' },
        { label: 'alpha', value: 'a' },
        { label: 'beta', value: 'b' },
      ]
      const sorted = sortByUsage(withPinned, {})
      expect(sorted.map((i) => i.label)).toEqual(['alpha', 'beta', 'create'])
    })

    it('pin: first sorts before all unpinned items', () => {
      const withPinned: PickItem[] = [
        { label: 'alpha', value: 'a' },
        { label: 'beta', value: 'b' },
        { label: 'important', value: 'imp', pin: 'first' },
      ]
      const sorted = sortByUsage(withPinned, {})
      expect(sorted.map((i) => i.label)).toEqual(['important', 'alpha', 'beta'])
    })

    it('pin: last stays last even with high usage', () => {
      const withPinned: PickItem[] = [
        { label: 'create', value: 'create', pin: 'last' },
        { label: 'alpha', value: 'a' },
        { label: 'beta', value: 'b' },
      ]
      const usage: UsageData = {
        create: { count: 100, lastUsed: 9999 },
      }
      const sorted = sortByUsage(withPinned, usage)
      expect(sorted.map((i) => i.label)).toEqual(['alpha', 'beta', 'create'])
    })

    it('pin: first stays first even when unused', () => {
      const withPinned: PickItem[] = [
        { label: 'alpha', value: 'a' },
        { label: 'notice', value: 'notice', pin: 'first' },
      ]
      const usage: UsageData = {
        alpha: { count: 50, lastUsed: 9999 },
      }
      const sorted = sortByUsage(withPinned, usage)
      expect(sorted.map((i) => i.label)).toEqual(['notice', 'alpha'])
    })

    it('multiple pinned items preserve relative sort among themselves', () => {
      const withPinned: PickItem[] = [
        { label: 'exit', value: 'exit', pin: 'last' },
        { label: 'alpha', value: 'a' },
        { label: 'create', value: 'create', pin: 'last' },
      ]
      const sorted = sortByUsage(withPinned, {})
      expect(sorted.map((i) => i.label)).toEqual(['alpha', 'create', 'exit'])
    })

    it('first and last pins work together', () => {
      const withPinned: PickItem[] = [
        { label: 'exit', value: 'exit', pin: 'last' },
        { label: 'beta', value: 'b' },
        { label: 'alpha', value: 'a' },
        { label: 'notice', value: 'notice', pin: 'first' },
      ]
      const sorted = sortByUsage(withPinned, {})
      expect(sorted.map((i) => i.label)).toEqual(['notice', 'alpha', 'beta', 'exit'])
    })
  })
})
