/** Sheet creation templates — preconfigured query + column schema. */
import type { SheetColumn } from '~/types/sheet'

export type SheetTemplateId = 'blank' | 'budget'

export interface SheetTemplate {
  id: SheetTemplateId
  name: string
  description: string
  icon: string
  defaultTitle: string
  query: string
  columns: SheetColumn[]
}

export const BUDGET_SHEET_COLUMNS: SheetColumn[] = [
  { id: 'vendor', attribute: 'title', kind: 'text', label: 'Vendor' },
  { id: 'category', attribute: 'category', kind: 'select', label: 'Category' },
  { id: 'budgeted', attribute: 'budgeted', kind: 'number', label: 'Budgeted' },
  { id: 'spent', attribute: 'spent', kind: 'number', label: 'Spent' },
  {
    id: 'remaining',
    attribute: 'remaining',
    kind: 'formula',
    label: 'Remaining',
    formula: 'budgeted - spent',
  },
]

const BLANK_SHEET_QUERY =
  'FIND entity AS ?t WHERE ?t.type = "task" RETURN ?t.title, ?t.taskStatus LIMIT 20'

const BUDGET_SHEET_QUERY =
  'FIND entity AS ?e WHERE ?e.type = "expense" RETURN ?e, ?e.title, ?e.category, ?e.budgeted, ?e.spent'

export const SHEET_TEMPLATES: Record<SheetTemplateId, SheetTemplate> = {
  blank: {
    id: 'blank',
    name: 'Blank sheet',
    description: 'Empty projection — configure query and columns in the editor.',
    icon: 'lucide:table-2',
    defaultTitle: 'Untitled sheet',
    query: BLANK_SHEET_QUERY,
    columns: [],
  },
  budget: {
    id: 'budget',
    name: 'Budget tracker',
    description: 'Expense rows with budgeted, spent, and remaining columns.',
    icon: 'lucide:wallet',
    defaultTitle: 'Untitled budget',
    query: BUDGET_SHEET_QUERY,
    columns: BUDGET_SHEET_COLUMNS,
  },
}

export function resolveSheetTemplate(id: SheetTemplateId = 'blank'): SheetTemplate {
  return SHEET_TEMPLATES[id] ?? SHEET_TEMPLATES.blank
}

export function listSheetTemplates(): SheetTemplate[] {
  return Object.values(SHEET_TEMPLATES)
}
