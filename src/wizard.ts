import { selectPicker } from './prompts/select.js'
import { inputPicker } from './prompts/input.js'
import { confirmPicker } from './prompts/confirm.js'
import type {
  WizardContext,
  WizardStep,
  PickStep,
  CheckboxStep,
  SelectStep,
  InputStep,
  ConfirmStep,
  BranchStep,
} from './types.js'
import { pickem } from './pickem.js'

async function executePick<V>(step: PickStep<V>, ctx: WizardContext): Promise<any> {
  const items =
    typeof step.items === 'function' ? await step.items(ctx) : step.items

  return pickem(items, {
    message: step.message,
    ...step.options,
  })
}

async function executeCheckbox<V>(step: CheckboxStep<V>, ctx: WizardContext): Promise<any> {
  const items =
    typeof step.items === 'function' ? await step.items(ctx) : step.items

  return pickem.checkbox(items, {
    message: step.message,
    ...step.options,
  })
}

async function executeSelect(step: SelectStep, ctx: WizardContext): Promise<string> {
  const choices =
    typeof step.choices === 'function' ? await step.choices(ctx) : step.choices

  return (await selectPicker({
    message: step.message ?? 'Select:',
    choices: choices.map((c) => ({
      name: c.label,
      value: c.value,
      description: c.description,
    })),
  })) as string
}

async function executeInput(step: InputStep, ctx: WizardContext): Promise<string> {
  const defaultVal =
    typeof step.default === 'function' ? step.default(ctx) : step.default

  return inputPicker({
    message: step.message ?? 'Enter value:',
    default: defaultVal,
    validate: step.validate
      ? (value) => step.validate!(value, ctx)
      : undefined,
  })
}

async function executeConfirm(step: ConfirmStep): Promise<boolean> {
  return confirmPicker({
    message: step.message ?? 'Confirm?',
    default: step.default,
  })
}

async function executeStep(step: WizardStep, ctx: WizardContext): Promise<void> {
  // Run before hook
  if (step.before) {
    await step.before(ctx)
  }

  // Check when condition
  if (step.when) {
    const shouldRun = await step.when(ctx)
    if (!shouldRun) return
  }

  switch (step.type) {
    case 'pick':
      ctx[step.id] = await executePick(step, ctx)
      break
    case 'checkbox':
      ctx[step.id] = await executeCheckbox(step, ctx)
      break
    case 'select':
      ctx[step.id] = await executeSelect(step, ctx)
      break
    case 'input':
      ctx[step.id] = await executeInput(step, ctx)
      break
    case 'confirm':
      ctx[step.id] = await executeConfirm(step)
      break
    case 'branch':
      await executeBranch(step, ctx)
      break
  }
}

async function executeBranch(step: BranchStep, ctx: WizardContext): Promise<string | undefined> {
  const result = await step.on(ctx)

  if (Array.isArray(result)) {
    for (const dynamicStep of result) {
      await executeStep(dynamicStep, ctx)
    }
    return undefined
  }

  // Return the branch target string so the main loop can jump without touching ctx.
  return typeof result === 'string' ? result : undefined
}

export async function wizard<T extends WizardContext = WizardContext>(
  steps: WizardStep[],
  initialContext: Partial<T> = {},
): Promise<T> {
  const ctx: WizardContext = { ...initialContext }

  let i = 0
  while (i < steps.length) {
    const step = steps[i]
    let branchTarget: string | undefined

    if (step.type === 'branch') {
      branchTarget = await executeBranch(step, ctx)
    } else {
      await executeStep(step, ctx)
    }

    if (branchTarget) {
      if (branchTarget === 'done') break
      const targetIndex = steps.findIndex((s) => s.id === branchTarget)
      if (targetIndex >= 0) {
        i = targetIndex
        continue
      }
    }

    i++
  }

  return ctx as T
}
