import { describe, it, expect, beforeEach } from 'vitest'
import { UsageTracker } from '../src/usage/tracker.js'
import { MemoryStorage } from '../src/usage/storage.js'
import type { PickItem } from '../src/types.js'

describe('UsageTracker', () => {
  let storage: MemoryStorage
  let tracker: UsageTracker

  beforeEach(() => {
    storage = new MemoryStorage()
    tracker = new UsageTracker({ storage })
  })

  it('tracks usage and increments count', async () => {
    await tracker.track('deploy')
    await tracker.track('deploy')
    await tracker.track('test')

    const deployStats = await tracker.getStats('deploy')
    const testStats = await tracker.getStats('test')

    expect(deployStats?.count).toBe(2)
    expect(testStats?.count).toBe(1)
  })

  it('returns null for untracked keys', async () => {
    const stats = await tracker.getStats('unknown')
    expect(stats).toBeNull()
  })

  it('sorts items by usage (count desc → lastUsed desc → alpha)', async () => {
    const items: PickItem[] = [
      { label: 'alpha', value: 'a' },
      { label: 'beta', value: 'b' },
      { label: 'gamma', value: 'c' },
    ]

    await tracker.track('gamma')
    await tracker.track('gamma')
    await tracker.track('beta')

    const sorted = await tracker.sortItems(items)
    expect(sorted.map((i) => i.label)).toEqual(['gamma', 'beta', 'alpha'])
  })

  it('getTop returns most used', async () => {
    await tracker.track('a')
    await tracker.track('a')
    await tracker.track('a')
    await tracker.track('b')
    await tracker.track('b')
    await tracker.track('c')

    const top = await tracker.getTop(2)
    expect(top).toHaveLength(2)
    expect(top[0].key).toBe('a')
    expect(top[0].count).toBe(3)
    expect(top[1].key).toBe('b')
  })

  it('supports namespaces', async () => {
    const nsTracker = new UsageTracker({ storage, namespace: 'app1' })
    await nsTracker.track('deploy')

    const stats = await nsTracker.getStats('deploy')
    expect(stats?.count).toBe(1)

    // Raw storage should have prefixed key
    const raw = await storage.read()
    expect(raw['app1:deploy']).toBeDefined()
    expect(raw['deploy']).toBeUndefined()
  })

  it('records source tag', async () => {
    await tracker.track('deploy', 'agent')
    const data = await storage.read()
    expect(data['deploy'].source).toBe('agent')
  })
})
