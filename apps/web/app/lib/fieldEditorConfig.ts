/**
 * Field Editor Configuration
 *
 * Maps PropertyFieldId × EntityType → the editor type, options, input type,
 * placeholder, and display formatter needed by EntityFieldEditor.vue.
 *
 * This is the single source of truth for how each field should be edited
 * inline — used by dialog property pills, table cells, and card badges alike.
 */

import type { EntityType, PropertyFieldId } from '~/types/entity'
import {
  PRIORITY_OPTIONS,
  URGENCY_OPTIONS,
  TASK_STATUS_OPTIONS,
  TRIP_STATUS_OPTIONS,
  PAYMENT_STATUS_OPTIONS,
  SPRINT_STATUS_OPTIONS,
  BUDGET_STATUS_OPTIONS,
  EVENT_TYPE_OPTIONS,
  TRANSPORT_OPTIONS,
  CURRENCY_OPTIONS,
  CATEGORY_OPTIONS,
} from '~/types/entity'

// ── Editor types ─────────────────────────────────────────────────────────────

export type FieldEditorType =
  | 'text'        // single-line text input
  | 'number'      // numeric input
  | 'email'       // email input with validation
  | 'url'         // url input with validation
  | 'tel'         // phone number input
  | 'date'        // date picker
  | 'select'      // single-select from options
  | 'toggle'      // boolean switch/checkbox
  | 'owner'       // owner/person picker
  | 'tags'        // tag chips editor
  | 'readonly'    // display-only (formulas, computed)

export interface SelectOption {
  value: string
  label: string
  icon?: string
  color?: string
}

export interface FieldEditorConfig {
  editorType: FieldEditorType
  options?: SelectOption[]
  placeholder?: string
  inputType?: string
  /** Format the raw value for display in the trigger button */
  formatDisplay?: (_value: unknown) => string
}

// ── Status options vary by entity type ───────────────────────────────────────

const STATUS_OPTIONS_BY_TYPE: Partial<Record<EntityType, SelectOption[]>> = {
  task: TASK_STATUS_OPTIONS.map(o => ({ value: o.value, label: o.label, icon: o.icon, color: o.color })),
  sprint: SPRINT_STATUS_OPTIONS.map(o => ({ value: o.value, label: o.label, icon: o.icon, color: o.color })),
  budget: BUDGET_STATUS_OPTIONS.map(o => ({ value: o.value, label: o.label, icon: o.icon, color: o.color })),
}

/** Default task-like status options for types that don't have their own */
const DEFAULT_STATUS_OPTIONS = TASK_STATUS_OPTIONS.map(o => ({
  value: o.value, label: o.label, icon: o.icon, color: o.color,
}))

// ── Static field configs (independent of entity type) ────────────────────────

const STATIC_CONFIGS: Partial<Record<PropertyFieldId, FieldEditorConfig>> = {
  priority: {
    editorType: 'select',
    options: PRIORITY_OPTIONS.map(o => ({ value: o.value, label: o.label, icon: o.icon, color: o.color })),
    placeholder: 'Priority',
  },
  urgency: {
    editorType: 'select',
    options: URGENCY_OPTIONS.map(o => ({ value: o.value, label: o.label, icon: o.icon, color: o.color })),
    placeholder: 'Urgency',
  },
  category: {
    editorType: 'select',
    options: CATEGORY_OPTIONS.map(o => ({ value: o.value, label: o.label, icon: o.icon })),
    placeholder: 'Category',
  },
  owner: {
    editorType: 'owner',
    placeholder: 'Owner',
  },
  tags: {
    editorType: 'tags',
    placeholder: 'Tags',
  },

  // Scheduling
  startDate: { editorType: 'date', placeholder: 'Start date' },
  endDate: { editorType: 'date', placeholder: 'End date' },
  targetDate: { editorType: 'date', placeholder: 'Target date' },
  allDay: { editorType: 'toggle', placeholder: 'All day' },
  timeRange: { editorType: 'text', placeholder: 'e.g. 9:00 AM – 5:00 PM' },

  // Toggles
  pin: { editorType: 'toggle', placeholder: 'Pin' },
  recurring: { editorType: 'toggle', placeholder: 'Recurring' },
  achieved: { editorType: 'toggle', placeholder: 'Achieved' },

  // Type-specific selects
  eventSubtype: {
    editorType: 'select',
    options: EVENT_TYPE_OPTIONS.map(o => ({ value: o.value, label: o.label, icon: o.icon, color: o.color })),
    placeholder: 'Event type',
  },
  transportation: {
    editorType: 'select',
    options: TRANSPORT_OPTIONS.map(o => ({ value: o.value, label: o.label, icon: o.icon })),
    placeholder: 'Transport',
  },
  tripStatus: {
    editorType: 'select',
    options: TRIP_STATUS_OPTIONS.map(o => ({ value: o.value, label: o.label, icon: o.icon, color: o.color })),
    placeholder: 'Trip status',
  },
  paymentStatus: {
    editorType: 'select',
    options: PAYMENT_STATUS_OPTIONS.map(o => ({ value: o.value, label: o.label, icon: o.icon, color: o.color })),
    placeholder: 'Payment status',
  },
  sprintStatus: {
    editorType: 'select',
    options: SPRINT_STATUS_OPTIONS.map(o => ({ value: o.value, label: o.label, icon: o.icon, color: o.color })),
    placeholder: 'Sprint status',
  },
  budgetStatus: {
    editorType: 'select',
    options: BUDGET_STATUS_OPTIONS.map(o => ({ value: o.value, label: o.label, icon: o.icon, color: o.color })),
    placeholder: 'Budget status',
  },
  currency: {
    editorType: 'select',
    options: CURRENCY_OPTIONS.map(o => ({ value: o.value, label: o.label })),
    placeholder: 'Currency',
  },
  budgetCurrency: {
    editorType: 'select',
    options: CURRENCY_OPTIONS.map(o => ({ value: o.value, label: o.label })),
    placeholder: 'Currency',
  },

  // Type-specific text inputs
  payee: { editorType: 'text', placeholder: 'Payee name...' },
  invoiceNumber: { editorType: 'text', placeholder: 'Invoice #...' },
  origin: { editorType: 'text', placeholder: 'Origin...' },
  destination: { editorType: 'text', placeholder: 'Destination...' },
  confirmationNumber: { editorType: 'text', placeholder: 'Confirmation #...' },
  sprintGoal: { editorType: 'text', placeholder: 'Sprint goal...' },
  projectId: { editorType: 'text', placeholder: 'Project ID...' },
  metric: { editorType: 'text', placeholder: 'Metric name...' },
  location: { editorType: 'text', placeholder: 'Location...' },

  // Type-specific number inputs
  amount: { editorType: 'number', placeholder: '0.00' },
  budgetAmount: { editorType: 'number', placeholder: '0.00' },
  velocity: { editorType: 'number', placeholder: '0' },
  currentValue: { editorType: 'number', placeholder: '0' },
  targetValue: { editorType: 'number', placeholder: '0' },
  tripBudget: { editorType: 'number', placeholder: '0.00' },

  // Type field is special — handled by entity type picker in dialogs only
  type: { editorType: 'readonly' },
  folder: { editorType: 'text', placeholder: 'Folder...' },
  involved: { editorType: 'readonly' },
}

// ── Property key resolver ────────────────────────────────────────────────────

/**
 * Map a PropertyFieldId to the actual entity property key.
 *
 * Most field IDs map 1:1 to their entity property name, but `status` is
 * polymorphic — tasks use `taskStatus`, trips use `tripStatus`, etc.
 */
export function resolvePropertyKey(
  fieldId: PropertyFieldId,
  entityType?: EntityType,
): string {
  if (fieldId === 'status') {
    switch (entityType) {
      case 'trip': return 'tripStatus'
      case 'payment': return 'paymentStatus'
      case 'sprint': return 'sprintStatus'
      case 'budget': return 'budgetStatus'
      default: return 'taskStatus'
    }
  }
  return fieldId
}

// ── Resolver ─────────────────────────────────────────────────────────────────

/**
 * Resolve the editor configuration for a field on a given entity type.
 * Returns the editor type, options, placeholder, etc.
 */
export function resolveFieldEditorConfig(
  fieldId: PropertyFieldId,
  entityType?: EntityType,
): FieldEditorConfig {
  // Status is special — options depend on entity type
  if (fieldId === 'status') {
    const options = (entityType && STATUS_OPTIONS_BY_TYPE[entityType]) || DEFAULT_STATUS_OPTIONS
    return { editorType: 'select', options, placeholder: 'Status' }
  }

  const config = STATIC_CONFIGS[fieldId]
  if (config) return config

  // Fallback: treat unknown fields as text
  return { editorType: 'text', placeholder: fieldId }
}
