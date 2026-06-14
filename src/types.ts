export interface PickItem<V = string> {
  label: string
  value: V
  description?: string
  group?: string
  pin?: 'first' | 'last'
  meta?: Record<string, any>
  searchText?: string
}

export interface PickOptions<V = string> {
  message?: string
  pageSize?: number
  track?: boolean | TrackOptions
  searchFields?: string[]
  search?: (item: PickItem<V>, term: string) => boolean
  format?: (item: PickItem<V>, stats: UsageStats | null) => string
  badgeStyle?: 'none' | 'bracket' | 'dot' | ((group: string) => string)
  badgeColors?: Record<string, string>
  sort?: (a: PickItem<V>, b: PickItem<V>) => number
  onSelect?: (item: PickItem<V>) => void | Promise<void>
  /** When true, surface typed text as a selectable option when no results match */
  allowFreeText?: boolean
  /** When false, falls back to a non-search select prompt. Default true. */
  searchable?: boolean
}

export interface CheckboxOptions<V = string> extends PickOptions<V> {
  /** Require at least one selection before Enter submits. Default false. */
  required?: boolean
  /** Pre-checked values. */
  defaultChecked?: V[]
  /**
   * When true, typing text that matches no existing items and pressing Enter
   * appends the typed text as a new checked item; the filter clears and the
   * prompt stays open so the user can continue. Multi-select Enter normally
   * submits; allowFreeText overloads Enter only when there are zero matches.
   */
  allowFreeText?: boolean
}

export interface TrackOptions {
  storePath?: string
  namespace?: string
  key?: (item: PickItem<any>) => string
  storage?: UsageStorage
  source?: string
}

export interface UsageStats { count: number; lastUsed: number }
export interface UsageRecord { count: number; lastUsed: number; source?: string }
export interface UsageData { [key: string]: UsageRecord }
export interface UsageStorage {
  read(): Promise<UsageData>
  write(data: UsageData): Promise<void>
}

export interface Source<V = string> {
  name: string
  load: () => Promise<PickItem<V>[]>
}

// Wizard types

export interface WizardContext { [key: string]: any }

export type WizardStep<V = string> =
  | PickStep<V>
  | CheckboxStep<V>
  | SelectStep
  | InputStep
  | ConfirmStep
  | BranchStep

interface BaseStep {
  id: string
  when?: (ctx: WizardContext) => boolean | Promise<boolean>
  before?: (ctx: WizardContext) => void | Promise<void>
}

export interface PickStep<V = string> extends BaseStep {
  type: 'pick'
  message?: string
  items: PickItem<V>[] | ((ctx: WizardContext) => PickItem<V>[] | Promise<PickItem<V>[]>)
  options?: Omit<PickOptions<V>, 'message'>
}

export interface CheckboxStep<V = string> extends BaseStep {
  type: 'checkbox'
  message?: string
  items: PickItem<V>[] | ((ctx: WizardContext) => PickItem<V>[] | Promise<PickItem<V>[]>)
  options?: Omit<CheckboxOptions<V>, 'message'>
}

export interface SelectStep extends BaseStep {
  type: 'select'
  message?: string
  choices: SelectChoice[] | ((ctx: WizardContext) => SelectChoice[] | Promise<SelectChoice[]>)
}

export interface SelectChoice { label: string; value: string; description?: string }

export interface InputStep extends BaseStep {
  type: 'input'
  message?: string
  default?: string | ((ctx: WizardContext) => string)
  validate?: (value: string, ctx: WizardContext) => boolean | string | Promise<boolean | string>
}

export interface ConfirmStep extends BaseStep {
  type: 'confirm'
  message?: string
  default?: boolean
}

export interface BranchStep extends BaseStep {
  type: 'branch'
  on: (ctx: WizardContext) => string | WizardStep[] | Promise<string | WizardStep[]>
}
