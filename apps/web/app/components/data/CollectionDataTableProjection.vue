<script setup lang="ts">
  import {
    FlexRender,
    getCoreRowModel,
    getSortedRowModel,
    getFilteredRowModel,
    useVueTable,
    type ColumnDef,
    type SortingState,
    type RowSelectionState,
  } from '@tanstack/vue-table'
  import type { DatabaseSchema, DatabaseField } from '~/types/database'
  import type { FilterFieldDef, FilterFieldType } from '~/composables/useAdvancedFilters'
  import { useAdvancedFilters } from '~/composables/useAdvancedFilters'
  import { buildEntityTypeOptions } from '~/config/entityRegistry'
  import FilterBuilder from '~/components/layout/FilterBuilder.vue'
  import ColumnHeader from './DataTable/ColumnHeader.vue'
  import EditableCell from './DataTable/EditableCell.vue'
  import * as XLSX from 'xlsx'
  import { todayYmdLocal } from '~/utils/date'

  const props = defineProps<{
    collectionId: string
    modelValue?: string
    schema?: DatabaseSchema | null
  }>()

  const emit = defineEmits<{
    'update:modelValue': [value: string]
    'update:schema': [schema: DatabaseSchema]
  }>()

  const rootEl = ref<HTMLElement | null>(null)
  const sorting = ref<SortingState>([])
  const globalFilter = ref('')
  const expandedCells = ref<Set<string>>(new Set())

  // --- Row selection state ---
  const rowSelection = ref<RowSelectionState>({})

  const selectedRowCount = computed(() => Object.keys(rowSelection.value).length)
  const hasSelection = computed(() => selectedRowCount.value > 0)

  const selectedRowIndices = computed<number[]>(() => {
    return table.getSelectedRowModel().rows.map((r) => r.original._rowIndex as number)
  })

  const clearSelection = () => {
    rowSelection.value = {}
  }

  // --- Batch operations ---

  const batchEditOpen = ref(false)
  const batchEditField = ref('')
  const batchEditValue = ref<any>('')

  const handleBatchDelete = () => {
    const indices = selectedRowIndices.value.slice().sort((a, b) => b - a)
    mutateContent((_root) => {
      const records = getRecordsArray(_root)
      if (!records) return

      // Map rowIndex → actual array index (skipping non-record nodes)
      const indexMap = new Map<number, number>()
      let recordIdx = 0
      for (let i = 0; i < records.length; i++) {
        const t = getNodeType(records[i])
        if (t === 'trellis:Collection' || t === 'trellis:PropertyValueSpecification') continue
        indexMap.set(recordIdx, i)
        recordIdx++
      }

      // Delete in reverse order to preserve indices
      const realIndices = indices.map((ri) => indexMap.get(ri)).filter((i): i is number => i !== undefined)
      realIndices.sort((a, b) => b - a)
      for (const i of realIndices) {
        records.splice(i, 1)
      }
    })
    clearSelection()
  }

  const handleBatchDuplicate = () => {
    const indices = selectedRowIndices.value.slice().sort((a, b) => a - b)
    mutateContent((_root) => {
      const records = getRecordsArray(_root)
      if (!records) return

      const indexMap = new Map<number, number>()
      let recordIdx = 0
      for (let i = 0; i < records.length; i++) {
        const t = getNodeType(records[i])
        if (t === 'trellis:Collection' || t === 'trellis:PropertyValueSpecification') continue
        indexMap.set(recordIdx, i)
        recordIdx++
      }

      const clones: any[] = []
      for (const ri of indices) {
        const realIdx = indexMap.get(ri)
        if (realIdx === undefined) continue
        const clone = JSON.parse(JSON.stringify(records[realIdx]))
        // Give the clone a new ID
        if (clone['@id']) clone['@id'] = `trellis:record/${crypto.randomUUID()}`
        else if (clone.id) clone.id = crypto.randomUUID()
        clones.push(clone)
      }
      records.push(...clones)
    })
    clearSelection()
  }

  const handleBatchSetField = () => {
    if (!batchEditField.value) return
    const fieldKey = batchEditField.value
    const value = batchEditValue.value
    const indices = selectedRowIndices.value

    mutateContent((_root) => {
      const records = getRecordsArray(_root)
      if (!records) return

      const indexMap = new Map<number, number>()
      let recordIdx = 0
      for (let i = 0; i < records.length; i++) {
        const t = getNodeType(records[i])
        if (t === 'trellis:Collection' || t === 'trellis:PropertyValueSpecification') continue
        indexMap.set(recordIdx, i)
        recordIdx++
      }

      for (const ri of indices) {
        const realIdx = indexMap.get(ri)
        if (realIdx === undefined) continue
        records[realIdx][fieldKey] = value
      }
    })

    batchEditOpen.value = false
    batchEditField.value = ''
    batchEditValue.value = ''
    clearSelection()
  }

  const batchEditFieldOptions = computed(() => {
    if (!props.schema?.fields) return []
    return props.schema.fields
      .filter((f) => f.type !== 'formula')
      .slice()
      .sort((a, b) => (a.order ?? 999) - (b.order ?? 999))
      .map((f) => ({ value: f.name, label: f.name, type: f.type }))
  })

  const batchEditFieldType = computed(() => {
    if (!batchEditField.value || !props.schema?.fields) return 'text'
    const f = props.schema.fields.find((f) => f.name === batchEditField.value)
    return f?.type || 'text'
  })

  const batchEditFieldConfig = computed(() => {
    if (!batchEditField.value || !props.schema?.fields) return null
    return props.schema.fields.find((f) => f.name === batchEditField.value) || null
  })

  // --- Export ---

  type ExportFormat = 'csv' | 'json' | 'jsonld' | 'xlsx'

  const getExportRows = (): Record<string, any>[] => {
    const rows = table.getFilteredRowModel().rows
    return rows.map((r) => {
      const out: Record<string, any> = {}
      for (const key of derivedKeys.value) {
        const val = r.original[key]
        out[key] = val === undefined ? '' : val
      }
      return out
    })
  }

  const getExportFileName = (ext: string) => {
    const slug = props.collectionId.replace(/[^a-zA-Z0-9-_]/g, '_')
    return `${slug}-export.${ext}`
  }

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleExport = (format: ExportFormat) => {
    const rows = getExportRows()
    if (!rows.length) return

    switch (format) {
      case 'csv': {
        const keys = derivedKeys.value
        const header = keys.map((k) => `"${k.replace(/"/g, '""')}"`).join(',')
        const lines = rows.map((row) =>
          keys
            .map((k) => {
              const v = row[k]
              if (v == null) return ''
              if (typeof v === 'object') return `"${JSON.stringify(v).replace(/"/g, '""')}"`
              return `"${String(v).replace(/"/g, '""')}"`
            })
            .join(','),
        )
        const csv = [header, ...lines].join('\n')
        downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), getExportFileName('csv'))
        break
      }

      case 'json': {
        const json = JSON.stringify(rows, null, 2)
        downloadBlob(new Blob([json], { type: 'application/json;charset=utf-8' }), getExportFileName('json'))
        break
      }

      case 'jsonld': {
        const ld = {
          '@context': {
            '@vocab': 'https://trellis.dev/ns/',
            'trellis': 'https://trellis.dev/ns/',
          },
          '@type': 'trellis:Collection',
          '@id': `trellis:collection/${props.collectionId}`,
          'trellis:records': rows.map((row) => {
            const record: Record<string, any> = { '@type': 'trellis:Record' }
            for (const [k, v] of Object.entries(row)) {
              record[k] = v
            }
            return record
          }),
        }
        const json = JSON.stringify(ld, null, 2)
        downloadBlob(new Blob([json], { type: 'application/ld+json;charset=utf-8' }), getExportFileName('jsonld'))
        break
      }

      case 'xlsx': {
        const ws = XLSX.utils.json_to_sheet(rows, { header: derivedKeys.value })
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, 'Records')
        const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
        downloadBlob(
          new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
          getExportFileName('xlsx'),
        )
        break
      }
    }
  }

  // Add-column popover state
  const addColumnOpen = ref(false)
  const newColumnName = ref('')
  const newColumnType = ref<DatabaseField['type']>('text')
  const newColumnEntityType = ref<string>('any')
  const entityTypeOptions = buildEntityTypeOptions()
  const newColumnNameRef = ref<HTMLInputElement | null>(null)

  const scrollToTop = () => {
    const el = rootEl.value
    if (!el) return
    try {
      el.scrollTo({ top: 0, behavior: 'auto' })
    } catch {
      el.scrollTop = 0
    }
  }

  // --- Schema helpers ---

  const hasSchema = computed(() => {
    return props.schema && props.schema.fields && props.schema.fields.length > 0
  })

  const schemaFieldMap = computed(() => {
    const map = new Map<string, DatabaseField>()
    if (!props.schema?.fields) return map
    props.schema.fields.forEach((f) => map.set(f.name, f))
    return map
  })

  const getFieldForKey = (key: string): DatabaseField | undefined => {
    return schemaFieldMap.value.get(key)
  }

  const emitSchemaUpdate = (updatedFields: DatabaseField[]) => {
    if (!props.schema) return
    emit('update:schema', {
      ...props.schema,
      fields: updatedFields,
      updatedAt: Date.now(),
    })
  }

  const handleFieldUpdate = (fieldId: string, updates: Partial<DatabaseField>) => {
    if (!props.schema?.fields) return
    const oldField = props.schema.fields.find((f) => f.id === fieldId)
    const oldName = oldField?.name

    const updatedFields = props.schema.fields.map((f) =>
      f.id === fieldId ? { ...f, ...updates } : f,
    )
    emitSchemaUpdate(updatedFields)

    // If the field was renamed, update all records to use the new key
    if (updates.name && oldName && updates.name !== oldName) {
      renameKeyInRecords(oldName, updates.name)
    }
  }

  const handleFieldDelete = (fieldId: string) => {
    if (!props.schema?.fields) return
    const field = props.schema.fields.find((f) => f.id === fieldId)
    if (!field) return

    const updatedFields = props.schema.fields.filter((f) => f.id !== fieldId)
    emitSchemaUpdate(updatedFields)

    // Remove the key from all records
    removeKeyFromRecords(field.name)
  }

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

    // Add empty values for the new field in all records
    addKeyToRecords(name, getDefaultValueForType(newColumnType.value))

    // Reset
    newColumnName.value = ''
    newColumnType.value = 'text'
    newColumnEntityType.value = 'any'
    addColumnOpen.value = false
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

  // --- Data extraction ---

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

  const parsed = computed<{ doc: any; error: string | null }>(() => {
    try {
      return { doc: props.modelValue ? JSON.parse(props.modelValue) : {}, error: null }
    } catch {
      return { doc: {}, error: 'Invalid JSON' }
    }
  })

  const doc = computed(() => parsed.value.doc)
  const error = computed(() => parsed.value.error)

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

  const derivedKeys = computed<string[]>(() => {
    // If schema has fields, use those as the column keys (by field name)
    if (hasSchema.value && props.schema?.fields) {
      return props.schema.fields
        .slice()
        .sort((a, b) => (a.order ?? 999) - (b.order ?? 999))
        .map((f) => f.name)
    }

    // Fallback: auto-derive from data
    const items = sourceItems.value
    if (!items.length) return []

    const reserved = new Set(['_originalIndex', '@context'])
    const keys = new Set<string>()

    for (const item of items.slice(0, 100)) {
      Object.keys(item || {}).forEach((k: string) => {
        if (!k) return
        if (reserved.has(k)) return
        keys.add(k)
      })
    }

    const baseOrder = ['@id', 'id', '_id', '@type']
    const out: string[] = []
    baseOrder.forEach((k) => {
      if (keys.has(k)) out.push(k)
    })

    Array.from(keys)
      .filter((k) => !out.includes(k))
      .sort((a, b) => a.localeCompare(b))
      .forEach((k) => out.push(k))

    return out
  })

  // --- Advanced Filters ---

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

  // Create a stable filter instance that updates when fields change
  const advancedFilters = shallowRef<ReturnType<typeof useAdvancedFilters> | null>(null)

  watch(filterFields, (fields) => {
    if (fields.length > 0) {
      advancedFilters.value = useAdvancedFilters({ fields })
    } else {
      advancedFilters.value = null
    }
  }, { immediate: true })

  // --- Sort dropdown ---

  const sortField = ref('')
  const sortDir = ref<'asc' | 'desc'>('asc')

  const sortOptions = computed(() => {
    if (!props.schema?.fields) return []
    return props.schema.fields
      .slice()
      .sort((a, b) => (a.order ?? 999) - (b.order ?? 999))
      .map((f) => ({ value: f.name, label: f.name }))
  })

  const currentSortLabel = computed(() => {
    if (!sortField.value) return 'Sort'
    return sortField.value
  })

  const handleSortSelect = (field: string) => {
    sortField.value = field
    // Sync with TanStack Table sorting
    sorting.value = [{ id: field, desc: sortDir.value === 'desc' }]
  }

  const toggleSortDir = () => {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
    if (sortField.value) {
      sorting.value = [{ id: sortField.value, desc: sortDir.value === 'desc' }]
    }
  }

  // --- Formula evaluation ---

  const { computeFormulas } = useCollectionFormulas(props.collectionId)

  // --- Content mutation helpers ---

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

  const handleCellUpdate = (rowIndex: number, key: string, value: any) => {
    mutateContent((_root) => {
      const records = getRecordsArray(_root)
      if (!records) return

      // Find the actual record (skip non-record nodes like trellis:Collection)
      let recordIdx = 0
      for (let i = 0; i < records.length; i++) {
        const t = getNodeType(records[i])
        if (t === 'trellis:Collection' || t === 'trellis:PropertyValueSpecification') continue
        if (recordIdx === rowIndex) {
          records[i][key] = value
          return
        }
        recordIdx++
      }
    })
  }

  const handleAddRow = () => {
    mutateContent((_root) => {
      const records = getRecordsArray(_root)
      if (!records) return

      const newRecord: Record<string, any> = {
        '@id': `trellis:record/${crypto.randomUUID()}`,
        '@type': 'trellis:Record',
      }

      // Add default values for each schema field
      if (hasSchema.value && props.schema?.fields) {
        for (const field of props.schema.fields) {
          newRecord[field.name] = getDefaultValueForType(field.type)
        }
      }

      records.push(newRecord)
    })
  }

  const handleDeleteRow = (rowIndex: number) => {
    mutateContent((_root) => {
      const records = getRecordsArray(_root)
      if (!records) return

      let recordIdx = 0
      for (let i = 0; i < records.length; i++) {
        const t = getNodeType(records[i])
        if (t === 'trellis:Collection' || t === 'trellis:PropertyValueSpecification') continue
        if (recordIdx === rowIndex) {
          records.splice(i, 1)
          return
        }
        recordIdx++
      }
    })
  }

  const renameKeyInRecords = (oldKey: string, newKey: string) => {
    mutateContent((_root) => {
      const records = getRecordsArray(_root)
      if (!records) return

      for (let i = 0; i < records.length; i++) {
        const record = records[i]
        if (record && typeof record === 'object' && oldKey in record) {
          const { [oldKey]: moved, ...rest } = record
          records[i] = { ...rest, [newKey]: moved }
        }
      }
    })
  }

  const removeKeyFromRecords = (key: string) => {
    mutateContent((_root) => {
      const records = getRecordsArray(_root)
      if (!records) return

      for (let i = 0; i < records.length; i++) {
        const record = records[i]
        if (record && typeof record === 'object' && key in record) {
          const { [key]: _removed, ...rest } = record
          records[i] = rest
        }
      }
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

  // --- Cell value type detection ---

  type CellType = 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object' | 'null' | 'id'

  const detectCellType = (value: any, key: string): CellType => {
    if (value === null || value === undefined) return 'null'
    if (key === '@id' || key === 'id' || key === '_id') return 'id'
    if (typeof value === 'boolean') return 'boolean'
    if (typeof value === 'number') return 'number'
    if (Array.isArray(value)) return 'array'
    if (typeof value === 'object') return 'object'
    if (typeof value === 'string') {
      if (/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?/.test(value)) {
        const d = new Date(value)
        if (!isNaN(d.getTime())) return 'date'
      }
    }
    return 'string'
  }

  const formatCellValue = (value: any, type: CellType): string => {
    switch (type) {
      case 'null':
        return '—'
      case 'boolean':
        return value ? '✓' : '✗'
      case 'date': {
        const d = new Date(value)
        return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
      }
      case 'number':
        return typeof value === 'number' ? value.toLocaleString() : String(value)
      case 'array':
        return Array.isArray(value) ? `${value.length} item${value.length !== 1 ? 's' : ''}` : String(value)
      case 'object':
        return '{…}'
      case 'id':
        return String(value)
      default:
        return String(value)
    }
  }

  const toggleCellExpanded = (cellKey: string) => {
    if (expandedCells.value.has(cellKey)) {
      expandedCells.value.delete(cellKey)
    } else {
      expandedCells.value.add(cellKey)
    }
  }

  // --- TanStack Table setup ---

  const tableData = computed(() => {
    // Build base rows from source items
    let items = sourceItems.value

    // Evaluate formula fields if schema has formulas
    if (hasSchema.value && props.schema) {
      items = computeFormulas(items, props.schema)
    }

    let rows = items.map((item: any, index: number) => {
      const row: Record<string, any> = { _rowIndex: index }
      for (const key of derivedKeys.value) {
        row[key] = normalizeValue(item[key])
      }
      return row
    })

    // Apply advanced filters
    if (advancedFilters.value) {
      rows = advancedFilters.value.filterItems(rows)
    }

    return rows
  })

  const columns = computed<ColumnDef<Record<string, any>, any>[]>(() => {
    const selectCol: ColumnDef<Record<string, any>, any> = {
      id: '_select',
      size: 40,
      enableSorting: false,
      header: () => null,
      cell: () => null,
    }

    const rowNumCol: ColumnDef<Record<string, any>, any> = {
      id: '_rowNum',
      header: '#',
      size: 48,
      enableSorting: false,
      cell: ({ row }) => String(row.index + 1),
    }

    const dataCols: ColumnDef<Record<string, any>, any>[] = derivedKeys.value.map((key) => {
      const header = key.includes(':') ? key.split(':').pop() || key : key

      return {
        id: key,
        accessorKey: key,
        header,
        size: key === '@id' || key === 'id' ? 220 : 160,
        cell: ({ getValue }: { getValue: () => any }) => getValue(),
      }
    })

    return [selectCol, rowNumCol, ...dataCols]
  })

  const table = useVueTable({
    get data() {
      return tableData.value
    },
    get columns() {
      return columns.value
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    enableRowSelection: true,
    state: {
      get sorting() {
        return sorting.value
      },
      get globalFilter() {
        return globalFilter.value
      },
      get rowSelection() {
        return rowSelection.value
      },
    },
    onSortingChange: (updater) => {
      sorting.value = typeof updater === 'function' ? updater(sorting.value) : updater
    },
    onGlobalFilterChange: (updater) => {
      globalFilter.value = typeof updater === 'function' ? updater(globalFilter.value) : updater
    },
    onRowSelectionChange: (updater) => {
      rowSelection.value = typeof updater === 'function' ? updater(rowSelection.value) : updater
    },
  })

  // Watch for add-column popover open to focus input
  watch(addColumnOpen, (open) => {
    if (open) {
      // Delay focus to allow popover to mount fully
      setTimeout(() => {
        const el = newColumnNameRef.value
        if (el instanceof HTMLElement) {
          el.focus()
        }
      }, 50)
    }
  })

  defineExpose({ scrollToTop })
</script>

<template>
  <div ref="rootEl" class="relative flex h-full w-full flex-col overflow-hidden">
    <!-- Error state -->
    <div v-if="error" class="flex items-center justify-center p-8 text-destructive">
      <p>{{ error }}</p>
    </div>

    <!-- Empty state (no records and no schema) -->
    <div
      v-else-if="!sourceItems.length && !hasSchema"
      class="flex flex-col items-center justify-center gap-2 p-12 text-muted-foreground">
      <Icon name="lucide:table" class="h-10 w-10 opacity-40" />
      <p class="text-sm">No data available</p>
      <UiButton v-if="schema" size="sm" variant="outline" class="mt-2" @click="handleAddRow">
        <Icon name="lucide:plus" class="mr-2 h-4 w-4" />
        Add first record
      </UiButton>
    </div>

    <!-- Table -->
    <template v-else>
      <!-- Toolbar (single row) -->
      <div class="flex items-center gap-2 border-b border-border bg-card/50 px-3 py-2">
        <!-- Search -->
        <div class="relative flex-1">
          <Icon
            name="lucide:search"
            class="text-muted-foreground absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 pointer-events-none" />
          <input
            v-model="globalFilter"
            type="text"
            :placeholder="`Search ${table.getFilteredRowModel().rows.length} record${table.getFilteredRowModel().rows.length !== 1 ? 's' : ''}...`"
            class="h-7 w-full rounded-md border border-border bg-background pl-8 pr-3 text-xs outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary" />
        </div>

        <!-- Advanced Filters -->
        <UiPopover v-if="advancedFilters">
          <UiPopoverTrigger as-child>
            <UiButton
              variant="outline"
              size="sm"
              class="h-7 gap-1.5 text-xs bg-card max-w-[480px] shrink-0"
              :class="advancedFilters.hasActiveFilters.value ? 'border-primary/50 text-primary' : ''">
              <Icon name="lucide:filter" class="h-3.5 w-3.5 shrink-0" />
              <template v-if="advancedFilters.hasActiveFilters.value">
                <span
                  v-for="(pill, pIdx) in advancedFilters.activeFilterSummary.value.slice(0, 2)"
                  :key="pIdx"
                  class="inline-flex items-center gap-1 rounded-sm bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium leading-none whitespace-nowrap">
                  <span class="text-primary/70">{{ pill.fieldLabel }}</span>
                  <span v-if="pill.displayValue" class="text-primary">{{ pill.displayValue }}</span>
                </span>
                <span
                  v-if="advancedFilters.activeFilterSummary.value.length > 2"
                  class="text-[10px] text-primary/60 whitespace-nowrap">
                  +{{ advancedFilters.activeFilterSummary.value.length - 2 }}
                </span>
              </template>
              <span v-else>Filter</span>
            </UiButton>
          </UiPopoverTrigger>
          <UiPopoverContent align="start" :side-offset="8" class="w-auto p-3">
            <FilterBuilder :filters="advancedFilters" />
          </UiPopoverContent>
        </UiPopover>

        <!-- Sort Dropdown -->
        <UiDropdownMenu v-if="sortOptions.length > 0">
          <UiDropdownMenuTrigger as-child>
            <UiButton variant="outline" size="sm" class="h-7 gap-1.5 text-xs bg-card shrink-0">
              <Icon name="lucide:arrow-up-down" class="h-3.5 w-3.5" />
              <span>{{ currentSortLabel }}</span>
              <Icon name="lucide:chevron-down" class="h-3 w-3 opacity-50" />
            </UiButton>
          </UiDropdownMenuTrigger>
          <UiDropdownMenuContent align="end" class="w-48">
            <UiDropdownMenuRadioGroup
              :model-value="sortField"
              @update:model-value="(v) => v != null && handleSortSelect(String(v))">
              <UiDropdownMenuRadioItem
                v-for="option in sortOptions"
                :key="option.value"
                :value="option.value">
                {{ option.label }}
              </UiDropdownMenuRadioItem>
            </UiDropdownMenuRadioGroup>
            <UiDropdownMenuSeparator />
            <UiDropdownMenuItem class="gap-2" @click="toggleSortDir">
              <Icon
                :name="sortDir === 'asc' ? 'lucide:sort-asc' : 'lucide:sort-desc'"
                class="h-4 w-4" />
              <span>{{ sortDir === 'asc' ? 'Ascending' : 'Descending' }}</span>
            </UiDropdownMenuItem>
          </UiDropdownMenuContent>
        </UiDropdownMenu>

        <!-- Import -->
        <UiButton variant="outline" size="sm" class="h-7 gap-1.5 text-xs shrink-0 border-primary text-primary" disabled>
          <Icon name="lucide:upload" class="h-3.5 w-3.5" />
          Import
        </UiButton>

        <!-- Export -->
        <UiDropdownMenu>
          <UiDropdownMenuTrigger as-child>
            <UiButton variant="outline" size="sm" class="h-7 gap-1.5 text-xs shrink-0 border-primary text-primary">
              <Icon name="lucide:download" class="h-3.5 w-3.5" />
              Export
            </UiButton>
          </UiDropdownMenuTrigger>
          <UiDropdownMenuContent align="end" :side-offset="4" class="w-44">
            <UiDropdownMenuItem @click="handleExport('csv')">
              <Icon name="lucide:file-spreadsheet" class="mr-2 h-4 w-4" />
              CSV (.csv)
            </UiDropdownMenuItem>
            <UiDropdownMenuItem @click="handleExport('json')">
              <Icon name="lucide:braces" class="mr-2 h-4 w-4" />
              JSON (.json)
            </UiDropdownMenuItem>
            <UiDropdownMenuItem @click="handleExport('jsonld')">
              <Icon name="lucide:link" class="mr-2 h-4 w-4" />
              JSON-LD (.jsonld)
            </UiDropdownMenuItem>
            <UiDropdownMenuItem @click="handleExport('xlsx')">
              <Icon name="lucide:table" class="mr-2 h-4 w-4" />
              Excel (.xlsx)
            </UiDropdownMenuItem>
          </UiDropdownMenuContent>
        </UiDropdownMenu>

        <!-- Add Record -->
        <UiButton size="sm" class="h-7 gap-1.5 text-xs shrink-0" @click="handleAddRow">
          <Icon name="lucide:plus" class="h-3.5 w-3.5" />
          Add record
        </UiButton>
      </div>

      <!-- Scrollable table area -->
      <div class="flex-1 overflow-auto">
        <table class="w-full border-collapse text-sm">
          <thead class="bg-muted/50 sticky top-0 z-10">
            <tr v-for="headerGroup in table.getHeaderGroups()" :key="headerGroup.id">
              <th
                v-for="header in headerGroup.headers"
                :key="header.id"
                class="group/col border-b border-r border-border px-3 py-2 text-left text-xs font-medium text-muted-foreground whitespace-nowrap"
                :style="{ width: `${header.getSize()}px`, minWidth: `${header.getSize()}px` }">
                <!-- Select-all checkbox column -->
                <template v-if="header.column.id === '_select'">
                  <div class="flex items-center justify-center">
                    <input
                      type="checkbox"
                      class="h-3.5 w-3.5 rounded border-border accent-primary cursor-pointer"
                      :checked="table.getIsAllRowsSelected()"
                      :indeterminate="table.getIsSomeRowsSelected()"
                      @change="table.getToggleAllRowsSelectedHandler()($event)" />
                  </div>
                </template>

                <!-- Row number column -->
                <template v-else-if="header.column.id === '_rowNum'">
                  <span class="text-muted-foreground/50">#</span>
                </template>

                <!-- Schema-aware column header -->
                <template v-else-if="hasSchema && getFieldForKey(header.column.id)">
                  <ColumnHeader
                    :field="getFieldForKey(header.column.id)!"
                    :sort-direction="header.column.getIsSorted() || false"
                    :can-sort="header.column.getCanSort()"
                    @sort="header.column.getToggleSortingHandler()?.($event as any)"
                    @update:field="(updates) => handleFieldUpdate(getFieldForKey(header.column.id)!.id, updates)"
                    @delete="handleFieldDelete(getFieldForKey(header.column.id)!.id)" />
                </template>

                <!-- Fallback: auto-derived column header -->
                <div
                  v-else-if="!header.isPlaceholder"
                  class="flex items-center gap-1"
                  :class="{
                    'cursor-pointer select-none hover:text-foreground': header.column.getCanSort(),
                  }"
                  @click="header.column.getToggleSortingHandler()?.($event)">
                  <FlexRender
                    :render="header.column.columnDef.header"
                    :props="header.getContext()" />
                  <Icon
                    v-if="header.column.getIsSorted()"
                    :name="
                      header.column.getIsSorted() === 'asc'
                        ? 'lucide:chevron-up'
                        : 'lucide:chevron-down'
                    "
                    class="h-3 w-3 shrink-0" />
                </div>
              </th>

              <!-- Add column header -->
              <th
                v-if="hasSchema"
                class="border-b border-border px-1 py-2 text-center w-10 min-w-10">
                <UiPopover v-model:open="addColumnOpen">
                  <UiPopoverTrigger as-child>
                    <button
                      type="button"
                      class="h-6 w-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors mx-auto"
                      title="Add column">
                      <Icon name="lucide:plus" class="h-3.5 w-3.5" />
                    </button>
                  </UiPopoverTrigger>
                  <UiPopoverContent align="start" :side-offset="4" class="w-56 p-3">
                    <div class="space-y-3">
                      <div class="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        New Column
                      </div>
                      <div class="space-y-2">
                        <input
                          ref="newColumnNameRef"
                          v-model="newColumnName"
                          type="text"
                          placeholder="Column name"
                          class="h-8 w-full rounded-md border border-border bg-background px-2.5 text-sm outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary"
                          @keydown.enter="handleAddColumn"
                          @keydown.escape="addColumnOpen = false" />
                        <select
                          v-model="newColumnType"
                          class="h-8 w-full rounded-md border border-border bg-background px-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary">
                          <option value="text">Text</option>
                          <option value="number">Number</option>
                          <option value="select">Select</option>
                          <option value="multiselect">Multiselect</option>
                          <option value="date">Date</option>
                          <option value="checkbox">Checkbox</option>
                          <option value="url">URL</option>
                          <option value="email">Email</option>
                          <option value="formula">Formula</option>
                          <option value="relation">Relation</option>
                        </select>
                        <!-- Entity type selector for relation columns -->
                        <select
                          v-if="newColumnType === 'relation'"
                          v-model="newColumnEntityType"
                          class="h-8 w-full rounded-md border border-border bg-background px-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary">
                          <option value="any">Any entity</option>
                          <option
                            v-for="opt in entityTypeOptions"
                            :key="opt.value"
                            :value="opt.value">
                            {{ opt.label }}
                          </option>
                        </select>
                      </div>
                      <UiButton
                        size="sm"
                        class="w-full"
                        :disabled="!newColumnName.trim()"
                        @click="handleAddColumn">
                        <Icon name="lucide:plus" class="mr-2 h-3.5 w-3.5" />
                        Add Column
                      </UiButton>
                    </div>
                  </UiPopoverContent>
                </UiPopover>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in table.getRowModel().rows"
              :key="row.id"
              class="group/row border-b border-border transition-colors"
              :class="row.getIsSelected() ? 'bg-primary/5' : 'hover:bg-muted/30'">
              <td
                v-for="cell in row.getVisibleCells()"
                :key="cell.id"
                class="border-r border-border px-3 py-1.5 align-top"
                :style="{
                  width: `${cell.column.getSize()}px`,
                  minWidth: `${cell.column.getSize()}px`,
                }">
                <!-- Row selection checkbox -->
                <template v-if="cell.column.id === '_select'">
                  <div class="flex items-center justify-center min-h-8">
                    <input
                      type="checkbox"
                      class="h-3.5 w-3.5 rounded border-border accent-primary cursor-pointer"
                      :checked="row.getIsSelected()"
                      @change="row.getToggleSelectedHandler()($event)" />
                  </div>
                </template>

                <!-- Row number with delete action -->
                <template v-else-if="cell.column.id === '_rowNum'">
                  <div class="flex items-center gap-1 min-h-8">
                    <span class="text-xs text-muted-foreground tabular-nums group-hover/row:hidden">
                      {{ row.index + 1 }}
                    </span>
                    <UiDropdownMenu>
                      <UiDropdownMenuTrigger as-child>
                        <button
                          type="button"
                          class="h-5 w-5 rounded items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent hidden group-hover/row:flex"
                          @click.stop>
                          <Icon name="lucide:more-horizontal" class="h-3 w-3" />
                        </button>
                      </UiDropdownMenuTrigger>
                      <UiDropdownMenuContent align="start" :side-offset="4" class="w-40">
                        <UiDropdownMenuItem
                          class="text-destructive focus:text-destructive"
                          @click="handleDeleteRow(row.original._rowIndex)">
                          <Icon name="lucide:trash-2" class="mr-2 h-4 w-4" />
                          Delete row
                        </UiDropdownMenuItem>
                      </UiDropdownMenuContent>
                    </UiDropdownMenu>
                  </div>
                </template>

                <!-- Schema-aware editable cell -->
                <template v-else-if="hasSchema && getFieldForKey(cell.column.id)">
                  <EditableCell
                    :value="cell.getValue()"
                    :field="getFieldForKey(cell.column.id)!"
                    :row-id="String(row.original._rowIndex)"
                    :row-data="row.original"
                    @update="(value: any) => handleCellUpdate(row.original._rowIndex, cell.column.id, value)" />
                </template>

                <!-- Fallback: read-only cell renderer -->
                <template v-else>
                  <CellRenderer
                    :value="cell.getValue()"
                    :column-key="cell.column.id"
                    :cell-key="`${row.id}-${cell.column.id}`"
                    :expanded="expandedCells.has(`${row.id}-${cell.column.id}`)"
                    :detect-cell-type="detectCellType"
                    :format-cell-value="formatCellValue"
                    @toggle-expand="toggleCellExpanded(`${row.id}-${cell.column.id}`)" />
                </template>
              </td>

              <!-- Empty cell for add-column column -->
              <td v-if="hasSchema" class="border-border w-10 min-w-10" />
            </tr>

            <!-- Add row button -->
            <tr v-if="hasSchema" class="border-b border-border">
              <td :colspan="columns.length + 1" class="px-3 py-0">
                <button
                  type="button"
                  class="flex w-full items-center gap-2 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  @click="handleAddRow">
                  <Icon name="lucide:plus" class="h-3.5 w-3.5" />
                  <span>New</span>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Floating batch action bar -->
      <Transition
        enter-active-class="transition-all duration-200 ease-out"
        leave-active-class="transition-all duration-150 ease-in"
        enter-from-class="translate-y-4 opacity-0"
        enter-to-class="translate-y-0 opacity-100"
        leave-from-class="translate-y-0 opacity-100"
        leave-to-class="translate-y-4 opacity-0">
        <div
          v-if="hasSelection"
          class="absolute bottom-20 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 shadow-lg">
          <!-- Selection count -->
          <span class="text-xs font-medium tabular-nums">
            {{ selectedRowCount }} selected
          </span>

          <div class="h-4 w-px bg-border" />

          <!-- Duplicate -->
          <UiButton
            variant="ghost"
            size="sm"
            class="h-7 gap-1.5 text-xs"
            @click="handleBatchDuplicate">
            <Icon name="lucide:copy" class="h-3.5 w-3.5" />
            Duplicate
          </UiButton>

          <!-- Edit Field -->
          <UiPopover v-model:open="batchEditOpen">
            <UiPopoverTrigger as-child>
              <UiButton
                v-if="batchEditFieldOptions.length > 0"
                variant="ghost"
                size="sm"
                class="h-7 gap-1.5 text-xs">
                <Icon name="lucide:pencil" class="h-3.5 w-3.5" />
                Edit field
              </UiButton>
            </UiPopoverTrigger>
            <UiPopoverContent align="center" :side-offset="8" class="w-64 p-3">
              <div class="space-y-3">
                <div class="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Set field for {{ selectedRowCount }} row{{ selectedRowCount !== 1 ? 's' : '' }}
                </div>
                <select
                  v-model="batchEditField"
                  class="h-8 w-full rounded-md border border-border bg-background px-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary">
                  <option value="" disabled>Choose field…</option>
                  <option
                    v-for="opt in batchEditFieldOptions"
                    :key="opt.value"
                    :value="opt.value">
                    {{ opt.label }}
                  </option>
                </select>
                <template v-if="batchEditField">
                  <!-- Checkbox field -->
                  <label v-if="batchEditFieldType === 'checkbox'" class="flex items-center gap-2 text-sm">
                    <input
                      v-model="batchEditValue"
                      type="checkbox"
                      class="h-4 w-4 rounded border-border accent-primary" />
                    {{ batchEditValue ? 'Checked' : 'Unchecked' }}
                  </label>
                  <!-- Select field -->
                  <select
                    v-else-if="(batchEditFieldType === 'select' || batchEditFieldType === 'multiselect') && batchEditFieldConfig?.options"
                    v-model="batchEditValue"
                    class="h-8 w-full rounded-md border border-border bg-background px-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary">
                    <option value="" disabled>Choose value…</option>
                    <option
                      v-for="opt in batchEditFieldConfig.options"
                      :key="opt.value"
                      :value="opt.value">
                      {{ opt.value }}
                    </option>
                  </select>
                  <!-- Number field -->
                  <input
                    v-else-if="batchEditFieldType === 'number'"
                    v-model.number="batchEditValue"
                    type="number"
                    placeholder="Enter value"
                    class="h-8 w-full rounded-md border border-border bg-background px-2.5 text-sm outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary" />
                  <!-- Date field -->
                  <input
                    v-else-if="batchEditFieldType === 'date'"
                    v-model="batchEditValue"
                    type="date"
                    class="h-8 w-full rounded-md border border-border bg-background px-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
                  <!-- Default text field -->
                  <input
                    v-else
                    v-model="batchEditValue"
                    type="text"
                    placeholder="Enter value"
                    class="h-8 w-full rounded-md border border-border bg-background px-2.5 text-sm outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary"
                    @keydown.enter="handleBatchSetField" />
                </template>
                <UiButton
                  size="sm"
                  class="w-full"
                  :disabled="!batchEditField"
                  @click="handleBatchSetField">
                  Apply to {{ selectedRowCount }} row{{ selectedRowCount !== 1 ? 's' : '' }}
                </UiButton>
              </div>
            </UiPopoverContent>
          </UiPopover>

          <!-- Delete -->
          <UiButton
            variant="ghost"
            size="sm"
            class="h-7 gap-1.5 text-xs text-destructive hover:text-destructive"
            @click="handleBatchDelete">
            <Icon name="lucide:trash-2" class="h-3.5 w-3.5" />
            Delete
          </UiButton>

          <div class="h-4 w-px bg-border" />

          <!-- Clear selection -->
          <UiButton
            variant="ghost"
            size="sm"
            class="h-7 text-xs text-muted-foreground"
            @click="clearSelection">
            <Icon name="lucide:x" class="h-3.5 w-3.5" />
          </UiButton>
        </div>
      </Transition>
    </template>
  </div>
</template>
