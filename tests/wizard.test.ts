import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { WizardStep, WizardContext } from '../src/types.js'

vi.mock('../src/prompts/select.js', () => ({ selectPicker: vi.fn() }))
vi.mock('../src/prompts/input.js', () => ({ inputPicker: vi.fn() }))
vi.mock('../src/prompts/confirm.js', () => ({ confirmPicker: vi.fn() }))

vi.mock('../src/pickem.js', () => {
  const fn = vi.fn() as any
  fn.checkbox = vi.fn()
  fn.from = vi.fn()
  return { pickem: fn }
})

import { wizard } from '../src/wizard.js'
import { selectPicker } from '../src/prompts/select.js'
import { inputPicker } from '../src/prompts/input.js'
import { confirmPicker } from '../src/prompts/confirm.js'
import { pickem } from '../src/pickem.js'

const mockPickem = vi.mocked(pickem)
const mockSelect = vi.mocked(selectPicker)
const mockInput = vi.mocked(inputPicker)
const mockConfirm = vi.mocked(confirmPicker)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('wizard', () => {
  it('returns empty context for no steps', async () => {
    const result = await wizard([])
    expect(result).toEqual({})
  })

  it('passes initial context through', async () => {
    mockInput.mockResolvedValueOnce('hello')
    const result = await wizard(
      [{ id: 'name', type: 'input', message: 'Name?' }],
      { existing: 'value' },
    )
    expect(result.existing).toBe('value')
    expect(result.name).toBe('hello')
  })

  describe('pick step', () => {
    it('executes pick step with static items', async () => {
      const items = [
        { label: 'Deploy', value: 'deploy' },
        { label: 'Test', value: 'test' },
      ]
      mockPickem.mockResolvedValueOnce('deploy')

      const result = await wizard([
        { id: 'action', type: 'pick', message: 'Pick:', items },
      ])

      expect(mockPickem).toHaveBeenCalledWith(items, { message: 'Pick:' })
      expect(result.action).toBe('deploy')
    })

    it('executes pick step with dynamic items', async () => {
      const items = [{ label: 'A', value: 'a' }]
      mockPickem.mockResolvedValueOnce('a')

      const result = await wizard([
        { id: 'choice', type: 'pick', items: () => items },
      ])

      expect(result.choice).toBe('a')
    })
  })

  describe('select step', () => {
    it('executes select step', async () => {
      mockSelect.mockResolvedValueOnce('prod')

      const result = await wizard([
        {
          id: 'env',
          type: 'select',
          message: 'Env:',
          choices: [
            { label: 'Production', value: 'prod' },
            { label: 'Local', value: 'local' },
          ],
        },
      ])

      expect(result.env).toBe('prod')
      expect(mockSelect).toHaveBeenCalledWith({
        message: 'Env:',
        choices: [
          { name: 'Production', value: 'prod', description: undefined },
          { name: 'Local', value: 'local', description: undefined },
        ],
      })
    })

    it('executes select with dynamic choices', async () => {
      mockSelect.mockResolvedValueOnce('b')

      const result = await wizard([
        {
          id: 'val',
          type: 'select',
          choices: (ctx) => [{ label: 'B', value: 'b' }],
        },
      ])

      expect(result.val).toBe('b')
    })
  })

  describe('input step', () => {
    it('executes input step', async () => {
      mockInput.mockResolvedValueOnce('my-flags')

      const result = await wizard([
        { id: 'flags', type: 'input', message: 'Flags:' },
      ])

      expect(result.flags).toBe('my-flags')
      expect(mockInput).toHaveBeenCalledWith({
        message: 'Flags:',
        default: undefined,
        validate: undefined,
      })
    })

    it('supports dynamic default from context', async () => {
      mockInput.mockResolvedValueOnce('val')
      mockInput.mockResolvedValueOnce('from-first')

      await wizard([
        { id: 'first', type: 'input', message: 'First:' },
        {
          id: 'second',
          type: 'input',
          message: 'Second:',
          default: (ctx) => ctx.first,
        },
      ])

      const secondCall = mockInput.mock.calls[1][0]
      expect(secondCall.default).toBe('val')
    })
  })

  describe('confirm step', () => {
    it('executes confirm step', async () => {
      mockConfirm.mockResolvedValueOnce(true)

      const result = await wizard([
        { id: 'ok', type: 'confirm', message: 'Continue?' },
      ])

      expect(result.ok).toBe(true)
      expect(mockConfirm).toHaveBeenCalledWith({
        message: 'Continue?',
        default: undefined,
      })
    })
  })

  describe('checkbox step', () => {
    it('executes checkbox step with static items', async () => {
      const items = [
        { label: 'Apple', value: 'apple' },
        { label: 'Banana', value: 'banana' },
      ]
      ;(pickem as any).checkbox.mockResolvedValueOnce(['apple', 'banana'])

      const result = await wizard([
        { id: 'fruits', type: 'checkbox', message: 'Pick:', items },
      ])

      expect((pickem as any).checkbox).toHaveBeenCalledWith(items, { message: 'Pick:' })
      expect(result.fruits).toEqual(['apple', 'banana'])
    })

    it('executes checkbox step with dynamic items', async () => {
      ;(pickem as any).checkbox.mockResolvedValueOnce([])
      const result = await wizard([
        { id: 'fruits', type: 'checkbox', items: () => [{ label: 'X', value: 'x' }] },
      ])
      expect(result.fruits).toEqual([])
    })

    it('passes options to pickem.checkbox', async () => {
      ;(pickem as any).checkbox.mockResolvedValueOnce(['a'])
      await wizard([
        {
          id: 'fruits',
          type: 'checkbox',
          message: 'M:',
          items: [{ label: 'A', value: 'a' }],
          options: { required: true, pageSize: 30 },
        },
      ])
      expect((pickem as any).checkbox).toHaveBeenCalledWith(
        [{ label: 'A', value: 'a' }],
        { message: 'M:', required: true, pageSize: 30 },
      )
    })
  })

  describe('when condition', () => {
    it('skips step when condition returns false', async () => {
      mockInput.mockResolvedValueOnce('hello')

      const result = await wizard([
        { id: 'skipped', type: 'input', when: () => false },
        { id: 'included', type: 'input', message: 'Hi:' },
      ])

      expect(result.skipped).toBeUndefined()
      expect(result.included).toBe('hello')
      expect(mockInput).toHaveBeenCalledTimes(1)
    })

    it('runs step when condition returns true', async () => {
      mockInput.mockResolvedValueOnce('a')
      mockInput.mockResolvedValueOnce('b')

      const result = await wizard([
        { id: 'first', type: 'input' },
        { id: 'second', type: 'input', when: () => true },
      ])

      expect(result.second).toBe('b')
      expect(mockInput).toHaveBeenCalledTimes(2)
    })

    it('when condition receives context from previous steps', async () => {
      mockConfirm.mockResolvedValueOnce(true)
      mockInput.mockResolvedValueOnce('details')

      const result = await wizard([
        { id: 'verbose', type: 'confirm', message: 'Verbose?' },
        {
          id: 'extra',
          type: 'input',
          message: 'Details:',
          when: (ctx) => ctx.verbose === true,
        },
      ])

      expect(result.extra).toBe('details')
    })
  })

  describe('before hook', () => {
    it('runs before hook prior to step execution', async () => {
      const order: string[] = []
      mockInput.mockImplementation(async () => {
        order.push('input')
        return 'val'
      })

      await wizard([
        {
          id: 'test',
          type: 'input',
          before: () => {
            order.push('before')
          },
        },
      ])

      expect(order).toEqual(['before', 'input'])
    })

    it('before hook can modify context', async () => {
      mockInput.mockResolvedValueOnce('result')

      const result = await wizard([
        {
          id: 'step',
          type: 'input',
          before: (ctx) => {
            ctx.injected = 42
          },
        },
      ])

      expect(result.injected).toBe(42)
    })
  })

  describe('branch step', () => {
    it('branches to done to end wizard early', async () => {
      mockInput.mockResolvedValueOnce('first')

      const result = await wizard([
        { id: 'a', type: 'input' },
        { id: 'gate', type: 'branch', on: () => 'done' },
        { id: 'b', type: 'input' },
      ])

      expect(result.a).toBe('first')
      expect(result.b).toBeUndefined()
      expect(mockInput).toHaveBeenCalledTimes(1)
    })

    it('branches to a named step by id', async () => {
      mockInput.mockResolvedValueOnce('first')
      mockInput.mockResolvedValueOnce('third')

      const result = await wizard([
        { id: 'a', type: 'input', message: 'A:' },
        { id: 'gate', type: 'branch', on: () => 'c' },
        { id: 'b', type: 'input', message: 'B:' },
        { id: 'c', type: 'input', message: 'C:' },
      ])

      expect(result.a).toBe('first')
      expect(result.b).toBeUndefined()
      expect(result.c).toBe('third')
    })

    it('injects dynamic steps from branch', async () => {
      mockInput.mockResolvedValueOnce('injected-val')
      mockInput.mockResolvedValueOnce('after')

      const dynamicSteps: WizardStep[] = [
        { id: 'dynamic', type: 'input', message: 'Dynamic:' },
      ]

      const result = await wizard([
        { id: 'gate', type: 'branch', on: () => dynamicSteps },
        { id: 'after', type: 'input', message: 'After:' },
      ])

      expect(result.dynamic).toBe('injected-val')
      expect(result.after).toBe('after')
    })

    it('branch with context-dependent routing', async () => {
      mockConfirm.mockResolvedValueOnce(false)
      mockInput.mockResolvedValueOnce('fallback-val')

      const result = await wizard([
        { id: 'advanced', type: 'confirm', message: 'Advanced?' },
        {
          id: 'route',
          type: 'branch',
          on: (ctx) => (ctx.advanced ? 'advanced_step' : 'simple_step'),
        },
        { id: 'advanced_step', type: 'input', message: 'Advanced:' },
        { id: 'simple_step', type: 'input', message: 'Simple:' },
      ])

      expect(result.advanced).toBe(false)
      expect(result.advanced_step).toBeUndefined()
      expect(result.simple_step).toBe('fallback-val')
    })
  })

  describe('multi-step flow', () => {
    it('runs a full wizard flow with multiple step types', async () => {
      mockPickem.mockResolvedValueOnce('deploy')
      mockInput.mockResolvedValueOnce('--force')
      mockSelect.mockResolvedValueOnce('prod')
      mockConfirm.mockResolvedValueOnce(true)

      const result = await wizard([
        {
          id: 'script',
          type: 'pick',
          message: 'Select:',
          items: [
            { label: 'Deploy', value: 'deploy' },
            { label: 'Test', value: 'test' },
          ],
        },
        { id: 'flags', type: 'input', message: 'Flags:' },
        {
          id: 'env',
          type: 'select',
          message: 'Env:',
          choices: [
            { label: 'Prod', value: 'prod' },
            { label: 'Local', value: 'local' },
          ],
        },
        { id: 'proceed', type: 'confirm', message: 'Go?' },
      ])

      expect(result).toEqual({
        script: 'deploy',
        flags: '--force',
        env: 'prod',
        proceed: true,
      })
    })
  })
})
