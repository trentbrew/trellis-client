<script setup lang="ts">
  import {
    FlexRender,
    getCoreRowModel,
    getSortedRowModel,
    getFilteredRowModel,
    useVueTable,
    type ColumnDef,
    type SortingState,
  } from '@tanstack/vue-table'

  const props = defineProps<{
    collectionId: string
    modelValue?: string
  }>()

  const _emit = defineEmits<{
    'update:modelValue': [value: string]
  }>()

  const rootEl = ref<HTMLElement | null>(null)
  const sorting = ref<SortingState>([])
  const globalFilter = ref('')
  const expandedCells = ref<Set<string>>(new Set())

  const scrollToTop = () => {
    const el = rootEl.value
    if (!el) return
    try {
      el.scrollTo({ top: 0, behavior: 'auto' })
    } catch {
      el.scrollTop = 0
    }
  }

  // --- Data extraction (kept from original) ---

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
    if (Array.isArray(root)) return { path: [], items: root }

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

    return { path: null, items: [] }
  })

  const sourceItems = computed<any[]>(() => {
    const { items } = recordsInfo.value
    if (!items || !Array.isArray(items)) return []
    return items.filter((x) => {
      if (!x || typeof x !== 'object' || Array.isArray(x)) return false
      const t = getNodeType(x)
      if (t === 'trellis:Collection') return false
      if (t === 'trellis:PropertyValueSpecification') return false
      return true
    })
  })

  const derivedKeys = computed<string[]>(() => {
    const items = sourceItems.value
    if (!items.length) return []

    const reserved = new Set(['_originalIndex', '@context'])
    const keys = new Set<string>()

    for (const item of items.slice(0, 100)) {
      Object.keys(item || {}).forEach((k) => {
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
      // Detect ISO date strings
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
    return sourceItems.value.map((item, index) => {
      const row: Record<string, any> = { _rowIndex: index }
      for (const key of derivedKeys.value) {
        row[key] = normalizeValue(item[key])
      }
      return row
    })
  })

  const columns = computed<ColumnDef<Record<string, any>, any>[]>(() => {
    // Row number column
    const rowNumCol: ColumnDef<Record<string, any>, any> = {
      id: '_rowNum',
      header: '#',
      size: 48,
      enableSorting: false,
      cell: ({ row }) => String(row.index + 1),
    }

    const dataCols: ColumnDef<Record<string, any>, any>[] = derivedKeys.value.map((key) => {
      // Determine a display-friendly header
      const header = key.includes(':') ? key.split(':').pop() || key : key

      return {
        id: key,
        accessorKey: key,
        header,
        size: key === '@id' || key === 'id' ? 220 : 160,
        cell: ({ getValue }) => getValue(),
      }
    })

    return [rowNumCol, ...dataCols]
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
    state: {
      get sorting() {
        return sorting.value
      },
      get globalFilter() {
        return globalFilter.value
      },
    },
    onSortingChange: (updater) => {
      sorting.value = typeof updater === 'function' ? updater(sorting.value) : updater
    },
    onGlobalFilterChange: (updater) => {
      globalFilter.value = typeof updater === 'function' ? updater(globalFilter.value) : updater
    },
  })

  defineExpose({ scrollToTop })
</script>

<template>
  <div ref="rootEl" class="flex h-full w-full flex-col overflow-hidden">
    <!-- Error state -->
    <div v-if="error" class="flex items-center justify-center p-8 text-destructive">
      <p>{{ error }}</p>
    </div>

    <!-- Empty state -->
    <div v-else-if="!sourceItems.length" class="flex flex-col items-center justify-center gap-2 p-12 text-muted-foreground">
      <Icon name="lucide:table" class="h-10 w-10 opacity-40" />
      <p class="text-sm">No data available</p>
    </div>

    <!-- Table -->
    <template v-else>
      <!-- Toolbar -->
      <div class="flex items-center gap-2 border-b border-border bg-card/50 px-3 py-2">
        <div class="relative flex-1 max-w-xs">
          <Icon name="lucide:search" class="text-muted-foreground absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2" />
          <input
            v-model="globalFilter"
            type="text"
            placeholder="Search records..."
            class="h-7 w-full rounded-md border border-border bg-background pl-8 pr-3 text-xs outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>
        <span class="text-xs text-muted-foreground">
          {{ table.getFilteredRowModel().rows.length }} record{{ table.getFilteredRowModel().rows.length !== 1 ? 's' : '' }}
        </span>
      </div>

      <!-- Scrollable table area -->
      <div class="flex-1 overflow-auto">
        <table class="w-full border-collapse text-sm">
          <thead class="bg-muted/50 sticky top-0 z-10">
            <tr v-for="headerGroup in table.getHeaderGroups()" :key="headerGroup.id">
              <th
                v-for="header in headerGroup.headers"
                :key="header.id"
                class="border-b border-r border-border px-3 py-2 text-left text-xs font-medium text-muted-foreground whitespace-nowrap"
                :style="{ width: `${header.getSize()}px`, minWidth: `${header.getSize()}px` }"
              >
                <div
                  v-if="!header.isPlaceholder"
                  class="flex items-center gap-1"
                  :class="{ 'cursor-pointer select-none hover:text-foreground': header.column.getCanSort() }"
                  @click="header.column.getToggleSortingHandler()?.($event)"
                >
                  <FlexRender :render="header.column.columnDef.header" :props="header.getContext()" />
                  <Icon
                    v-if="header.column.getIsSorted()"
                    :name="header.column.getIsSorted() === 'asc' ? 'lucide:chevron-up' : 'lucide:chevron-down'"
                    class="h-3 w-3 shrink-0"
                  />
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in table.getRowModel().rows"
              :key="row.id"
              class="border-b border-border transition-colors hover:bg-muted/30"
            >
              <td
                v-for="cell in row.getVisibleCells()"
                :key="cell.id"
                class="border-r border-border px-3 py-1.5 align-top"
                :style="{ width: `${cell.column.getSize()}px`, minWidth: `${cell.column.getSize()}px` }"
              >
                <!-- Row number -->
                <template v-if="cell.column.id === '_rowNum'">
                  <span class="text-xs text-muted-foreground tabular-nums">
                    <FlexRender :render="cell.column.columnDef.cell" :props="cell.getContext()" />
                  </span>
                </template>

                <!-- Data cells with type-aware rendering -->
                <template v-else>
                  <CellRenderer
                    :value="cell.getValue()"
                    :column-key="cell.column.id"
                    :cell-key="`${row.id}-${cell.column.id}`"
                    :expanded="expandedCells.has(`${row.id}-${cell.column.id}`)"
                    :detect-cell-type="detectCellType"
                    :format-cell-value="formatCellValue"
                    @toggle-expand="toggleCellExpanded(`${row.id}-${cell.column.id}`)"
                  />
                </template>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>
