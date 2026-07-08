import type { Entity, EntityType, PropertyFieldId } from '~/types/entity'
import { TASK_STATUS_OPTIONS } from '~/types/entity'
import { getPropertyFieldsForType, typeHasField } from '~/config/entityRegistry'
import { resolveFieldEditorConfig, resolvePropertyKey, type SelectOption } from '~/lib/fieldEditorConfig'

export interface KanbanColumn {
  id: string
  label: string
  icon?: string
  color?: string
  border: string
  bg: string
  items: Entity[]
}

/** Sentinel column source id for manual card ordering (single column). */
export const KANBAN_CUSTOM_ORDER_SOURCE_ID = '__custom_order__' as const

export interface KanbanColumnSource {
  fieldId: PropertyFieldId | typeof KANBAN_CUSTOM_ORDER_SOURCE_ID
  propertyKey: string
  label: string
  options: SelectOption[]
  /** Manual ordering — single lane, no field grouping on drag. */
  customOrder?: boolean
}

const STATUS_COLUMN_STYLE: Record<string, { border: string; bg: string }> = {
  pending: { border: 'border-slate-400', bg: 'bg-slate-400/5' },
  'in-progress': { border: 'border-blue-500', bg: 'bg-blue-500/5' },
  'on-track': { border: 'border-emerald-500', bg: 'bg-emerald-500/5' },
  'due-soon': { border: 'border-amber-500', bg: 'bg-amber-500/5' },
  overdue: { border: 'border-red-500', bg: 'bg-red-500/5' },
  completed: { border: 'border-emerald-600', bg: 'bg-emerald-600/5' },
}

function groupBy<T>(arr: T[], fn: (el: T) => string): Record<string, T[]> {
  const result: Record<string, T[]> = {}
  for (const el of arr) {
    const key = fn(el)
    ;(result[key] ||= []).push(el)
  }
  return result
}

function optionToColumn(
  option: SelectOption,
  items: Entity[] = [],
): KanbanColumn {
  return {
    id: option.value,
    label: option.label,
    icon: option.icon,
    color: option.color,
    border: STATUS_COLUMN_STYLE[option.value]?.border ?? 'border-border',
    bg: STATUS_COLUMN_STYLE[option.value]?.bg ?? 'bg-muted/5',
    items,
  }
}

export function getKanbanColumnSources(entityType?: string): KanbanColumnSource[] {
  const fieldSources: KanbanColumnSource[] = []
  if (!entityType) return fieldSources

  let fields: ReturnType<typeof getPropertyFieldsForType> = []
  try {
    fields = getPropertyFieldsForType(entityType as EntityType)
  } catch {
    return fieldSources
  }

  for (const field of fields) {
    const config = resolveFieldEditorConfig(field.id, entityType as EntityType)
    if (config.editorType !== 'select' || !config.options?.length) continue
    fieldSources.push({
      fieldId: field.id,
      propertyKey: resolvePropertyKey(field.id, entityType as EntityType),
      label: field.label,
      options: config.options,
    })
  }

  return [
    ...fieldSources,
    {
      fieldId: KANBAN_CUSTOM_ORDER_SOURCE_ID,
      propertyKey: '',
      label: 'Custom order',
      options: [],
      customOrder: true,
    },
  ]
}

export function getDefaultKanbanColumnSource(entityType?: string): KanbanColumnSource | null {
  const sources = getKanbanColumnSources(entityType)
  return sources.find((source) => source.fieldId === 'status') ?? sources[0] ?? null
}

/** Resolve the grouping key for an entity using the selected source, status, or generic status. */
export function getEntityKanbanGroupKey(
  item: Entity,
  entityType?: string,
  source?: KanbanColumnSource | null,
): string {
  if (source) {
    const value = (item as unknown as Record<string, unknown>)[source.propertyKey]
    if (value !== undefined && value !== null && value !== '') return String(value)
    return 'none'
  }

  if (entityType) {
    const statusKey = resolvePropertyKey('status', entityType as EntityType)
    const value = (item as unknown as Record<string, unknown>)[statusKey]
    if (value !== undefined && value !== null && value !== '') return String(value)
  }

  const record = item as unknown as Record<string, unknown>
  const status = record.taskStatus ?? record.status
  if (status !== undefined && status !== null && status !== '') return String(status)
  return 'none'
}

function buildOptionColumns(byGroup: Record<string, Entity[]>, options: SelectOption[]): KanbanColumn[] {
  const known = new Set(options.map((o) => o.value))

  const ordered = options.map((opt) => optionToColumn(opt, byGroup[opt.value] || []))

  const extras = Object.entries(byGroup)
    .filter(([key]) => !known.has(key) && key !== 'none')
    .map(([key, items]) => ({
      id: key,
      label: key,
      border: 'border-border',
      bg: 'bg-muted/5',
      items,
    }))

  const unassigned = byGroup.none?.length
    ? [{ id: 'none', label: 'Unassigned', border: 'border-border', bg: 'bg-muted/5', items: byGroup.none }]
    : []

  return [...ordered, ...extras, ...unassigned]
}

function buildStatusColumns(byGroup: Record<string, Entity[]>): KanbanColumn[] {
  return buildOptionColumns(byGroup, TASK_STATUS_OPTIONS)
}

function buildTypeColumns(items: Entity[]): KanbanColumn[] {
  const byType = groupBy(items, (item) => item.type || 'unknown')
  return Object.entries(byType).map(([key, columnItems]) => ({
    id: key,
    label: key,
    border: 'border-border',
    bg: 'bg-muted/5',
    items: columnItems,
  }))
}

/**
 * Group browse entities into kanban columns.
 * Prefers status grouping when the type supports status or items carry status values;
 * otherwise falls back to grouping by entity type.
 */
export function buildEntityKanbanColumns(
  items: Entity[],
  entityType?: string,
  sourceId?: PropertyFieldId | string,
): KanbanColumn[] {
  if (sourceId === KANBAN_CUSTOM_ORDER_SOURCE_ID) {
    return [{
      id: KANBAN_CUSTOM_ORDER_SOURCE_ID,
      label: 'All items',
      icon: 'lucide:list-ordered',
      border: 'border-border',
      bg: 'bg-muted/5',
      items: items.slice(),
    }]
  }

  const explicitSource = sourceId
    ? getKanbanColumnSources(entityType).find((source) => source.fieldId === sourceId)
    : null
  const defaultSource = explicitSource ?? getDefaultKanbanColumnSource(entityType)

  if (defaultSource) {
    const byGroup = groupBy(items, (item) => getEntityKanbanGroupKey(item, entityType, defaultSource))
    return buildOptionColumns(byGroup, defaultSource.options)
  }

  if (!items.length) return []

  const byGroup = groupBy(items, (item) => getEntityKanbanGroupKey(item, entityType))
  let hasStatusField = false
  try {
    hasStatusField = entityType ? typeHasField(entityType as EntityType, 'status') : false
  } catch {
    hasStatusField = false
  }
  const hasStatusValues = Object.keys(byGroup).some((key) => key !== 'none')

  if (hasStatusField || hasStatusValues) {
    return buildStatusColumns(byGroup)
  }

  return buildTypeColumns(items)
}
