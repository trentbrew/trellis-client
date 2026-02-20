/**
 * Field Value Formatters — shared utility for rendering ontology field values
 * in cards, tables, lists, and dialogs.
 *
 * Given a raw value and its valueType from the ontology schema, returns a
 * display-friendly string, component hint, or structured object.
 */

// ── Constants ─────────────────────────────────────────────────────────

const SORTABLE_TYPES = new Set(['title', 'number', 'date', 'select', 'status', 'checkbox'])
const SEARCHABLE_TYPES = new Set(['title', 'rich_text', 'url', 'email', 'phone_number', 'select'])

// ── Simple string formatters ───────────────────────────────────────────

/**
 * Format a field value as a display string based on its schema valueType.
 * Returns an empty string for null/undefined/empty values.
 */
export function formatFieldValue(value: unknown, valueType: string): string {
  if (value === undefined || value === null || value === '') return ''

  switch (valueType) {
    case 'title':
    case 'rich_text':
      return String(value)

    case 'number':
      return typeof value === 'number' ? value.toLocaleString() : String(value)

    case 'date': {
      try {
        const d = new Date(String(value))
        if (isNaN(d.getTime())) return String(value)
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      } catch {
        return String(value)
      }
    }

    case 'checkbox':
      return value ? '✓' : ''

    case 'select':
    case 'status':
      return String(value)

    case 'multi_select':
      if (Array.isArray(value)) return value.join(', ')
      return String(value)

    case 'url':
    case 'email':
    case 'phone_number':
      return String(value)

    case 'people':
      if (Array.isArray(value)) return value.join(', ')
      return String(value)

    case 'relation':
      if (Array.isArray(value)) return `${value.length} linked`
      return value ? '1 linked' : ''

    default:
      return String(value)
  }
}

/**
 * Format a date value as a short relative string.
 * "Today", "Yesterday", "Tomorrow", "Jan 5", etc.
 */
export function formatDateRelative(value: string | Date | undefined): string {
  if (!value) return ''
  const d = value instanceof Date ? value : new Date(value)
  if (isNaN(d.getTime())) return ''

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const diffDays = Math.round((target.getTime() - today.getTime()) / 86_400_000)

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Tomorrow'
  if (diffDays === -1) return 'Yesterday'
  if (diffDays > 1 && diffDays <= 7) return `In ${diffDays} days`
  if (diffDays < -1 && diffDays >= -7) return `${Math.abs(diffDays)} days ago`

  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ── Table column auto-generation ───────────────────────────────────────

export interface AutoTableColumn {
  key: string
  label: string
  valueType: string
  align: 'left' | 'right'
  isTitle: boolean
  sortable: boolean
}

/**
 * Given ontology schema fields, generate table columns suitable for a data table.
 * Excludes rich_text and files (too large for table cells).
 */
export function generateTableColumns(
  fields: { name: string; valueType: string }[],
): AutoTableColumn[] {
  return fields
    .filter((f) => f.valueType !== 'rich_text' && f.valueType !== 'files')
    .map((f) => ({
      key: f.name,
      label: titleCase(f.name),
      valueType: f.valueType,
      align: (f.valueType === 'number' ? 'right' : 'left') as 'left' | 'right',
      isTitle: f.valueType === 'title',
      sortable: SORTABLE_TYPES.has(f.valueType),
    }))
}

// ── Sort/filter/search auto-generation ─────────────────────────────────

export interface AutoSortOption {
  value: string
  label: string
}

export interface AutoFilterDef {
  id: string
  label: string
  options: { value: string; label: string }[]
  fieldName: string
}

/**
 * Auto-generate sort options from schema fields.
 * Sortable types: title, date, number, status, select.
 */
export function generateSortOptions(
  fields: { name: string; valueType: string }[],
): AutoSortOption[] {
  const opts: AutoSortOption[] = []

  for (const f of fields) {
    if (SORTABLE_TYPES.has(f.valueType)) {
      opts.push({ value: f.name, label: titleCase(f.name) })
    }
  }

  // Always add createdAt/updatedAt if not already present
  if (!opts.some((o) => o.value === 'createdAt')) {
    opts.push({ value: 'createdAt', label: 'Created' })
  }

  return opts
}

/**
 * Auto-generate search field names from schema fields.
 * Searchable types: title, rich_text, url, email, phone_number, select.
 */
export function generateSearchFields(
  fields: { name: string; valueType: string }[],
): string[] {
  const result = fields
    .filter((f) => SEARCHABLE_TYPES.has(f.valueType))
    .map((f) => f.name)

  // Always include description if not already there
  if (!result.includes('description')) result.push('description')
  return result
}

/**
 * Auto-generate filter definitions from schema fields.
 * Filterable types: select, multi_select, status, checkbox.
 */
export function generateFilterDefs(
  fields: { name: string; valueType: string; selectOptions?: { name: string }[] }[],
): AutoFilterDef[] {
  const defs: AutoFilterDef[] = []

  for (const f of fields) {
    if ((f.valueType === 'select' || f.valueType === 'status' || f.valueType === 'multi_select') && f.selectOptions?.length) {
      defs.push({
        id: f.name,
        label: titleCase(f.name),
        fieldName: f.name,
        options: [
          { value: 'all', label: 'All' },
          ...f.selectOptions.map((o) => ({ value: o.name, label: o.name })),
        ],
      })
    } else if (f.valueType === 'checkbox') {
      defs.push({
        id: f.name,
        label: titleCase(f.name),
        fieldName: f.name,
        options: [
          { value: 'all', label: 'All' },
          { value: 'true', label: 'Yes' },
          { value: 'false', label: 'No' },
        ],
      })
    }
  }

  return defs
}

// ── Helpers ─────────────────────────────────────────────────────────────

function titleCase(str: string): string {
  return str
    .replace(/([A-Z])/g, ' $1')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim()
}
