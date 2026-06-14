import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { dirname } from 'node:path'
import { homedir } from 'node:os'
import type { UsageData, UsageStorage } from '../types.js'

function expandHome(p: string): string {
  if (p.startsWith('~/') || p === '~') {
    return p.replace('~', homedir())
  }
  return p
}

export class JsonFileStorage implements UsageStorage {
  private path: string

  constructor(path: string) {
    this.path = expandHome(path)
  }

  async read(): Promise<UsageData> {
    try {
      const raw = await readFile(this.path, 'utf-8')
      return JSON.parse(raw) as UsageData
    } catch {
      return {}
    }
  }

  async write(data: UsageData): Promise<void> {
    try {
      await mkdir(dirname(this.path), { recursive: true })
      await writeFile(this.path, JSON.stringify(data, null, 2) + '\n', 'utf-8')
    } catch {
      // Silent failure — usage tracking should never crash the picker
    }
  }
}

export class MemoryStorage implements UsageStorage {
  private data: UsageData = {}

  async read(): Promise<UsageData> {
    return { ...this.data }
  }

  async write(data: UsageData): Promise<void> {
    this.data = { ...data }
  }
}
