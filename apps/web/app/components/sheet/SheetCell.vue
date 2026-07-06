<script setup lang="ts">
  import type { SheetColumn } from '~/types/sheet'
  import type { EditorLease } from '~/composables/useEditorLease'
  import RelationCellEditor from './RelationCellEditor.vue'
  import StatusChip from '~/components/data/StatusChip.vue'
  import { makeSheetCellKey } from '~/lib/sheet-cell-key'

  const props = defineProps<{
    entityId: string
    column: SheetColumn
    rowIndex: number
    colIndex: number
    value: unknown
    focused: boolean
    selected: boolean
    lease: EditorLease
    updateRelationCell: (
      entityId: string,
      attribute: string,
      personId: string | null,
      relationType?: string,
    ) => Promise<void>
    people: Array<{ id: string; title: string }>
    resolvePersonTitle: (id: string | null | undefined) => Promise<string>
  }>()

  const emit = defineEmits<{
    focus: [row: number, col: number]
  }>()

  const cellKey = computed(() => makeSheetCellKey(props.entityId, props.column.id))
  const isLeased = computed(() => props.lease.isActive(cellKey.value))
  const mountRef = ref<HTMLElement | null>(null)

  const numValue = computed(() => {
    const n = Number(props.value)
    return Number.isFinite(n) ? n : null
  })

  const displayValue = computed(() => {
    if (props.value == null || props.value === '') return ''
    if (props.column.kind === 'number' || props.column.kind === 'formula') {
      if (numValue.value == null) return String(props.value)
      return numValue.value.toLocaleString(undefined, { minimumFractionDigits: 2 })
    }
    return String(props.value)
  })

  async function mountLeaseEditor() {
    await props.lease.acquire(cellKey.value, null, displayValue.value)
    await nextTick()
    if (mountRef.value) {
      await props.lease.acquire(cellKey.value, mountRef.value, displayValue.value)
    }
  }

  async function onDblClick() {
    if (props.column.kind !== 'text') return
    emit('focus', props.rowIndex, props.colIndex)
    await mountLeaseEditor()
  }

  async function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && props.column.kind === 'text') {
      e.preventDefault()
      await onDblClick()
    }
    if (e.key === 'Escape' && isLeased.value) {
      e.preventDefault()
      await props.lease.release()
    }
  }

  function onClick() {
    emit('focus', props.rowIndex, props.colIndex)
  }

  async function onRelationSelect(personId: string | null) {
    await props.updateRelationCell(
      props.entityId,
      props.column.attribute,
      personId,
      props.column.relationType,
    )
  }
</script>

<template>
  <td
    class="border border-border px-3 py-1.5 text-sm whitespace-nowrap"
    :class="{
      'outline outline-2 outline-[var(--selection,#6366f1)] outline-offset-[-2px] bg-muted/30': focused || isLeased,
      'bg-[color-mix(in_oklch,var(--selection)_14%,transparent)] shadow-[inset_0_0_0_1px_color-mix(in_oklch,var(--selection)_55%,var(--border))]':
        selected && !focused && !isLeased,
      'sheet-cell-derived font-data text-right': column.kind === 'formula' || column.kind === 'number',
      'sheet-cell-derived-negative': column.kind === 'formula' && numValue != null && numValue < 0,
      'text-right font-data tabular-nums': column.kind === 'number',
    }"
    :aria-selected="focused || selected || isLeased"
    :tabindex="focused ? 0 : -1"
    :data-testid="focused ? 'sheet-focused-cell' : undefined"
    @click="onClick"
    @dblclick="onDblClick"
    @keydown="onKeydown"
  >
    <RelationCellEditor
      v-if="column.kind === 'relation'"
      :column="column"
      :value="value"
      :focused="focused"
      :people="people"
      :resolve-title="resolvePersonTitle"
      @select="onRelationSelect"
    />
    <div
      v-else-if="isLeased && column.kind === 'text'"
      ref="mountRef"
      class="min-h-[1.75rem]"
      aria-label="Cell editor"
    />
    <StatusChip
      v-else-if="column.kind === 'select' && displayValue"
      :label="displayValue"
      tone="default"
    />
    <span v-else-if="column.kind === 'formula'">{{ displayValue }}</span>
    <span v-else>{{ displayValue }}</span>
  </td>
</template>
