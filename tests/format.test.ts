import { describe, it, expect } from 'vitest'
import { createFormatter } from '../src/display/format.js'
import type { PickItem, UsageStats } from '../src/types.js'

describe('createFormatter', () => {
  it('omits badge by default (badgeStyle: none)', () => {
    const format = createFormatter()
    const item: PickItem = { label: 'Deploy', value: 'deploy', group: 'npm' }
    const result = format(item, null)
    expect(result).toContain('Deploy')
    expect(result).not.toContain('[npm]')
    expect(result).not.toContain('●')
  })

  it('renders bracket badge when explicitly set', () => {
    const format = createFormatter({ badgeStyle: 'bracket' })
    const item: PickItem = { label: 'Deploy', value: 'deploy', group: 'npm' }
    const result = format(item, null)
    expect(result).toContain('[npm]')
    expect(result).toContain('Deploy')
  })

  it('renders dot badge when set', () => {
    const format = createFormatter({ badgeStyle: 'dot' })
    const item: PickItem = { label: 'Deploy', value: 'deploy', group: 'npm' }
    const result = format(item, null)
    expect(result).toContain('●')
    expect(result).toContain('Deploy')
  })

  it('renders no badge when style is explicitly none', () => {
    const format = createFormatter({ badgeStyle: 'none' })
    const item: PickItem = { label: 'Deploy', value: 'deploy', group: 'npm' }
    const result = format(item, null)
    expect(result).not.toContain('[npm]')
    expect(result).not.toContain('●')
  })

  it('renders usage count when present', () => {
    const format = createFormatter()
    const item: PickItem = { label: 'Deploy', value: 'deploy' }
    const stats: UsageStats = { count: 5, lastUsed: Date.now() }
    const result = format(item, stats)
    expect(result).toContain('5x')
  })

  it('omits usage count when zero', () => {
    const format = createFormatter()
    const item: PickItem = { label: 'Deploy', value: 'deploy' }
    const stats: UsageStats = { count: 0, lastUsed: 0 }
    const result = format(item, stats)
    expect(result).not.toContain('(0)')
  })

  it('renders description', () => {
    const format = createFormatter()
    const item: PickItem = { label: 'Deploy', value: 'deploy', description: 'Push to prod' }
    const result = format(item, null)
    expect(result).toContain('Push to prod')
  })

  it('supports custom badge style function', () => {
    const format = createFormatter({
      badgeStyle: (group) => `<${group}> `,

    })
    const item: PickItem = { label: 'Deploy', value: 'deploy', group: 'npm' }
    const result = format(item, null)
    expect(result).toContain('<npm>')
  })
})
