<script setup lang="ts">
  import SheetFormulaBar from './SheetFormulaBar.vue'
  import SheetGrid from './SheetGrid.vue'
  import { useSheetProjection } from '~/composables/useSheetProjection'
  import { useEditorLease } from '~/composables/useEditorLease'
  import { useSheetSelection } from '~/composables/useSheetSelection'
  import { useSheetPeople } from '~/composables/useSheetPeople'
  import { isEditableColumn } from '~/composables/useSheetKeyboardNav'
  import { parseSheetCellKey } from '~/lib/sheet-cell-key'

  const props = defineProps<{
    sheetId: string
  }>()

  const sheetSlug = computed(() =>
    props.sheetId.replace(/^entity:sheet-/, '').replace(/^entity:/, ''),
  )

  const {
    sheetDef,
    sheetLoading,
    sheetError,
    rows,
    columns,
    rowsLoading,
    sseConnected,
    getCellValue,
    getDisplayFormula,
    updateCell,
    updateColumnsOrder,
    updateRelationCell,
    footerAggregate,
    insertRow,
  } = useSheetProjection(toRef(props, 'sheetId'))

  const { people, resolvePersonTitle } = useSheetPeople()

  const rowCount = computed(() => rows.value.length)
  const colCount = computed(() => columns.value.length)
  const {
    selection,
    selectCell,
    moveFocus,
    extendFocus,
    rangeLabel,
    isMultiCell,
  } = useSheetSelection(rowCount, colCount)

  const insertingRow = ref(false)

  const refMode = ref<'a1' | 'attrs'>('a1')
  const leaseHtml = ref('')

  const lease = useEditorLease(async (cellKey, html) => {
    const parsed = parseSheetCellKey(cellKey)
    if (!parsed) return
    const col = columns.value.find((c) => c.id === parsed.columnId)
    if (!col) return
    const trimmed = html.replace(/^<p><\/p>$/i, '').trim()
    const plain = trimmed.replace(/<[^>]+>/g, '').trim()
    await updateCell(parsed.entityId, col.attribute, plain ? trimmed : '')
  })

  watch(
    () => lease.pendingHtml.value,
    (html) => {
      if (lease.cellKey.value) leaseHtml.value = html
    },
  )

  watch(leaseHtml, (html) => {
    if (lease.cellKey.value) lease.setContent(html)
  })

  const focusedColumn = computed(() => columns.value[selection.value.focus.col])
  const focusedRowEntity = computed(() => rows.value[selection.value.focus.row])

  const formulaBarRef = computed(() => {
    if (!columns.value.length || !rows.value.length) return '—'
    return rangeLabel()
  })

  const formulaBarText = computed(() => {
    if (isMultiCell()) return '(multi-cell selection)'
    const col = focusedColumn.value
    const row = focusedRowEntity.value
    if (!col || !row) return ''
    if (col.kind === 'formula' && col.formula) {
      return getDisplayFormula(col, selection.value.focus.row, refMode.value)
    }
    const v = getCellValue(row.entityId, col, selection.value.focus.row)
    return v == null ? '' : String(v)
  })

  function onSelectCell(row: number, col: number) {
    selectCell(row, col)
  }

  function onMoveFocus(dr: number, dc: number, extend: boolean) {
    moveFocus(dr, dc, extend)
  }

  function onTabFocus(direction: 1 | -1) {
    const { row, col } = selection.value.focus
    let c = col + direction
    while (c >= 0 && c < columns.value.length) {
      if (isEditableColumn(columns.value[c]!)) {
        selectCell(row, c)
        return
      }
      c += direction
    }
    const nr = row + direction
    if (nr < 0 || nr >= rows.value.length) return
    c = direction > 0 ? 0 : columns.value.length - 1
    while (c >= 0 && c < columns.value.length) {
      if (isEditableColumn(columns.value[c]!)) {
        selectCell(nr, c)
        return
      }
      c += direction
    }
  }

  function onExtendFocus(row: number, col: number) {
    extendFocus(row, col)
  }

  async function onInsertRow() {
    if (insertingRow.value || sheetLoading.value || rowsLoading.value) return
    insertingRow.value = true
    try {
      await lease.release()
      const entityId = await insertRow()
      if (!entityId) return
      await nextTick()
      const idx = rows.value.findIndex((r) => r.entityId === entityId)
      if (idx >= 0) selectCell(idx, 0)
    } finally {
      insertingRow.value = false
    }
  }

  function sumColumn(attr: string): string {
    const vals = rows.value
      .map((r) => Number(r.data[attr]))
      .filter((n) => Number.isFinite(n))
    if (!vals.length) return ''
    return vals.reduce((a, b) => a + b, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })
  }
</script>

<template>
  <div class="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-lg">
    <div class="flex shrink-0 flex-wrap items-center gap-2 border-b border-border bg-surface-2 px-3 py-2.5 text-xs">
      <span class="truncate font-medium">{{ sheetDef?.title || sheetSlug }}</span>
      <span
        class="inline-flex items-center gap-1.5 rounded-full border border-[color-mix(in_oklch,var(--zone-workshop)_40%,var(--border))] bg-[color-mix(in_oklch,var(--zone-workshop)_10%,var(--card))] px-2.5 py-0.5 font-data text-[10px] uppercase tracking-wider"
      >
        <span class="size-1.5 rounded-full bg-[var(--zone-workshop)]" />
        PROJECTION
      </span>
      <code
        v-if="sheetDef?.query"
        class="max-w-md truncate rounded-md border border-border bg-muted/30 px-2 py-0.5 font-data text-[10px] text-muted-foreground"
      >
        {{ sheetDef.query }}
      </code>
      <span class="flex-1" />
      <UiButton
        size="sm"
        variant="outline"
        class="h-7 text-xs"
        aria-label="Insert row"
        data-testid="sheet-insert-row"
        :disabled="sheetLoading || rowsLoading || insertingRow"
        @click="onInsertRow"
      >
        Add row
      </UiButton>
      <span
        class="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-data text-[10px]"
        :class="
          sseConnected
            ? 'border-success/45 bg-success/10 text-success'
            : 'border-border text-muted-foreground'
        "
        aria-live="polite"
      >
        <span class="size-1.5 rounded-full" :class="sseConnected ? 'bg-success' : 'bg-muted-foreground'" />
        LIVE
      </span>
    </div>

    <div v-if="sheetLoading || rowsLoading" class="p-8 text-center text-sm text-muted-foreground">
      Loading projection…
    </div>
    <div v-else-if="sheetError" class="p-8 text-center text-sm text-destructive">{{ sheetError }}</div>

    <template v-else>
      <SheetFormulaBar
        class="shrink-0"
        :cell-ref="formulaBarRef"
        :formula="formulaBarText"
        :ref-mode="refMode"
        readonly
        @update:ref-mode="refMode = $event"
      />
      <ClientOnly>
        <SheetGrid
          class="min-h-0 flex-1"
          :rows="rows"
          :columns="columns"
          :sheet-id="sheetId"
          :get-cell-value="getCellValue"
          :lease="lease"
          :selection="selection"
          :update-columns-order="updateColumnsOrder"
          :update-cell="updateCell"
          :update-relation-cell="updateRelationCell"
          :people="people"
          :resolve-person-title="resolvePersonTitle"
          @select-cell="onSelectCell"
          @move-focus="onMoveFocus"
          @extend-focus="onExtendFocus"
          @tab-focus="onTabFocus"
        >
          <template #footer="{ column }">
            <span v-if="column.kind === 'number'" class="font-data">{{ sumColumn(column.attribute) }}</span>
            <span v-else-if="column.kind === 'formula' && column.attribute === 'remaining'" class="font-data">
              {{ footerAggregate('$sum(budgeted) - $sum(spent)') }}
            </span>
          </template>
        </SheetGrid>
        <template #fallback>
          <div class="flex min-h-[200px] flex-1 items-center justify-center text-sm text-muted-foreground">
            Loading grid…
          </div>
        </template>
      </ClientOnly>

      <Teleport v-if="lease.mountTarget.value && lease.cellKey.value" :to="lease.mountTarget.value">
        <UiRichTextEditor
          v-model="leaseHtml"
          compact
          seamless
          :embeds="true"
          :mentions="true"
          aria-label="Cell editor"
          @blur="lease.release()"
        />
      </Teleport>
    </template>
  </div>
</template>
