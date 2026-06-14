import { describe, it, expect } from 'vitest'
import { defineSource, loadSources } from '../src/source/source.js'
import type { PickItem } from '../src/types.js'

describe('defineSource', () => {
  it('creates a source with name and load function', () => {
    const source = defineSource('test', async () => [
      { label: 'A', value: 'a' },
    ])
    expect(source.name).toBe('test')
    expect(typeof source.load).toBe('function')
  })
})

describe('loadSources', () => {
  it('loads items from multiple sources in parallel', async () => {
    const s1 = defineSource('npm', async () => [
      { label: 'build', value: 'build' },
      { label: 'test', value: 'test' },
    ])
    const s2 = defineSource('scripts', async () => [
      { label: 'deploy', value: 'deploy' },
    ])

    const items = await loadSources([s1, s2])
    expect(items).toHaveLength(3)
  })

  it('sets group to source name when not already set', async () => {
    const source = defineSource('npm', async () => [
      { label: 'build', value: 'build' },
      { label: 'special', value: 'special', group: 'custom' },
    ])

    const items = await loadSources([source])
    expect(items[0].group).toBe('npm')
    expect(items[1].group).toBe('custom')
  })

  it('handles empty sources', async () => {
    const source = defineSource('empty', async () => [])
    const items = await loadSources([source])
    expect(items).toHaveLength(0)
  })
})
