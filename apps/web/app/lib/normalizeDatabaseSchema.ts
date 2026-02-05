import type { DatabaseField, DatabaseSchema, DatabaseView } from '~/types/database'

const fieldTypes = new Set<DatabaseField['type']>([
  'text',
  'number',
  'select',
  'multiselect',
  'date',
  'checkbox',
  'url',
  'email',
  'file',
  'relation',
  'formula',
])

const viewTypes = new Set<DatabaseView['type']>(['table', 'board', 'calendar', 'gallery', 'list'])

export function createDefaultDatabaseSchema(collectionId: string): DatabaseSchema {
  const now = Date.now()

  return {
    id: '',
    collectionId,
    fields: [],
    views: [
      {
        id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : 'view_all_records',
        name: 'All Records',
        type: 'table',
        filters: [],
        sorts: [],
        isDefault: true,
      },
    ],
    createdAt: now,
    updatedAt: now,
  }
}

const normalizeString = (v: any, fallback: string) => {
  return typeof v === 'string' && v ? v : fallback
}

const normalizeNumber = (v: any, fallback: number) => {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback
}

const normalizeBoolean = (v: any, fallback: boolean) => {
  return typeof v === 'boolean' ? v : fallback
}

const normalizeStringArray = (v: any): string[] => {
  if (!Array.isArray(v)) return []
  return v.filter((x) => typeof x === 'string')
}

const normalizeField = (raw: any, index: number): DatabaseField => {
  const obj = raw && typeof raw === 'object' ? raw : {}

  const type = fieldTypes.has(obj.type) ? (obj.type as DatabaseField['type']) : 'text'

  const options = Array.isArray(obj.options)
    ? obj.options
        .filter((o: any) => o && typeof o === 'object')
        .map((o: any) => ({
          value: normalizeString(o.value, ''),
          color: normalizeString(o.color, ''),
        }))
        .filter((o: any) => o.value)
    : undefined

  const config = obj.config && typeof obj.config === 'object' && !Array.isArray(obj.config) ? obj.config : undefined

  const formula = typeof obj.formula === 'string' ? obj.formula : undefined
  const formulaReturnType =
    obj.formulaReturnType === 'text' ||
    obj.formulaReturnType === 'number' ||
    obj.formulaReturnType === 'boolean' ||
    obj.formulaReturnType === 'date'
      ? obj.formulaReturnType
      : undefined

  return {
    id: normalizeString(obj.id, `field_${index}`),
    name: normalizeString(obj.name, `Field ${index + 1}`),
    type,
    options,
    config,
    required: normalizeBoolean(obj.required, false),
    order: normalizeNumber(obj.order, index),
    formula,
    formulaReturnType,
  }
}

const normalizeView = (raw: any, index: number): DatabaseView => {
  const obj = raw && typeof raw === 'object' ? raw : {}

  const type = viewTypes.has(obj.type) ? (obj.type as DatabaseView['type']) : 'table'

  return {
    id: normalizeString(obj.id, `view_${index}`),
    name: normalizeString(obj.name, index === 0 ? 'All Records' : `View ${index + 1}`),
    type,
    filters: normalizeStringArray(obj.filters),
    sorts: normalizeStringArray(obj.sorts),
    groupBy: typeof obj.groupBy === 'string' ? obj.groupBy : undefined,
    isDefault: normalizeBoolean(obj.isDefault, index === 0),
  }
}

export function normalizeDatabaseSchema(raw: any, collectionId: string): DatabaseSchema {
  let candidate: any = raw
  if (typeof candidate === 'string') {
    try {
      candidate = JSON.parse(candidate)
    } catch {
      candidate = {}
    }
  }

  const base = candidate && typeof candidate === 'object' && !Array.isArray(candidate) ? candidate : {}

  const fieldsRaw = Array.isArray((base as any).fields) ? (base as any).fields : []
  const viewsRaw = Array.isArray((base as any).views) ? (base as any).views : []

  const normalizedFields = fieldsRaw.map((f: any, i: number) => normalizeField(f, i))
  let normalizedViews: DatabaseView[] = viewsRaw.map((v: any, i: number) => normalizeView(v, i))

  if (normalizedViews.length === 0) {
    const def = createDefaultDatabaseSchema(collectionId)
    normalizedViews = def.views
  }

  if (!normalizedViews.some((v: DatabaseView) => v.isDefault)) {
    normalizedViews = normalizedViews.map((v: DatabaseView, i: number) => ({ ...v, isDefault: i === 0 }))
  }

  const createdAt = normalizeNumber((base as any).createdAt, Date.now())
  const updatedAt = normalizeNumber((base as any).updatedAt, createdAt)

  return {
    id: typeof (base as any).id === 'string' ? (base as any).id : '',
    collectionId,
    fields: normalizedFields,
    views: normalizedViews,
    projections: Array.isArray((base as any).projections) ? (base as any).projections : undefined,
    createdAt,
    updatedAt,
  }
}

export function parseCollectionIdFromSchemaSettingKey(settingKey: string): string | null {
  if (typeof settingKey !== 'string') return null
  const m = /^collection:([^:]+):schema$/.exec(settingKey)
  return m?.[1] || null
}
