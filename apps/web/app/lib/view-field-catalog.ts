import {
  CARD_PROPERTY_KEYS,
  CARD_PROPERTY_OPTIONS,
  type CardPropertyKey,
} from '~/lib/card-property-visibility'
import {
  getFileBrowseDefaultVisibleKeys,
  shouldMigrateFileCardLayout,
} from '~/lib/file-card-view-profiles'
import { TABLE_SKIP_FIELD_NAMES } from '~/lib/ontology-sidebar-fields'

export type ViewFieldSource = 'builtin' | 'ontology'

export interface ViewFieldDefinition {
  key: string
  label: string
  source: ViewFieldSource
  valueType?: string
  builtinKind?: CardPropertyKey
}

export interface OntologyColumnLike {
  key: string
  label: string
  valueType: string
  isTitle?: boolean
}

export interface ViewFieldsState {
  visible: string[]
  showEmpty: boolean
}

export const META_VIEW_FIELD_KEYS = new Set<string>(['type', 'priority', 'status'])

const BUILTIN_KEY_SET = new Set<string>(CARD_PROPERTY_KEYS)

const SKIP_ONTOLOGY_VALUE_TYPES = new Set(['files', 'formula'])

export function buildViewFieldCatalog(
  entityType: string,
  ontologyColumns: OntologyColumnLike[] = [],
): ViewFieldDefinition[] {
  const builtins: ViewFieldDefinition[] = CARD_PROPERTY_OPTIONS.map((opt) => ({
    key: opt.key,
    label: opt.label,
    source: 'builtin',
    builtinKind: opt.key,
  }))

  if (!entityType || entityType === 'all') return builtins

  const ontology: ViewFieldDefinition[] = []
  for (const col of ontologyColumns) {
    if (col.isTitle || col.key === 'title') continue
    if (BUILTIN_KEY_SET.has(col.key)) continue
    if (TABLE_SKIP_FIELD_NAMES.has(col.key)) continue
    if (SKIP_ONTOLOGY_VALUE_TYPES.has(col.valueType)) continue
    ontology.push({
      key: col.key,
      label: col.label,
      source: 'ontology',
      valueType: col.valueType,
    })
  }

  return [...builtins, ...ontology]
}

export function defaultVisibleKeys(catalog: ViewFieldDefinition[], entityType?: string): string[] {
  if (entityType === 'file') {
    return getFileBrowseDefaultVisibleKeys(catalog.map((f) => f.key))
  }
  const curated = entityType ? CARD_VIEW_DEFAULTS[entityType] : undefined
  if (curated?.length) {
    const allowed = new Set(catalog.map((f) => f.key))
    const picked = curated.filter((k) => allowed.has(k))
    if (picked.length) return picked
  }
  return catalog.map((f) => f.key)
}

/** Card-face defaults per entity type — detail lives in dialog sidebar / table view. */
const CARD_VIEW_DEFAULTS: Record<string, string[]> = {
  bookmark: ['description', 'tags'],
}

export function normalizeViewFieldKeys(
  catalog: ViewFieldDefinition[],
  saved: string[] | null | undefined,
  entityType?: string,
): string[] {
  const catalogKeys = new Set(catalog.map((f) => f.key))
  if (!saved?.length) return defaultVisibleKeys(catalog, entityType)
  const normalized = saved.filter((k) => catalogKeys.has(k))
  return normalized.length ? normalized : defaultVisibleKeys(catalog, entityType)
}

export function toggleViewFieldKey(
  visible: string[],
  key: string,
  on: boolean,
  _catalog: ViewFieldDefinition[],
): string[] {
  if (on) {
    if (visible.includes(key)) return visible
    return [...visible, key]
  }
  return visible.filter((k) => k !== key)
}

export function moveViewFieldKey(visible: string[], key: string, direction: -1 | 1): string[] {
  const idx = visible.indexOf(key)
  if (idx < 0) return visible
  const next = idx + direction
  if (next < 0 || next >= visible.length) return visible
  const copy = [...visible]
  const [item] = copy.splice(idx, 1)
  copy.splice(next, 0, item!)
  return copy
}

export function isViewFieldVisible(visible: string[] | null | undefined, key: string): boolean {
  if (visible == null) return true
  return visible.includes(key)
}

export function partitionViewFields(visible: string[] | null | undefined, catalog: ViewFieldDefinition[]) {
  const order = visible ?? defaultVisibleKeys(catalog)
  const meta = order.filter((k) => META_VIEW_FIELD_KEYS.has(k))
  const body = order.filter((k) => !META_VIEW_FIELD_KEYS.has(k))
  return { meta, body }
}

const VIEW_FIELDS_STORAGE_PREFIX = 'browse:view-fields:'
const LEGACY_CARD_PROPS_PREFIX = 'browse:card-props:'
const FILE_CARD_LAYOUT_MIGRATION = 'browse:file-card-layout:v2'

export function loadViewFieldsState(
  storageKey: string,
  catalog: ViewFieldDefinition[],
  entityType?: string,
): ViewFieldsState {
  const fallback: ViewFieldsState = {
    visible: defaultVisibleKeys(catalog, entityType),
    showEmpty: false,
  }
  if (!import.meta.client) return fallback

  try {
    const raw = window.localStorage.getItem(`${VIEW_FIELDS_STORAGE_PREFIX}${storageKey}`)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<ViewFieldsState>
      if (
        entityType === 'file' &&
        !window.localStorage.getItem(`${FILE_CARD_LAYOUT_MIGRATION}:${storageKey}`) &&
        shouldMigrateFileCardLayout(parsed.visible)
      ) {
        window.localStorage.setItem(`${FILE_CARD_LAYOUT_MIGRATION}:${storageKey}`, '1')
        saveViewFieldsState(storageKey, fallback)
        return fallback
      }
      return {
        visible: normalizeViewFieldKeys(catalog, parsed.visible, entityType),
        showEmpty: !!parsed.showEmpty,
      }
    }

    const legacyRaw = window.localStorage.getItem(`${LEGACY_CARD_PROPS_PREFIX}${storageKey}`)
    if (legacyRaw) {
      const parsed = JSON.parse(legacyRaw) as Partial<ViewFieldsState>
      return {
        visible: normalizeViewFieldKeys(catalog, parsed.visible, entityType),
        showEmpty: !!parsed.showEmpty,
      }
    }
  } catch {
    // ignore
  }

  return fallback
}

export function saveViewFieldsState(storageKey: string, state: ViewFieldsState) {
  if (!import.meta.client) return
  try {
    window.localStorage.setItem(`${VIEW_FIELDS_STORAGE_PREFIX}${storageKey}`, JSON.stringify(state))
  } catch {
    // ignore quota / private mode
  }
}
