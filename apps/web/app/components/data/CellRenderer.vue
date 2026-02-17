<script setup lang="ts">
  type CellType = 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object' | 'null' | 'id'

  const props = defineProps<{
    value: any
    columnKey: string
    cellKey: string
    expanded: boolean
    detectCellType: (value: any, key: string) => CellType
    formatCellValue: (value: any, type: CellType) => string
  }>()

  const emit = defineEmits<{
    toggleExpand: []
  }>()

  const cellType = computed(() => props.detectCellType(props.value, props.columnKey))
  const displayValue = computed(() => props.formatCellValue(props.value, cellType.value))

  const isExpandable = computed(() => {
    return cellType.value === 'object' || cellType.value === 'array'
  })

  const expandedJson = computed(() => {
    if (!isExpandable.value || !props.expanded) return ''
    try {
      return JSON.stringify(props.value, null, 2)
    } catch {
      return String(props.value)
    }
  })

  const idShort = computed(() => {
    if (cellType.value !== 'id') return ''
    const v = String(props.value)
    // Shorten long IDs: show prefix + last segment
    if (v.length > 30) {
      const parts = v.split('/')
      if (parts.length > 1) return `…/${parts[parts.length - 1]}`
      return `${v.slice(0, 8)}…${v.slice(-8)}`
    }
    return v
  })
</script>

<template>
  <div class="min-h-5 text-sm leading-tight">
    <!-- Null / empty -->
    <span v-if="cellType === 'null'" class="text-muted-foreground/50">{{ displayValue }}</span>

    <!-- Boolean -->
    <span
      v-else-if="cellType === 'boolean'"
      class="inline-flex h-5 w-5 items-center justify-center rounded text-xs"
      :class="value ? 'bg-emerald-500/15 text-emerald-500' : 'bg-muted text-muted-foreground'"
    >
      {{ displayValue }}
    </span>

    <!-- Date -->
    <span v-else-if="cellType === 'date'" class="text-foreground whitespace-nowrap">
      {{ displayValue }}
    </span>

    <!-- Number -->
    <span v-else-if="cellType === 'number'" class="text-foreground tabular-nums">
      {{ displayValue }}
    </span>

    <!-- ID (truncated with monospace) -->
    <span
      v-else-if="cellType === 'id'"
      class="font-mono text-xs text-muted-foreground truncate block max-w-full"
      :title="String(value)"
    >
      {{ idShort }}
    </span>

    <!-- Array / Object (expandable) -->
    <div v-else-if="isExpandable">
      <button
        class="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium transition-colors hover:bg-accent"
        :class="cellType === 'array' ? 'text-blue-400 bg-blue-500/10' : 'text-amber-400 bg-amber-500/10'"
        @click="emit('toggleExpand')"
      >
        <Icon
          :name="expanded ? 'lucide:chevron-down' : 'lucide:chevron-right'"
          class="h-3 w-3 shrink-0"
        />
        {{ displayValue }}
      </button>
      <pre
        v-if="expanded"
        class="mt-1.5 max-h-48 overflow-auto rounded border border-border bg-muted/50 p-2 text-[11px] leading-relaxed text-muted-foreground font-mono"
      >{{ expandedJson }}</pre>
    </div>

    <!-- Default string -->
    <span v-else class="text-foreground">{{ displayValue }}</span>
  </div>
</template>
