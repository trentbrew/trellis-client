<script setup lang="ts" generic="TData extends { id: string }">
  import {
    FlexRender,
    getCoreRowModel,
    getSortedRowModel,
    getFilteredRowModel,
    useVueTable,
    type ColumnDef,
    type SortingState,
    type ColumnFiltersState,
  } from '@tanstack/vue-table'
  import EditableCell from './EditableCell.vue'
  import type { DatabaseField } from '~/types/database'

  interface Props {
    data: TData[]
    columns: ColumnDef<TData, any>[]
    fields: DatabaseField[]
    onUpdate?: (rowId: string, fieldId: string, value: any) => Promise<void>
    onDelete?: (rowId: string) => void
    onAdd?: () => void
  }

  const props = defineProps<Props>()

  const sorting = ref<SortingState>([])
  const columnFilters = ref<ColumnFiltersState>([])
  const globalFilter = ref('')

  const savingCells = ref<Set<string>>(new Set())

  const handleCellUpdate = async (rowId: string, fieldId: string, value: any) => {
    const cellKey = `${rowId}-${fieldId}`
    savingCells.value.add(cellKey)

    try {
      await props.onUpdate?.(rowId, fieldId, value)
    } finally {
      savingCells.value.delete(cellKey)
    }
  }

  const isCellSaving = (rowId: string, fieldId: string) => {
    return savingCells.value.has(`${rowId}-${fieldId}`)
  }

  const fieldMap = computed(() => {
    const map = new Map<string, DatabaseField>()
    props.fields.forEach((field) => {
      map.set(field.id, field)
    })
    return map
  })

  const getFieldFromColumn = (columnId: string): DatabaseField | undefined => {
    const fieldId = columnId.replace('fields.', '')
    return fieldMap.value.get(fieldId)
  }

  const table = useVueTable({
    get data() {
      return props.data
    },
    get columns() {
      return props.columns
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      get sorting() {
        return sorting.value
      },
      get columnFilters() {
        return columnFilters.value
      },
      get globalFilter() {
        return globalFilter.value
      },
    },
    onSortingChange: (updater) => {
      sorting.value = typeof updater === 'function' ? updater(sorting.value) : updater
    },
    onColumnFiltersChange: (updater) => {
      columnFilters.value = typeof updater === 'function' ? updater(columnFilters.value) : updater
    },
    onGlobalFilterChange: (updater) => {
      globalFilter.value = typeof updater === 'function' ? updater(globalFilter.value) : updater
    },
  })
</script>

<template>
  <div class="flex h-full flex-col">
    <!-- Toolbar -->
    <div class="border-b border-border bg-card p-4">
      <div class="flex items-center justify-between gap-4">
        <div class="flex flex-1 items-center gap-2">
          <div class="relative flex-1 max-w-sm">
            <Icon name="lucide:search" class="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
            <UiInput v-model="globalFilter" placeholder="Search..." class="pl-9" />
          </div>
          <UiButton variant="outline" size="sm">
            <Icon name="lucide:filter" class="mr-2 h-4 w-4" />
            Filter
          </UiButton>
          <UiButton variant="outline" size="sm">
            <Icon name="lucide:arrow-up-down" class="mr-2 h-4 w-4" />
            Sort
          </UiButton>
        </div>
        <UiButton size="sm" @click="onAdd?.()">
          <Icon name="lucide:plus" class="mr-2 h-4 w-4" />
          Add Record
        </UiButton>
      </div>
    </div>

    <!-- Table -->
    <div class="flex-1 overflow-auto">
      <table class="w-full border-collapse">
        <thead class="bg-muted/50 sticky top-0 z-10">
          <tr v-for="headerGroup in table.getHeaderGroups()" :key="headerGroup.id">
            <th
              v-for="header in headerGroup.headers"
              :key="header.id"
              class="border-b border-border px-4 py-3 text-left text-sm font-medium"
              :style="{ width: header.getSize() !== 150 ? `${header.getSize()}px` : undefined }"
            >
              <div
                v-if="!header.isPlaceholder"
                class="flex items-center gap-2"
                :class="{ 'cursor-pointer select-none': header.column.getCanSort() }"
                @click="header.column.getToggleSortingHandler()?.($event)"
              >
                <FlexRender :render="header.column.columnDef.header" :props="header.getContext()" />
                <Icon
                  v-if="header.column.getIsSorted()"
                  :name="header.column.getIsSorted() === 'asc' ? 'lucide:arrow-up' : 'lucide:arrow-down'"
                  class="h-3.5 w-3.5"
                />
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in table.getRowModel().rows"
            :key="row.id"
            class="hover:bg-muted/50 border-b border-border transition-colors"
          >
            <td v-for="cell in row.getVisibleCells()" :key="cell.id" class="px-4 py-3">
              <EditableCell
                v-if="getFieldFromColumn(cell.column.id)"
                :value="cell.getValue()"
                :field="getFieldFromColumn(cell.column.id)!"
                :row-id="row.original.id"
                :row-data="row.original"
                :is-loading="isCellSaving(row.original.id, getFieldFromColumn(cell.column.id)!.id)"
                @update="
                  (value: any) => handleCellUpdate(row.original.id, getFieldFromColumn(cell.column.id)!.id, value)
                "
              />
              <FlexRender v-else :render="cell.column.columnDef.cell" :props="cell.getContext()" />
            </td>
          </tr>
          <tr v-if="table.getRowModel().rows.length === 0">
            <td :colspan="table.getAllColumns().length" class="py-12 text-center">
              <div class="flex flex-col items-center gap-2">
                <Icon name="lucide:inbox" class="text-muted-foreground h-8 w-8" />
                <p class="text-muted-foreground text-sm">No records found</p>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Footer -->
    <div class="border-t border-border bg-card p-4">
      <div class="flex items-center justify-between text-sm text-muted-foreground">
        <div>
          {{ table.getFilteredRowModel().rows.length }} record{{
            table.getFilteredRowModel().rows.length !== 1 ? 's' : ''
          }}
        </div>
        <div class="flex items-center gap-2">
          <span>Page 1 of 1</span>
        </div>
      </div>
    </div>
  </div>
</template>
