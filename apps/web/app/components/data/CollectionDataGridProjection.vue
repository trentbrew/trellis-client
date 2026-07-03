<script setup lang="ts">
  import type { DatabaseSchema, DatabaseField } from '~/types/database'
  import type { FilterFieldDef, FilterFieldType } from '~/composables/useAdvancedFilters'
  import { useAdvancedFilters } from '~/composables/useAdvancedFilters'
  import { buildEntityTypeOptions } from '~/config/entityRegistry'
  import FilterBuilder from '~/components/layout/FilterBuilder.vue'
  import EditableCell from './DataTable/EditableCell.vue'
  import ColumnResizeHandle from './DataGrid/ColumnResizeHandle.vue'
  import { todayYmdLocal } from '~/utils/date'

  const ROW_HEIGHT = 42
  const HEADER_HEIGHT = 36
  const OVERSCAN = 10
  const CHECK_WIDTH = 36
  const INDEX_WIDTH = 40
  const DEFAULT_ID_WIDTH = 136
  const ACTION_WIDTH = 40
  const ADD_COLUMN_WIDTH = 112
  const DEFAULT_COL_WIDTH = 160
  const COL_MIN = 80
  const COL_MAX = 480

  const props = defineProps<{
    collectionId: string
    modelValue?: string
    schema?: DatabaseSchema | null
  }>()

  const emit = defineEmits<{
    'update:modelValue': [value: string]
    'update:schema': [schema: DatabaseSchema]
  }>()

  // --- Content parsing (JSON-LD document in modelValue) ---

  const parsed = computed<{ doc: any; error: string | null }>(() => {
    try {
      return { doc: props.modelValue ? JSON.parse(props.modelValue) : {}, error: null }
    } catch {
      return { doc: {}, error: 'Invalid JSON' }
    }
  })

  const doc = computed(() => parsed.value.doc)
  const parseError = computed(() => parsed.value.error)

  const getNodeType = (node: any) => {
    if (!node || typeof node !== 'object' || Array.isArray(node)) return ''
    const t = (node as any)['@type'] ?? (node as any).type
    return typeof t === 'string' ? t : ''
  }

  const recordsInfo = computed(() => {
    const root = doc.value
    if (Array.isArray(root)) return { path: [] as string[], items: root }

    if (root && typeof root === 'object') {
      const graph = (root as any).graph
      if (graph && typeof graph === 'object' && !Array.isArray(graph)) {
        const nestedCandidates = ['nodes', 'records', 'items', 'data', '@graph']
        for (const k of nestedCandidates) {
          if (Array.isArray((graph as any)[k])) return { path: ['graph', k], items: (graph as any)[k] }
        }
      }

      const candidates = ['@graph', 'records', 'items', 'data', 'nodes']
      for (const k of candidates) {
        if (Array.isArray(root[k])) return { path: [k], items: root[k] }
      }
    }

    return { path: null as string[] | null, items: [] as any[] }
  })

  const sourceItems = computed<any[]>(() => {
    const { items } = recordsInfo.value
    if (!items || !Array.isArray(items)) return []
    return items.filter((x: any) => {
      if (!x || typeof x !== 'object' || Array.isArray(x)) return false
      const t = getNodeType(x)
      if (t === 'trellis:Collection') return false
      if (t === 'trellis:PropertyValueSpecification') return false
      return true
    })
  })

  const unwrapLdValue = (value: any): any => {
    if (Array.isArray(value)) return value.map(unwrapLdValue)
    if (value && typeof value === 'object') {
      if ('@value' in value) return unwrapLdValue((value as any)['@value'])
      if ('value' in value && Object.keys(value).length === 1) return unwrapLdValue((value as any).value)
    }
    return value
  }

  const normalizeValue = (raw: any) => {
    const v = unwrapLdValue(raw)
    if (v === undefined) return undefined
    return v
  }

  // --- Schema / columns ---

  const hasSchema = computed(() => {
    return !!(props.schema && props.schema.fields && props.schema.fields.length > 0)
  })

  const schemaFieldMap = computed(() => {
    const map = new Map<string, DatabaseField>()
    if (!props.schema?.fields) return map
    props.schema.fields.forEach((f) => map.set(f.name, f))
    return map
  })

  const derivedKeys = computed<string[]>(() => {
    if (hasSchema.value && props.schema?.fields) {
      return props.schema.fields
        .slice()
        .sort((a, b) => (a.order ?? 999) - (b.order ?? 999))
        .map((f) => f.name)
    }

    const items = sourceItems.value
    if (!items.length) return []

    // The ID rail covers identifiers, so skip them in fallback columns.
    const reserved = new Set(['_originalIndex', '@context', '@id', 'id', '_id'])
    const keys = new Set<string>()

    for (const item of items.slice(0, 100)) {
      Object.keys(item || {}).forEach((k: string) => {
        if (!k) return
        if (reserved.has(k)) return
        keys.add(k)
      })
    }

    const out: string[] = []
    if (keys.has('@type')) out.push('@type')

    Array.from(keys)
      .filter((k) => !out.includes(k))
      .sort((a, b) => a.localeCompare(b))
      .forEach((k) => out.push(k))

    return out
  })

  interface GridColumn {
    key: string
    label: string
    field: DatabaseField | null
  }

  const gridColumns = computed<GridColumn[]>(() =>
    derivedKeys.value.map((key) => ({
      key,
      label: key.includes(':') ? key.split(':').pop() || key : key,
      field: schemaFieldMap.value.get(key) ?? null,
    })),
  )

  // --- Column widths (persisted per collection) ---

  const { widths, setColumnWidth, resetColumnWidth } = useColumnWidths(
    `datagrid:column-widths:${props.collectionId}`,
    { min: COL_MIN, max: COL_MAX },
  )

  const idWidth = computed(() => widths.value._id ?? DEFAULT_ID_WIDTH)
  const colWidth = (key: string) => widths.value[key] ?? DEFAULT_COL_WIDTH

  const gridTemplate = computed(() => {
    const cols = gridColumns.value.map((c) => `${colWidth(c.key)}px`).join(' ')
    const addCol = hasSchema.value ? ` ${ADD_COLUMN_WIDTH}px` : ''
    return `${CHECK_WIDTH}px ${INDEX_WIDTH}px ${idWidth.value}px${cols ? ` ${cols}` : ''}${addCol} ${ACTION_WIDTH}px`
  })

  const tableWidth = computed(() => {
    const dataWidth = gridColumns.value.reduce((sum, c) => sum + colWidth(c.key), 0)
    return CHECK_WIDTH + INDEX_WIDTH + idWidth.value + dataWidth + (hasSchema.value ? ADD_COLUMN_WIDTH : 0) + ACTION_WIDTH
  })

  // --- Rows ---

  const { computeFormulas } = useCollectionFormulas(props.collectionId)

  interface GridRow {
    _rowIndex: number
    _id: string
    [key: string]: any
  }

  const gridRows = computed<GridRow[]>(() => {
    let items = sourceItems.value
    if (hasSchema.value && props.schema) {
      items = computeFormulas(items, props.schema)
    }
    return items.map((item: any, index: number) => {
      const row: GridRow = {
        _rowIndex: index,
        _id: String(item['@id'] ?? item.id ?? ''),
      }
      for (const key of derivedKeys.value) {
        row[key] = normalizeValue(item[key])
      }
      return row
    })
  })

  // --- Search / advanced filters / sort ---

  const query = ref('')

  const searchableValue = (value: any): string => {
    if (value === null || value === undefined) return ''
    if (typeof value === 'object') {
      try {
        return JSON.stringify(value).toLowerCase()
      } catch {
        return ''
      }
    }
    return String(value).toLowerCase()
  }

  const dbTypeToFilterType = (type: DatabaseField['type']): FilterFieldType => {
    switch (type) {
      case 'number': return 'number'
      case 'select': return 'select'
      case 'multiselect': return 'multi_select'
      case 'date': return 'date'
      case 'checkbox': return 'checkbox'
      default: return 'text'
    }
  }

  const filterFields = computed<FilterFieldDef[]>(() => {
    if (!props.schema?.fields) return []
    return props.schema.fields
      .slice()
      .sort((a, b) => (a.order ?? 999) - (b.order ?? 999))
      .map((f) => {
        const def: FilterFieldDef = {
          key: f.name,
          label: f.name,
          type: dbTypeToFilterType(f.type),
        }
        if ((f.type === 'select' || f.type === 'multiselect') && f.options) {
          def.options = f.options.map((o) => ({ value: o.value, label: o.value }))
        }
        return def
      })
  })

  const advancedFilters = shallowRef<ReturnType<typeof useAdvancedFilters> | null>(null)

  watch(filterFields, (fields) => {
    if (fields.length > 0) {
      advancedFilters.value = useAdvancedFilters({ fields })
    } else {
      advancedFilters.value = null
    }
  }, { immediate: true })

  const sortState = ref<{ key: string; dir: 'asc' | 'desc' } | null>(null)

  const cycleSort = (key: string) => {
    const current = sortState.value
    if (!current || current.key !== key) {
      sortState.value = { key, dir: 'asc' }
    } else if (current.dir === 'asc') {
      sortState.value = { key, dir: 'desc' }
    } else {
      sortState.value = null
    }
  }

  const compareValues = (a: any, b: any): number => {
    const aEmpty = a === null || a === undefined || a === ''
    const bEmpty = b === null || b === undefined || b === ''
    if (aEmpty && bEmpty) return 0
    if (aEmpty) return 1
    if (bEmpty) return -1
    if (typeof a === 'number' && typeof b === 'number') return a - b
    if (typeof a === 'boolean' && typeof b === 'boolean') return Number(a) - Number(b)
    const aStr = String(a)
    const bStr = String(b)
    const aTime = Date.parse(aStr)
    const bTime = Date.parse(bStr)
    if (!Number.isNaN(aTime) && !Number.isNaN(bTime) && /^\d{4}-\d{2}-\d{2}/.test(aStr) && /^\d{4}-\d{2}-\d{2}/.test(bStr)) {
      return aTime - bTime
    }
    return aStr.localeCompare(bStr, undefined, { numeric: true, sensitivity: 'base' })
  }

  const filteredRows = computed<GridRow[]>(() => {
    let rows = gridRows.value

    const q = query.value.trim().toLowerCase()
    if (q) {
      rows = rows.filter(
        (row) =>
          row._id.toLowerCase().includes(q) ||
          derivedKeys.value.some((key) => searchableValue(row[key]).includes(q)),
      )
    }

    if (advancedFilters.value) {
      rows = advancedFilters.value.filterItems(rows)
    }

    const sort = sortState.value
    if (sort) {
      rows = rows.slice().sort((a, b) => {
        const d = compareValues(a[sort.key], b[sort.key])
        const s = sort.dir === 'asc' ? d : -d
        return s !== 0 ? s : a._rowIndex - b._rowIndex
      })
    }

    return rows
  })

  const hasActiveQueryOrFilters = computed(
    () => !!query.value.trim() || !!advancedFilters.value?.hasActiveFilters.value,
  )

  // --- Virtualization ---

  const rowCount = computed(() => filteredRows.value.length)
  const { scrollerRef, measure, range } = useVirtualRows(rowCount, { rowHeight: ROW_HEIGHT, overscan: OVERSCAN })

  const visibleRows = computed(() => {
    const { start, end } = range.value
    return filteredRows.value.slice(start, end).map((row, i) => ({
      row,
      pos: start + i,
      top: (start + i) * ROW_HEIGHT,
    }))
  })

  const scrollToTop = () => {
    const el = scrollerRef.value
    if (!el) return
    try {
      el.scrollTo({ top: 0, behavior: 'auto' })
    } catch {
      el.scrollTop = 0
    }
    measure()
  }

  const scrollRowIntoView = (pos: number) => {
    const el = scrollerRef.value
    if (!el) return
    const y = HEADER_HEIGHT + pos * ROW_HEIGHT
    if (y < el.scrollTop + HEADER_HEIGHT) el.scrollTop = y - HEADER_HEIGHT
    if (y + ROW_HEIGHT > el.scrollTop + el.clientHeight) {
      el.scrollTop = y - el.clientHeight + ROW_HEIGHT
    }
    measure()
  }

  defineExpose({ scrollToTop })

  // --- Content mutation (writes back to modelValue) ---

  const mutateContent = (mutator: (_root: any) => void) => {
    try {
      const root = JSON.parse(props.modelValue || '{}')
      mutator(root)
      emit('update:modelValue', JSON.stringify(root, null, 2))
    } catch (e) {
      console.error('Failed to mutate content:', e)
    }
  }

  const getRecordsArray = (root: any): any[] | null => {
    const info = recordsInfo.value
    if (!info.path) return null

    let target: any = root
    for (const segment of info.path) {
      target = target?.[segment]
    }
    return Array.isArray(target) ? target : null
  }

  // Maps visible row indices to positions in the raw records array,
  // which may contain non-record nodes (collection header, field specs).
  const buildRecordIndexMap = (records: any[]): Map<number, number> => {
    const indexMap = new Map<number, number>()
    let recordIdx = 0
    for (let i = 0; i < records.length; i++) {
      const t = getNodeType(records[i])
      if (t === 'trellis:Collection' || t === 'trellis:PropertyValueSpecification') continue
      indexMap.set(recordIdx, i)
      recordIdx++
    }
    return indexMap
  }

  const handleCellUpdate = (rowIndex: number, key: string, value: any) => {
    mutateContent((_root) => {
      const records = getRecordsArray(_root)
      if (!records) return
      const realIdx = buildRecordIndexMap(records).get(rowIndex)
      if (realIdx === undefined) return
      records[realIdx][key] = value
    })
  }

  const getDefaultValueForType = (type: DatabaseField['type']): any => {
    switch (type) {
      case 'text': return ''
      case 'number': return 0
      case 'checkbox': return false
      case 'date': return todayYmdLocal(new Date())
      case 'select': return ''
      case 'multiselect': return []
      case 'url': return ''
      case 'email': return ''
      case 'formula': return null
      case 'relation': return null
      default: return ''
    }
  }

  const handleAddRow = () => {
    mutateContent((_root) => {
      const records = getRecordsArray(_root)
      if (!records) return

      const newRecord: Record<string, any> = {
        '@id': `trellis:record/${crypto.randomUUID()}`,
        '@type': 'trellis:Record',
      }

      if (hasSchema.value && props.schema?.fields) {
        for (const field of props.schema.fields) {
          newRecord[field.name] = getDefaultValueForType(field.type)
        }
      }

      records.push(newRecord)
    })

    nextTick(() => {
      const el = scrollerRef.value
      if (el) {
        el.scrollTop = el.scrollHeight
        measure()
      }
    })
  }

  const deleteRowIndices = (indices: number[]) => {
    clearEdit()
    mutateContent((_root) => {
      const records = getRecordsArray(_root)
      if (!records) return
      const indexMap = buildRecordIndexMap(records)
      const realIndices = indices
        .map((ri) => indexMap.get(ri))
        .filter((i): i is number => i !== undefined)
        .sort((a, b) => b - a)
      for (const i of realIndices) {
        records.splice(i, 1)
      }
    })
  }

  const handleDeleteRow = (rowIndex: number) => {
    deleteRowIndices([rowIndex])
    // Row indices are positional: everything after the deleted row shifts down.
    const next = new Set<number>()
    for (const idx of selectedIndices.value) {
      if (idx === rowIndex) continue
      next.add(idx > rowIndex ? idx - 1 : idx)
    }
    selectedIndices.value = next
  }

  const handleDuplicateRow = (rowIndex: number) => {
    mutateContent((_root) => {
      const records = getRecordsArray(_root)
      if (!records) return
      const realIdx = buildRecordIndexMap(records).get(rowIndex)
      if (realIdx === undefined) return
      const clone = JSON.parse(JSON.stringify(records[realIdx]))
      if (clone['@id']) clone['@id'] = `trellis:record/${crypto.randomUUID()}`
      else if (clone.id) clone.id = crypto.randomUUID()
      records.push(clone)
    })
  }

  const copyRowId = (row: GridRow) => {
    if (!row._id || !navigator.clipboard) return
    void navigator.clipboard.writeText(row._id)
  }

  // --- Schema mutation (add column) ---

  const emitSchemaUpdate = (updatedFields: DatabaseField[]) => {
    if (!props.schema) return
    emit('update:schema', {
      ...props.schema,
      fields: updatedFields,
      updatedAt: Date.now(),
    })
  }

  const addKeyToRecords = (key: string, defaultValue: any) => {
    mutateContent((_root) => {
      const records = getRecordsArray(_root)
      if (!records) return
      for (const record of records) {
        if (record && typeof record === 'object') {
          const t = getNodeType(record)
          if (t === 'trellis:Collection' || t === 'trellis:PropertyValueSpecification') continue
          if (!(key in record)) {
            record[key] = defaultValue
          }
        }
      }
    })
  }

  const addColumnOpen = ref(false)
  const newColumnName = ref('')
  const newColumnType = ref<DatabaseField['type']>('text')
  const newColumnEntityType = ref<string>('any')
  const entityTypeOptions = buildEntityTypeOptions()
  const newColumnNameRef = ref<HTMLInputElement | null>(null)

  const columnTypeOptions: Array<{ value: DatabaseField['type']; label: string }> = [
    { value: 'text', label: 'Text' },
    { value: 'number', label: 'Number' },
    { value: 'select', label: 'Select' },
    { value: 'multiselect', label: 'Multi-select' },
    { value: 'date', label: 'Date' },
    { value: 'checkbox', label: 'Checkbox' },
    { value: 'url', label: 'URL' },
    { value: 'email', label: 'Email' },
    { value: 'relation', label: 'Relation' },
  ]

  const handleAddColumn = () => {
    const name = newColumnName.value.trim()
    if (!name) return
    if (!props.schema) return

    const newField: DatabaseField = {
      id: crypto.randomUUID(),
      name,
      type: newColumnType.value,
      required: false,
      order: props.schema.fields.length,
      ...(newColumnType.value === 'relation' ? { config: { entityType: newColumnEntityType.value } } : {}),
    }

    emitSchemaUpdate([...props.schema.fields, newField])
    addKeyToRecords(name, getDefaultValueForType(newColumnType.value))

    newColumnName.value = ''
    newColumnType.value = 'text'
    newColumnEntityType.value = 'any'
    addColumnOpen.value = false
  }

  watch(addColumnOpen, (open) => {
    if (open) {
      setTimeout(() => {
        newColumnNameRef.value?.focus()
      }, 50)
    }
  })

  // --- Cell dispatch ---

  const CONTROL_FIELD_TYPES = new Set<DatabaseField['type']>([
    'checkbox',
    'select',
    'multiselect',
    'date',
    'relation',
    'file',
    'formula',
  ])

  type CellMode = 'control' | 'editable-text' | 'readonly'

  const cellMode = (column: GridColumn, row: GridRow): CellMode => {
    if (column.field) {
      if (CONTROL_FIELD_TYPES.has(column.field.type)) return 'control'
      return 'editable-text'
    }
    const value = row[column.key]
    if (value !== null && value !== undefined && typeof value === 'object') return 'readonly'
    return 'editable-text'
  }

  const labelValue = (value: any, field: DatabaseField | null): string => {
    if (value === null || value === undefined || value === '') return '—'
    if (typeof value === 'number') return value.toLocaleString()
    if (Array.isArray(value)) return `${value.length} item${value.length !== 1 ? 's' : ''}`
    if (typeof value === 'object') return '{…}'
    if (field?.type === 'date' || (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?/.test(value))) {
      const d = new Date(value)
      if (!Number.isNaN(d.getTime())) {
        return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
      }
    }
    return String(value)
  }

  const shortId = (id: string): string => {
    if (!id) return '—'
    const tail = id.split('/').pop() || id
    return tail.length > 14 ? `${tail.slice(0, 12)}…` : tail
  }

  // --- Inline text editing + keyboard grid navigation ---

  const editing = ref<{ rowIndex: number; key: string } | null>(null)
  const draft = ref('')
  const editError = ref<string | null>(null)
  const editInput = ref<HTMLInputElement | null>(null)

  const isEditing = (row: GridRow, key: string) =>
    editing.value?.rowIndex === row._rowIndex && editing.value.key === key

  const editableTextKeys = computed(() =>
    gridColumns.value
      .filter((c) => (c.field ? !CONTROL_FIELD_TYPES.has(c.field.type) : true))
      .map((c) => c.key),
  )

  const clearEdit = () => {
    editing.value = null
    draft.value = ''
    editError.value = null
  }

  const beginEdit = (row: GridRow, column: GridColumn) => {
    if (cellMode(column, row) !== 'editable-text') return
    editing.value = { rowIndex: row._rowIndex, key: column.key }
    editError.value = null
    const value = row[column.key]
    draft.value = value === null || value === undefined ? '' : String(value)
    nextTick(() => {
      editInput.value?.focus()
      editInput.value?.select()
    })
  }

  const castDraft = (value: string, field: DatabaseField | null): any => {
    const trimmed = value.trim()
    if (field?.required && trimmed === '') throw new Error('This field is required')
    if (!field) return value
    switch (field.type) {
      case 'number': {
        if (trimmed === '') return null
        const n = Number(trimmed)
        if (Number.isNaN(n)) throw new Error('Must be a valid number')
        return n
      }
      case 'email':
        if (trimmed && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) throw new Error('Invalid email format')
        return trimmed
      case 'url':
        if (trimmed && !/^https?:\/\/.+/.test(trimmed)) throw new Error('Invalid URL (must start with http:// or https://)')
        return trimmed
      default:
        return value
    }
  }

  const commitEdit = (row: GridRow, column: GridColumn): boolean => {
    if (!isEditing(row, column.key)) return true
    try {
      const value = castDraft(draft.value, column.field)
      handleCellUpdate(row._rowIndex, column.key, value)
      clearEdit()
      return true
    } catch (e) {
      editError.value = e instanceof Error ? e.message : 'Invalid value'
      return false
    }
  }

  const focusNext = (row: GridRow, column: GridColumn, direction: 'down' | 'next' | 'prev') => {
    const list = filteredRows.value
    const pos = list.findIndex((r) => r._rowIndex === row._rowIndex)
    if (pos < 0) return

    if (direction === 'down') {
      const nextRow = list[pos + 1]
      if (!nextRow) return
      beginEdit(nextRow, column)
      scrollRowIntoView(pos + 1)
      return
    }

    const keys = editableTextKeys.value
    const ci = keys.indexOf(column.key)
    if (ci < 0) return
    const nextKey = keys[direction === 'next' ? ci + 1 : ci - 1]
    if (!nextKey) return
    const nextColumn = gridColumns.value.find((c) => c.key === nextKey)
    if (nextColumn) beginEdit(row, nextColumn)
  }

  const onEditKeydown = (event: KeyboardEvent, row: GridRow, column: GridColumn) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      if (commitEdit(row, column)) focusNext(row, column, 'down')
    } else if (event.key === 'Tab') {
      event.preventDefault()
      if (commitEdit(row, column)) focusNext(row, column, event.shiftKey ? 'prev' : 'next')
    } else if (event.key === 'Escape') {
      event.preventDefault()
      clearEdit()
    }
  }

  const onEditBlur = (row: GridRow, column: GridColumn) => {
    // Tab/Enter already committed and moved on; a stale blur no-ops via the
    // isEditing guard inside commitEdit.
    commitEdit(row, column)
  }

  // --- Row selection ---

  const selectedIndices = ref<Set<number>>(new Set())
  const lastClickedPos = ref<number | null>(null)

  const hasSelection = computed(() => selectedIndices.value.size > 0)

  const isRowSelected = (row: GridRow) => selectedIndices.value.has(row._rowIndex)

  const allFilteredSelected = computed(() => {
    const rows = filteredRows.value
    return rows.length > 0 && rows.every((r) => selectedIndices.value.has(r._rowIndex))
  })

  const toggleSelectAll = () => {
    if (allFilteredSelected.value) {
      selectedIndices.value = new Set()
    } else {
      selectedIndices.value = new Set(filteredRows.value.map((r) => r._rowIndex))
    }
    lastClickedPos.value = null
  }

  const toggleRowSelected = (row: GridRow, pos: number, event?: MouseEvent) => {
    const next = new Set(selectedIndices.value)
    if (event?.shiftKey && lastClickedPos.value !== null) {
      const from = Math.min(lastClickedPos.value, pos)
      const to = Math.max(lastClickedPos.value, pos)
      const target = !next.has(row._rowIndex)
      for (let i = from; i <= to; i++) {
        const r = filteredRows.value[i]
        if (!r) continue
        if (target) next.add(r._rowIndex)
        else next.delete(r._rowIndex)
      }
    } else if (next.has(row._rowIndex)) {
      next.delete(row._rowIndex)
    } else {
      next.add(row._rowIndex)
    }
    selectedIndices.value = next
    lastClickedPos.value = pos
  }

  const clearSelection = () => {
    selectedIndices.value = new Set()
    lastClickedPos.value = null
  }

  const deleteSelectedRows = () => {
    deleteRowIndices(Array.from(selectedIndices.value))
    clearSelection()
  }
</script>

<template>
  <div class="flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden bg-card">
    <!-- Toolbar -->
    <div class="flex shrink-0 flex-wrap items-center gap-2 border-b border-border px-3 py-2">
      <div class="relative min-w-[180px] flex-1">
        <Icon
          name="lucide:search"
          class="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          v-model="query"
          type="search"
          placeholder="Search table..."
          class="h-8 w-full rounded-md border border-transparent bg-muted/40 pl-8 pr-8 text-sm outline-none placeholder:text-muted-foreground focus:border-ring focus:bg-background" />
        <button
          v-if="query"
          type="button"
          class="absolute right-2 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
          @click="query = ''">
          <Icon name="lucide:x" class="h-3 w-3" />
        </button>
      </div>

      <!-- Advanced Filters -->
      <UiPopover v-if="advancedFilters">
        <UiPopoverTrigger as-child>
          <UiButton
            variant="outline"
            size="sm"
            class="h-8 gap-1.5 text-xs bg-card shrink-0"
            :class="advancedFilters.hasActiveFilters.value ? 'border-primary/50 text-primary' : ''">
            <Icon name="lucide:filter" class="h-3.5 w-3.5 shrink-0" />
            <span v-if="advancedFilters.hasActiveFilters.value">
              {{ advancedFilters.activeFilterSummary.value.length }} filter{{
                advancedFilters.activeFilterSummary.value.length === 1 ? '' : 's'
              }}
            </span>
            <span v-else>Filter</span>
          </UiButton>
        </UiPopoverTrigger>
        <UiPopoverContent align="start" :side-offset="8" class="w-auto p-3">
          <FilterBuilder :filters="advancedFilters" />
        </UiPopoverContent>
      </UiPopover>

      <span class="text-xs text-muted-foreground tabular-nums whitespace-nowrap">
        {{ filteredRows.length }} row{{ filteredRows.length === 1 ? '' : 's' }}
      </span>

      <UiButton size="sm" class="h-8 gap-1.5 text-xs shrink-0" @click="handleAddRow">
        <Icon name="lucide:plus" class="h-3.5 w-3.5" />
        New row
      </UiButton>
    </div>

    <!-- Parse error -->
    <div v-if="parseError" class="border-b border-destructive/30 bg-destructive/10 px-3 py-1.5 text-xs text-destructive">
      {{ parseError }} — fix the document in the JSON-LD view.
    </div>

    <!-- Scroller -->
    <div ref="scrollerRef" class="relative flex-1 overflow-auto" @scroll="measure">
      <div class="min-w-full" :style="{ width: tableWidth + 'px' }">
        <!-- Header -->
        <div
          class="sticky top-0 z-30 grid border-b border-border bg-card text-xs font-medium text-muted-foreground"
          :style="{ gridTemplateColumns: gridTemplate, height: HEADER_HEIGHT + 'px' }">
          <div class="sticky left-0 z-10 flex items-center justify-center bg-card">
            <UiCheckbox :model-value="allFilteredSelected" @update:model-value="toggleSelectAll" />
          </div>
          <div class="sticky z-10 flex items-center justify-center bg-card" :style="{ left: CHECK_WIDTH + 'px' }">
            #
          </div>
          <div
            class="sticky z-10 flex items-center bg-card border-r border-border/40 px-2"
            :style="{ left: CHECK_WIDTH + INDEX_WIDTH + 'px' }">
            <span class="truncate">ID</span>
            <ColumnResizeHandle
              :width="idWidth"
              @resize="(w) => setColumnWidth('_id', w)"
              @reset="resetColumnWidth('_id')" />
          </div>

          <button
            v-for="column in gridColumns"
            :key="column.key"
            type="button"
            class="relative flex items-center gap-1 overflow-hidden border-r border-border/40 px-2 text-left hover:bg-muted/50 transition-colors"
            :title="`Sort by ${column.label}`"
            @click="cycleSort(column.key)">
            <span class="truncate">{{ column.label }}</span>
            <Icon
              v-if="sortState?.key === column.key"
              :name="sortState.dir === 'asc' ? 'lucide:arrow-up' : 'lucide:arrow-down'"
              class="h-3 w-3 shrink-0 text-primary" />
            <ColumnResizeHandle
              :width="colWidth(column.key)"
              @resize="(w) => setColumnWidth(column.key, w)"
              @reset="resetColumnWidth(column.key)" />
          </button>

          <!-- Add column -->
          <div v-if="hasSchema" class="flex items-center px-1">
            <UiPopover v-model:open="addColumnOpen">
              <UiPopoverTrigger as-child>
                <button
                  type="button"
                  class="flex h-7 w-full items-center justify-center gap-1 rounded-md text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                  <Icon name="lucide:plus" class="h-3.5 w-3.5" />
                  Column
                </button>
              </UiPopoverTrigger>
              <UiPopoverContent align="end" :side-offset="6" class="w-64 p-3">
                <div class="space-y-2">
                  <input
                    ref="newColumnNameRef"
                    v-model="newColumnName"
                    type="text"
                    placeholder="Column name"
                    class="h-8 w-full rounded-md border border-border bg-background px-2 text-sm outline-none placeholder:text-muted-foreground focus:border-primary"
                    @keydown.enter.prevent="handleAddColumn" />
                  <UiSelect v-model="newColumnType">
                    <UiSelectTrigger class="h-8 text-xs">
                      <UiSelectValue placeholder="Type" />
                    </UiSelectTrigger>
                    <UiSelectContent>
                      <UiSelectItem v-for="opt in columnTypeOptions" :key="opt.value" :value="opt.value" class="text-xs">
                        {{ opt.label }}
                      </UiSelectItem>
                    </UiSelectContent>
                  </UiSelect>
                  <UiSelect v-if="newColumnType === 'relation'" v-model="newColumnEntityType">
                    <UiSelectTrigger class="h-8 text-xs">
                      <UiSelectValue placeholder="Entity type" />
                    </UiSelectTrigger>
                    <UiSelectContent>
                      <UiSelectItem v-for="opt in entityTypeOptions" :key="opt.value" :value="opt.value" class="text-xs">
                        {{ opt.label }}
                      </UiSelectItem>
                    </UiSelectContent>
                  </UiSelect>
                  <UiButton size="sm" class="h-7 w-full text-xs" :disabled="!newColumnName.trim()" @click="handleAddColumn">
                    Add column
                  </UiButton>
                </div>
              </UiPopoverContent>
            </UiPopover>
          </div>

          <div class="sticky right-0 z-10 bg-card shadow-[-4px_0_8px_-6px_rgba(0,0,0,0.3)]" />
        </div>

        <!-- Empty states -->
        <div v-if="!filteredRows.length && hasActiveQueryOrFilters" class="p-12 text-center">
          <Icon name="lucide:search-x" class="mx-auto h-10 w-10 text-muted-foreground opacity-50" />
          <p class="mt-3 text-sm font-medium">No matching rows</p>
          <p class="mt-1 text-xs text-muted-foreground">Clear search or filters to see all rows.</p>
        </div>
        <div v-else-if="!filteredRows.length" class="p-12 text-center">
          <Icon name="lucide:table" class="mx-auto h-10 w-10 text-muted-foreground opacity-50" />
          <p class="mt-3 text-sm font-medium">No rows yet</p>
          <p class="mt-1 text-xs text-muted-foreground">Create the first row to get started.</p>
          <UiButton size="sm" variant="outline" class="mt-4 h-8 gap-1.5 text-xs" @click="handleAddRow">
            <Icon name="lucide:plus" class="h-3.5 w-3.5" />
            New row
          </UiButton>
        </div>

        <!-- Virtualized rows -->
        <div v-else class="relative" :style="{ height: filteredRows.length * ROW_HEIGHT + 'px' }">
          <div
            v-for="{ row, pos, top } in visibleRows"
            :key="row._rowIndex"
            class="group absolute left-0 grid w-full border-b border-border/60 text-sm"
            :class="isRowSelected(row) ? 'bg-muted' : 'bg-card hover:bg-muted/40'"
            :style="{ top: top + 'px', height: ROW_HEIGHT + 'px', gridTemplateColumns: gridTemplate }"
            :data-row-id="row._id || row._rowIndex">
            <!-- Checkbox rail -->
            <div
              class="sticky left-0 z-10 flex items-center justify-center"
              :class="isRowSelected(row) ? 'bg-muted' : 'bg-card group-hover:bg-muted/40'">
              <UiCheckbox
                :model-value="isRowSelected(row)"
                @click="(e: MouseEvent) => toggleRowSelected(row, pos, e)" />
            </div>
            <!-- Index rail -->
            <div
              class="sticky z-10 flex items-center justify-center text-xs text-muted-foreground tabular-nums"
              :class="isRowSelected(row) ? 'bg-muted' : 'bg-card group-hover:bg-muted/40'"
              :style="{ left: CHECK_WIDTH + 'px' }">
              {{ pos + 1 }}
            </div>
            <!-- ID rail -->
            <div
              class="sticky z-10 flex items-center overflow-hidden border-r border-border/40 px-2"
              :class="isRowSelected(row) ? 'bg-muted' : 'bg-card group-hover:bg-muted/40'"
              :style="{ left: CHECK_WIDTH + INDEX_WIDTH + 'px' }">
              <button
                type="button"
                class="truncate font-mono text-xs text-muted-foreground hover:text-foreground transition-colors"
                :title="row._id ? `${row._id} (click to copy)` : ''"
                @click="copyRowId(row)">
                {{ shortId(row._id) }}
              </button>
            </div>

            <!-- Data cells -->
            <div
              v-for="column in gridColumns"
              :key="column.key"
              class="relative flex min-w-0 items-center overflow-hidden border-r border-border/40"
              :class="cellMode(column, row) === 'control' ? 'px-1' : ''">
              <!-- Control cells (checkbox/select/date/relation/formula/file) -->
              <div v-if="cellMode(column, row) === 'control'" class="w-full min-w-0">
                <EditableCell
                  :value="row[column.key]"
                  :field="column.field!"
                  :row-id="row._id || String(row._rowIndex)"
                  :row-data="row"
                  @update="(v) => handleCellUpdate(row._rowIndex, column.key, v)" />
              </div>

              <!-- Inline text editor -->
              <template v-else-if="cellMode(column, row) === 'editable-text'">
                <template v-if="isEditing(row, column.key)">
                  <input
                    :ref="(el) => (editInput = el as HTMLInputElement | null)"
                    v-model="draft"
                    type="text"
                    :inputmode="column.field?.type === 'number' ? 'decimal' : undefined"
                    class="h-full w-full bg-background px-2 text-sm outline-none ring-1 ring-inset ring-primary"
                    :class="{ 'ring-destructive': editError }"
                    @keydown="(e) => onEditKeydown(e, row, column)"
                    @blur="onEditBlur(row, column)" />
                  <div
                    v-if="editError"
                    class="absolute left-0 top-full z-20 mt-0.5 rounded bg-destructive/10 px-2 py-1 text-xs text-destructive whitespace-nowrap">
                    {{ editError }}
                  </div>
                </template>
                <button
                  v-else
                  type="button"
                  class="h-full w-full truncate px-2 text-left"
                  :class="row[column.key] === null || row[column.key] === undefined || row[column.key] === '' ? 'text-muted-foreground/50' : ''"
                  @click="beginEdit(row, column)">
                  {{ labelValue(row[column.key], column.field) }}
                </button>
              </template>

              <!-- Read-only (objects/arrays without schema) -->
              <span
                v-else
                class="truncate px-2 text-xs text-muted-foreground"
                :title="searchableValue(row[column.key])">
                {{ labelValue(row[column.key], column.field) }}
              </span>
            </div>

            <!-- Add-column spacer -->
            <div v-if="hasSchema" />

            <!-- Actions rail -->
            <div
              class="sticky right-0 z-10 flex items-center justify-center shadow-[-4px_0_8px_-6px_rgba(0,0,0,0.3)]"
              :class="isRowSelected(row) ? 'bg-muted' : 'bg-card group-hover:bg-muted/40'">
              <UiDropdownMenu>
                <UiDropdownMenuTrigger as-child>
                  <button
                    type="button"
                    class="flex h-6 w-6 items-center justify-center rounded text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground group-hover:opacity-100 data-[state=open]:opacity-100">
                    <Icon name="lucide:more-horizontal" class="h-4 w-4" />
                  </button>
                </UiDropdownMenuTrigger>
                <UiDropdownMenuContent align="end" class="w-40">
                  <UiDropdownMenuItem class="text-xs gap-2" @click="handleDuplicateRow(row._rowIndex)">
                    <Icon name="lucide:copy-plus" class="h-3.5 w-3.5" />
                    Duplicate
                  </UiDropdownMenuItem>
                  <UiDropdownMenuItem v-if="row._id" class="text-xs gap-2" @click="copyRowId(row)">
                    <Icon name="lucide:copy" class="h-3.5 w-3.5" />
                    Copy ID
                  </UiDropdownMenuItem>
                  <UiDropdownMenuSeparator />
                  <UiDropdownMenuItem class="text-xs gap-2 text-destructive focus:text-destructive" @click="handleDeleteRow(row._rowIndex)">
                    <Icon name="lucide:trash-2" class="h-3.5 w-3.5" />
                    Delete
                  </UiDropdownMenuItem>
                </UiDropdownMenuContent>
              </UiDropdownMenu>
            </div>
          </div>
        </div>

        <!-- Bottom new-row affordance -->
        <button
          v-if="filteredRows.length"
          type="button"
          class="flex h-9 w-full items-center border-b border-border/60 text-xs text-muted-foreground hover:bg-muted/40 hover:text-foreground transition-colors"
          @click="handleAddRow">
          <span class="sticky left-0 flex items-center gap-1.5 px-3">
            <Icon name="lucide:plus" class="h-3.5 w-3.5" />
            New row
          </span>
        </button>
      </div>
    </div>

    <!-- Selection bar -->
    <div
      v-if="hasSelection"
      class="flex shrink-0 items-center gap-3 border-t border-border bg-card px-3 py-2 text-xs">
      <span class="font-medium tabular-nums">{{ selectedIndices.size }} selected</span>
      <UiButton variant="destructive" size="sm" class="h-7 gap-1.5 text-xs" @click="deleteSelectedRows">
        <Icon name="lucide:trash-2" class="h-3.5 w-3.5" />
        Delete
      </UiButton>
      <UiButton variant="ghost" size="sm" class="h-7 text-xs" @click="clearSelection">Clear</UiButton>
    </div>
  </div>
</template>
