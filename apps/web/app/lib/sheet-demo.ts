/** Demo sheet schema + seed ids (TRL-286 P0 vertical slice) */
import type { SheetColumn } from '~/types/sheet'

export const SHEET_Q3_RUNWAY_ID = 'entity:sheet-q3-runway'

export const Q3_RUNWAY_COLUMNS: SheetColumn[] = [
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
  {
    id: 'owner',
    attribute: 'ownerId',
    kind: 'relation',
    label: 'Owner',
    relationType: 'assignedTo',
  },
]

export const DEMO_PERSON_REBECCA = 'entity:person-rebecca-smith'

export const Q3_RUNWAY_QUERY =
  'FIND entity AS ?e WHERE ?e.type = "expense" AND ?e.quarter = "Q3-2026" RETURN ?e, ?e.title, ?e.category, ?e.budgeted, ?e.spent'

export const Q3_RUNWAY_EXPENSES = [
  {
    id: 'entity:expense-e2b',
    title: 'e2b.dev sandboxes',
    category: 'Infra',
    budgeted: 900,
    spent: 742.1,
    quarter: 'Q3-2026',
    ownerId: DEMO_PERSON_REBECCA,
  },
  { id: 'entity:expense-flyio', title: 'Fly.io hosting', category: 'Infra', budgeted: 360, spent: 389.4, quarter: 'Q3-2026' },
  { id: 'entity:expense-npm', title: 'npm org + domains', category: 'Infra', budgeted: 240, spent: 180, quarter: 'Q3-2026' },
  { id: 'entity:expense-housing', title: 'SF housing — July', category: 'Travel', budgeted: 2400, spent: 2400, quarter: 'Q3-2026' },
  { id: 'entity:expense-transit', title: 'Caltrain + Muni', category: 'Travel', budgeted: 150, spent: 88.25, quarter: 'Q3-2026' },
  { id: 'entity:expense-figma', title: 'Figma + tooling', category: 'Tools', budgeted: 180, spent: 165, quarter: 'Q3-2026' },
]
