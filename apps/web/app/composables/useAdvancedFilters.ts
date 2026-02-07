import { ref, computed, type Ref, type ComputedRef } from 'vue'

// ─── Field Types ───────────────────────────────────────────────
export type FilterFieldType = 'text' | 'number' | 'select' | 'multi_select' | 'date' | 'checkbox'

export interface FilterFieldDef {
  /** Unique key matching the item property */
  key: string
  /** Display label */
  label: string
  /** Field type determines available operators */
  type: FilterFieldType
  /** Icon for the field selector */
  icon?: string
  /** Options for select / multi_select fields */
  options?: { value: string; label: string }[]
}

// ─── Operators ─────────────────────────────────────────────────
export type FilterOperator =
  // text
  | 'contains'
  | 'does_not_contain'
  | 'equals'
  | 'does_not_equal'
  | 'starts_with'
  | 'ends_with'
  | 'is_empty'
  | 'is_not_empty'
  // number
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  // date
  | 'before'
  | 'after'
  | 'on'
  | 'within_last'
  // checkbox
  | 'is_true'
  | 'is_false'
  // select / multi_select
  | 'is'
  | 'is_not'

export interface OperatorDef {
  value: FilterOperator
  label: string
  /** Whether this operator needs a value input */
  needsValue: boolean
}

export const operatorsByType: Record<FilterFieldType, OperatorDef[]> = {
  text: [
    { value: 'contains', label: 'Contains', needsValue: true },
    { value: 'does_not_contain', label: 'Does not contain', needsValue: true },
    { value: 'equals', label: 'Is', needsValue: true },
    { value: 'does_not_equal', label: 'Is not', needsValue: true },
    { value: 'starts_with', label: 'Starts with', needsValue: true },
    { value: 'ends_with', label: 'Ends with', needsValue: true },
    { value: 'is_empty', label: 'Is empty', needsValue: false },
    { value: 'is_not_empty', label: 'Is not empty', needsValue: false },
  ],
  number: [
    { value: 'equals', label: '=', needsValue: true },
    { value: 'does_not_equal', label: '≠', needsValue: true },
    { value: 'gt', label: '>', needsValue: true },
    { value: 'gte', label: '≥', needsValue: true },
    { value: 'lt', label: '<', needsValue: true },
    { value: 'lte', label: '≤', needsValue: true },
    { value: 'is_empty', label: 'Is empty', needsValue: false },
    { value: 'is_not_empty', label: 'Is not empty', needsValue: false },
  ],
  select: [
    { value: 'is', label: 'Is', needsValue: true },
    { value: 'is_not', label: 'Is not', needsValue: true },
    { value: 'is_empty', label: 'Is empty', needsValue: false },
    { value: 'is_not_empty', label: 'Is not empty', needsValue: false },
  ],
  multi_select: [
    { value: 'contains', label: 'Contains', needsValue: true },
    { value: 'does_not_contain', label: 'Does not contain', needsValue: true },
    { value: 'is_empty', label: 'Is empty', needsValue: false },
    { value: 'is_not_empty', label: 'Is not empty', needsValue: false },
  ],
  date: [
    { value: 'on', label: 'Is', needsValue: true },
    { value: 'before', label: 'Is before', needsValue: true },
    { value: 'after', label: 'Is after', needsValue: true },
    { value: 'is_empty', label: 'Is empty', needsValue: false },
    { value: 'is_not_empty', label: 'Is not empty', needsValue: false },
  ],
  checkbox: [
    { value: 'is_true', label: 'Is checked', needsValue: false },
    { value: 'is_false', label: 'Is unchecked', needsValue: false },
  ],
}

// ─── Filter Rule & Group ───────────────────────────────────────
export type FilterConjunction = 'and' | 'or'

export interface FilterRule {
  id: string
  fieldKey: string
  operator: FilterOperator
  value: string
}

export interface FilterGroup {
  id: string
  conjunction: FilterConjunction
  rules: FilterRule[]
  groups: FilterGroup[]
}

export interface FilterState {
  conjunction: FilterConjunction
  rules: FilterRule[]
  groups: FilterGroup[]
}

// ─── Helpers ───────────────────────────────────────────────────
let _uid = 0
function uid(): string {
  return `f_${++_uid}_${Date.now()}`
}

export function createRule(fieldKey: string = '', operator: FilterOperator = 'contains', value: string = ''): FilterRule {
  return { id: uid(), fieldKey, operator, value }
}

export function createGroup(conjunction: FilterConjunction = 'and'): FilterGroup {
  return { id: uid(), conjunction, rules: [createRule()], groups: [] }
}

export function createEmptyState(): FilterState {
  return { conjunction: 'and', rules: [], groups: [] }
}

// ─── Evaluation ────────────────────────────────────────────────
function evaluateRule(item: any, rule: FilterRule, fields: FilterFieldDef[]): boolean {
  const field = fields.find((f) => f.key === rule.fieldKey)
  if (!field) return true

  const raw = item[rule.fieldKey]
  const op = rule.operator

  if (op === 'is_empty') return raw === undefined || raw === null || raw === ''
  if (op === 'is_not_empty') return raw !== undefined && raw !== null && raw !== ''
  if (op === 'is_true') return !!raw
  if (op === 'is_false') return !raw

  const val = rule.value

  switch (field.type) {
    case 'text': {
      const s = String(raw ?? '').toLowerCase()
      const v = val.toLowerCase()
      if (op === 'contains') return s.includes(v)
      if (op === 'does_not_contain') return !s.includes(v)
      if (op === 'equals') return s === v
      if (op === 'does_not_equal') return s !== v
      if (op === 'starts_with') return s.startsWith(v)
      if (op === 'ends_with') return s.endsWith(v)
      return true
    }
    case 'number': {
      const n = Number(raw)
      const v = Number(val)
      if (Number.isNaN(n) || Number.isNaN(v)) return true
      if (op === 'equals') return n === v
      if (op === 'does_not_equal') return n !== v
      if (op === 'gt') return n > v
      if (op === 'gte') return n >= v
      if (op === 'lt') return n < v
      if (op === 'lte') return n <= v
      return true
    }
    case 'select': {
      const s = String(raw ?? '')
      if (op === 'is') return s === val
      if (op === 'is_not') return s !== val
      return true
    }
    case 'multi_select': {
      const arr = Array.isArray(raw) ? raw.map(String) : []
      if (op === 'contains') return arr.includes(val)
      if (op === 'does_not_contain') return !arr.includes(val)
      return true
    }
    case 'date': {
      const d = raw ? new Date(raw).getTime() : NaN
      const v = val ? new Date(val).getTime() : NaN
      if (Number.isNaN(d) || Number.isNaN(v)) return true
      if (op === 'on') return new Date(raw).toDateString() === new Date(val).toDateString()
      if (op === 'before') return d < v
      if (op === 'after') return d > v
      return true
    }
    default:
      return true
  }
}

function evaluateGroup(
  item: any,
  group: { conjunction: FilterConjunction; rules: FilterRule[]; groups: FilterGroup[] },
  fields: FilterFieldDef[],
): boolean {
  const ruleResults = group.rules.filter((r) => r.fieldKey).map((r) => evaluateRule(item, r, fields))
  const groupResults = group.groups.map((g) => evaluateGroup(item, g, fields))
  const all = [...ruleResults, ...groupResults]
  if (all.length === 0) return true
  return group.conjunction === 'and' ? all.every(Boolean) : all.some(Boolean)
}

// ─── Composable ────────────────────────────────────────────────
export interface UseAdvancedFiltersOptions {
  fields: FilterFieldDef[]
}

export interface AdvancedFilterState {
  state: Ref<FilterState>
  fields: FilterFieldDef[]
  activeRuleCount: ComputedRef<number>
  hasActiveFilters: ComputedRef<boolean>
  addRule: () => void
  addGroup: () => void
  removeRule: (_ruleId: string) => void
  removeGroup: (_groupId: string) => void
  clearAll: () => void
  setConjunction: (_c: FilterConjunction) => void
  evaluate: (_item: any) => boolean
  filterItems: <T>(_items: T[]) => T[]
  activeFilterSummary: ComputedRef<{ fieldLabel: string; operator: string; displayValue: string }[]>
}

export function useAdvancedFilters(options: UseAdvancedFiltersOptions): AdvancedFilterState {
  const state = ref<FilterState>(createEmptyState())

  function countRules(s: FilterState | FilterGroup): number {
    const own = s.rules.filter((r) => r.fieldKey).length
    const nested = s.groups.reduce((sum, g) => sum + countRules(g), 0)
    return own + nested
  }

  const activeRuleCount = computed(() => countRules(state.value))
  const hasActiveFilters = computed(() => activeRuleCount.value > 0)

  function addRule() {
    state.value.rules.push(createRule(options.fields[0]?.key || ''))
  }

  function addGroup() {
    const g = createGroup(state.value.conjunction === 'and' ? 'and' : 'or')
    g.rules = [createRule(options.fields[0]?.key || '')]
    state.value.groups.push(g)
  }

  function removeRuleFromList(rules: FilterRule[], ruleId: string): boolean {
    const idx = rules.findIndex((r) => r.id === ruleId)
    if (idx !== -1) {
      rules.splice(idx, 1)
      return true
    }
    return false
  }

  function removeRule(ruleId: string) {
    if (removeRuleFromList(state.value.rules, ruleId)) return
    for (const g of state.value.groups) {
      if (removeRuleFromList(g.rules, ruleId)) return
    }
  }

  function removeGroup(groupId: string) {
    const idx = state.value.groups.findIndex((g) => g.id === groupId)
    if (idx !== -1) state.value.groups.splice(idx, 1)
  }

  function clearAll() {
    state.value = createEmptyState()
  }

  function setConjunction(c: FilterConjunction) {
    state.value.conjunction = c
  }

  function evaluate(item: any): boolean {
    return evaluateGroup(item, state.value, options.fields)
  }

  function filterItems<T>(items: T[]): T[] {
    if (!hasActiveFilters.value) return items
    return items.filter((item) => evaluate(item))
  }

  function getRuleSummary(rule: FilterRule): { fieldLabel: string; operator: string; displayValue: string } | null {
    if (!rule.fieldKey) return null
    const field = options.fields.find((f) => f.key === rule.fieldKey)
    if (!field) return null
    const opDef = operatorsByType[field.type]?.find((o) => o.value === rule.operator)
    const opLabel = opDef?.label || rule.operator
    let displayValue = rule.value
    if (field.options && rule.value) {
      const opt = field.options.find((o) => o.value === rule.value)
      if (opt) displayValue = opt.label
    }
    if (!opDef?.needsValue) displayValue = ''
    return { fieldLabel: field.label, operator: opLabel, displayValue }
  }

  const activeFilterSummary = computed(() => {
    const summaries: { fieldLabel: string; operator: string; displayValue: string }[] = []
    function collectRules(rules: FilterRule[]) {
      for (const rule of rules) {
        if (!rule.fieldKey) continue
        const field = options.fields.find((f) => f.key === rule.fieldKey)
        if (!field) continue
        const opDef = operatorsByType[field.type]?.find((o) => o.value === rule.operator)
        if (opDef?.needsValue && !rule.value) continue
        const s = getRuleSummary(rule)
        if (s) summaries.push(s)
      }
    }
    collectRules(state.value.rules)
    for (const group of state.value.groups) {
      collectRules(group.rules)
    }
    return summaries
  })

  return {
    state,
    fields: options.fields,
    activeRuleCount,
    hasActiveFilters,
    addRule,
    addGroup,
    removeRule,
    removeGroup,
    clearAll,
    setConjunction,
    evaluate,
    filterItems,
    activeFilterSummary,
  }
}
