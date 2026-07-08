import { computed, unref, type ComputedRef, type Ref } from 'vue'
import type { BrowseViewMode } from '~/composables/useBrowse'
import type { DatabaseField, DatabaseSchema, ProjectionType } from '~/types/database'
import { suggestCollectionViews, PROJECTION_REGISTRY_NODES } from '~/lib/trellis-projection-registry/collection-views'

export interface ProjectionOption {
  mode: BrowseViewMode
  projectionType: ProjectionType
  label: string
  icon: string
  order: number
  disabled?: boolean
  reason?: string
  tooltip?: string
  suggested?: boolean
  isDefault?: boolean
}

type ProjectionTypeConfig = {
  projections?: ProjectionType[]
  defaultProjection?: ProjectionType
}

type ProjectionSchemaField = {
  id?: string
  type?: DatabaseField['type'] | string
  valueType?: string
  name?: string
  display?: string
  group?: string
  required?: boolean
}

const PROJECTION_TO_BROWSE_VIEW_MODE: Partial<Record<ProjectionType, BrowseViewMode>> = {
  table: 'table',
  spreadsheet: 'spreadsheet',
  kanban: 'kanban',
  calendar: 'calendar',
  list: 'list',
  'card-grid': 'grid',
  timeline: 'timeline',
  graph: 'graph',
  form: 'form',
  moodboard: 'moodboard',
}

const BASELINE_BROWSE_PROJECTIONS = new Set<ProjectionType>(['table', 'card-grid'])

function normalizeFieldType(field: ProjectionSchemaField): DatabaseField['type'] | null {
  const fieldId = field.name ?? field.id ?? ''
  const type = field.type ?? field.valueType
  if (type === 'status') return 'select'
  if (type === 'rich_text' || type === 'title' || type === 'phone_number') return 'text'
  if (type === 'multi_select') return 'multiselect'
  if (type === 'files') return 'file'
  if (type === 'people' || type === 'rollup') return 'relation'
  if (type) {
    if (
      type === 'text' ||
      type === 'number' ||
      type === 'select' ||
      type === 'multiselect' ||
      type === 'date' ||
      type === 'checkbox' ||
      type === 'url' ||
      type === 'email' ||
      type === 'file' ||
      type === 'relation' ||
      type === 'formula'
    ) {
      return type
    }
    return null
  }

  if (field.group === 'scheduling' || fieldId.endsWith('Date') || fieldId === 'date') return 'date'
  if (
    fieldId.includes('amount') ||
    fieldId.includes('Amount') ||
    fieldId.includes('budget') ||
    fieldId.includes('Budget') ||
    fieldId === 'velocity' ||
    fieldId === 'currentValue' ||
    fieldId === 'targetValue'
  ) return 'number'
  if (
    field.group === 'triage' ||
    field.group === 'classification' ||
    fieldId === 'status' ||
    fieldId.endsWith('Status') ||
    fieldId === 'category' ||
    fieldId === 'folder'
  ) return 'select'

  return null
}

function schemaFromFields(fields: ProjectionSchemaField[] | null | undefined): DatabaseSchema | null {
  if (!fields) return null
  return {
    id: 'projection-options',
    collectionId: 'browse',
    fields: fields.flatMap((field, index) => {
      const type = normalizeFieldType(field)
      if (!type) return []
      return [{
        id: field.name ?? field.id ?? `field-${index}`,
        name: field.name ?? field.id ?? `Field ${index + 1}`,
        type,
        required: field.required ?? false,
        order: index,
      }]
    }),
    views: [],
    createdAt: 0,
    updatedAt: 0,
  }
}

function toBrowseViewMode(projectionType: ProjectionType): BrowseViewMode | null {
  return PROJECTION_TO_BROWSE_VIEW_MODE[projectionType] ?? null
}

export function useProjectionOptions(options: {
  activeType?: Ref<string | undefined> | ComputedRef<string | undefined>
  activeTypeConfig?: Ref<ProjectionTypeConfig | null | undefined> | ComputedRef<ProjectionTypeConfig | null | undefined>
  schemaFields?: Ref<ProjectionSchemaField[] | null | undefined> | ComputedRef<ProjectionSchemaField[] | null | undefined>
  currentProjection?: Ref<ProjectionType> | ComputedRef<ProjectionType>
} = {}): {
  projectionOptions: ComputedRef<ProjectionOption[]>
  defaultProjection: ComputedRef<ProjectionType>
  defaultViewMode: ComputedRef<BrowseViewMode>
} {
  const projectionOptions = computed<ProjectionOption[]>(() => {
    const config = options.activeTypeConfig ? unref(options.activeTypeConfig) : null
    const allowed = config?.projections?.length ? new Set(config.projections) : null
    const schema = schemaFromFields(options.schemaFields ? unref(options.schemaFields) : undefined)
    const capabilities = new Map(
      suggestCollectionViews(schema).map((option) => [option.mode, option]),
    )

    return PROJECTION_REGISTRY_NODES.flatMap((node) => {
      const projectionType = node.projectionType as ProjectionType
      const mode = toBrowseViewMode(projectionType)
      if (!mode) return []
      if (allowed && !allowed.has(projectionType) && !BASELINE_BROWSE_PROJECTIONS.has(projectionType)) return []

      const capability = capabilities.get(projectionType)
      const disabled = capability?.supported === false
      const reason = disabled ? capability?.reason : undefined

      return [{
        mode,
        projectionType,
        label: node.label,
        icon: node.icon ?? 'lucide:layout-dashboard',
        order: node.order,
        disabled,
        reason,
        tooltip: reason,
        suggested: projectionType === config?.defaultProjection,
        isDefault: projectionType === config?.defaultProjection,
      }]
    })
  })

  const defaultProjection = computed<ProjectionType>(() => {
    const config = options.activeTypeConfig ? unref(options.activeTypeConfig) : null
    const supported = projectionOptions.value.filter((option) => !option.disabled)
    const preferred = supported.find((option) => option.projectionType === config?.defaultProjection)
    if (preferred) return preferred.projectionType
    const cardGrid = supported.find((option) => option.projectionType === 'card-grid')
    return cardGrid?.projectionType ?? supported[0]?.projectionType ?? 'card-grid'
  })

  const defaultViewMode = computed<BrowseViewMode>(() => toBrowseViewMode(defaultProjection.value) ?? 'grid')

  return { projectionOptions, defaultProjection, defaultViewMode }
}
