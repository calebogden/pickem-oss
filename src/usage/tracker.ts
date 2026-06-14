import type { PickItem, UsageData, UsageRecord, UsageStats, UsageStorage } from '../types.js'
import { JsonFileStorage } from './storage.js'
import { sortByUsage } from './sort.js'

const DEFAULT_STORE_PATH = '~/.pickem/usage.json'

export interface TrackerOptions {
  storePath?: string
  namespace?: string
  storage?: UsageStorage
}

export class UsageTracker {
  private storage: UsageStorage
  private namespace: string | undefined
  private cache: UsageData | null = null

  constructor(options: TrackerOptions = {}) {
    this.storage = options.storage ?? new JsonFileStorage(options.storePath ?? DEFAULT_STORE_PATH)
    this.namespace = options.namespace
  }

  private prefixKey(key: string): string {
    return this.namespace ? `${this.namespace}:${key}` : key
  }

  async load(): Promise<UsageData> {
    if (this.cache) return this.cache
    this.cache = await this.storage.read()
    return this.cache
  }

  async track(key: string, source?: string): Promise<void> {
    const data = await this.load()
    const prefixed = this.prefixKey(key)
    const existing = data[prefixed]
    data[prefixed] = {
      count: (existing?.count ?? 0) + 1,
      lastUsed: Date.now(),
      source: source ?? existing?.source,
    }
    this.cache = data
    await this.storage.write(data)
  }

  async getStats(key: string): Promise<UsageStats | null> {
    const data = await this.load()
    const record = data[this.prefixKey(key)]
    if (!record) return null
    return { count: record.count, lastUsed: record.lastUsed }
  }

  async sortItems<V>(
    items: PickItem<V>[],
    keyFn?: (item: PickItem<V>) => string,
    tiebreaker?: (a: PickItem<V>, b: PickItem<V>) => number,
  ): Promise<PickItem<V>[]> {
    const data = await this.load()
    // If namespace, we need to remap keys for sort
    if (this.namespace) {
      const remapped: UsageData = {}
      for (const [k, v] of Object.entries(data)) {
        const prefix = `${this.namespace}:`
        if (k.startsWith(prefix)) {
          remapped[k.slice(prefix.length)] = v
        }
      }
      return sortByUsage(items, remapped, keyFn, tiebreaker)
    }
    return sortByUsage(items, data, keyFn, tiebreaker)
  }

  async getTop(n: number): Promise<Array<{ key: string; count: number; lastUsed: number }>> {
    const data = await this.load()
    const prefix = this.namespace ? `${this.namespace}:` : ''
    return Object.entries(data)
      .filter(([k]) => !this.namespace || k.startsWith(prefix))
      .map(([k, v]) => ({
        key: this.namespace ? k.slice(prefix.length) : k,
        count: v.count,
        lastUsed: v.lastUsed,
      }))
      .sort((a, b) => b.count - a.count || b.lastUsed - a.lastUsed)
      .slice(0, n)
  }
}
