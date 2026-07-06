import type { SheetColumn, SheetDefinition } from '~/types/sheet'
import { parseA1Range, toA1Ref, semanticFormulaToA1 } from '~/lib/sheet-a1'
import { useSSEStatus } from '~/composables/useTrellisSSE'
import { entityId as toEntityId } from '~/lib/tql-namespace'
import { normalizeSheetFormula } from '~/lib/sheet-cell-key'
import { inferEntityTypeFromEqls } from '~/lib/sheet-query-infer'

function parseColumns(raw: unknown, data: Record<string, unknown> = {}): SheetColumn[] {
  if (Array.isArray(raw)) {
    return raw.filter((c) => c && typeof c === 'object' && 'id' in c && 'attribute' in c) as SheetColumn[]
  }
  const ids = data['columns.id']
  if (!Array.isArray(ids)) return []
  const attrs = (data['columns.attribute'] as string[]) ?? []
  const kinds = (data['columns.kind'] as string[]) ?? []
  const labels = (data['columns.label'] as string[]) ?? []
  const formulasRaw = data['columns.formula']

  return ids.map((id, i) => {
    const attribute = String(attrs[i] ?? id)
    const kindRaw = kinds.length === ids.length ? kinds[i] : undefined
    const kind = (kindRaw ?? inferColumnKind(String(id), attribute)) as SheetColumn['kind']
    const col: SheetColumn = {
      id: String(id),
      attribute,
      kind,
      label: labels[i] ? String(labels[i]) : undefined,
    }
    if (kind === 'formula') {
      const formula = Array.isArray(formulasRaw)
        ? formulasRaw[i]
        : typeof formulasRaw === 'string'
          ? formulasRaw
          : undefined
      if (formula) col.formula = String(formula)
    }
    return col
  })
}

function inferColumnKind(id: string, attribute: string): SheetColumn['kind'] {
  if (id === 'remaining' || attribute === 'remaining') return 'formula'
  if (id === 'owner' || attribute === 'ownerId') return 'relation'
  if (attribute === 'category') return 'select'
  if (['budgeted', 'spent', 'amount'].includes(attribute)) return 'number'
  return 'text'
}

function rowEntityId(row: Record<string, unknown>): string {
  const id = row['?e'] ?? row['?t'] ?? row['?row'] ?? row.id ?? row['@id'] ?? row.entityId
  return typeof id === 'string' ? id : ''
}

function rowData(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(row)) {
    if (key === '?e' || key === '?t' || key === '?row') continue
    if (key.startsWith('?e.')) {
      out[key.slice(3)] = value
    } else if (key.startsWith('?t.')) {
      out[key.slice(3)] = value
    } else {
      out[key] = value
    }
  }
  return out
}

/**
 * Reactive sheet projection — TQL rows, column schema, range reads, cell mutations.
 */
export function useSheetProjection(sheetIdInput: MaybeRef<string>) {
  const sheetId = computed(() => unref(sheetIdInput))
  const { query, fetchNode, mutate } = useTrellisGraph()
  const sseConnected = useSSEStatus()

  const sheetDef = ref<SheetDefinition | null>(null)
  const sheetLoading = ref(true)
  const sheetError = ref<string | null>(null)

  async function loadSheetMeta() {
    if (!sheetId.value) return
    sheetLoading.value = true
    sheetError.value = null
    try {
      const id = sheetId.value.includes(':') ? sheetId.value : toEntityId(sheetId.value)
      const { node } = await fetchNode(id)
      const data = node?.data ?? node ?? {}
      sheetDef.value = {
        title: (data.title as string) || 'Sheet',
        query: (data.query as string) || '',
        columns: parseColumns(data.columns, data),
        formulas: Array.isArray(data.formulas) ? data.formulas : [],
        zoneId: data.zoneId as string | undefined,
        facilityId: data.facilityId as string | undefined,
      }
    } catch (e: unknown) {
      sheetError.value = e instanceof Error ? e.message : 'Failed to load sheet'
      sheetDef.value = null
    } finally {
      sheetLoading.value = false
    }
  }

  watch(sheetId, () => loadSheetMeta(), { immediate: true })

  const rowQuery = computed(() => sheetDef.value?.query ?? '')
  const { data: rawRows, loading: rowsLoading, error: rowsError } = query(rowQuery)

  const rows = computed(() => {
    return (rawRows.value || [])
      .map((r) => ({
        entityId: rowEntityId(r),
        data: rowData(r),
      }))
      .filter((r) => r.entityId)
  })

  const columns = computed(() => sheetDef.value?.columns ?? [])

  const { evaluateSingleFormula } = useCollectionFormulas(sheetId.value || 'sheet')

  function getCellValue(entityId: string, column: SheetColumn, _rowIndex: number): unknown {
    const row = rows.value.find((r) => r.entityId === entityId)
    if (!row) return undefined
    if (column.kind === 'formula' && column.formula) {
      try {
        const expr = normalizeSheetFormula(column.formula)
        return evaluateSingleFormula(expr, row.data, rows.value.map((r) => r.data))
      } catch {
        return '⚠️'
      }
    }
    return row.data[column.attribute]
  }

  function getDisplayFormula(column: SheetColumn, rowIndex: number, mode: 'a1' | 'attrs'): string {
    const expr = column.formula || ''
    if (!expr) return ''
    if (mode === 'attrs') {
      let semantic = expr.startsWith('=') ? expr : `=${expr}`
      for (const col of columns.value) {
        semantic = semantic.replace(new RegExp(`\\b${col.attribute}\\b`, 'g'), `this.${col.attribute}`)
      }
      return semantic
    }
    return semanticFormulaToA1(expr, rowIndex, columns.value)
  }

  async function updateCell(entityId: string, attribute: string, value: unknown): Promise<void> {
    await mutate({
      action: 'updateNode',
      entityId,
      type: 'entity',
      data: { [attribute]: value },
    })
  }

  async function updateColumnsOrder(ordered: SheetColumn[]): Promise<void> {
    const id = sheetId.value.includes(':') ? sheetId.value : toEntityId(sheetId.value)
    await mutate({
      action: 'updateNode',
      entityId: id,
      type: 'entity',
      data: { columns: ordered },
    })
    if (sheetDef.value) sheetDef.value = { ...sheetDef.value, columns: ordered }
  }

  async function updateRelationCell(
    entityId: string,
    attribute: string,
    personId: string | null,
    relationType = 'assignedTo',
  ): Promise<void> {
    await updateCell(entityId, attribute, personId ?? '')
    if (personId) {
      await mutate({
        action: 'link',
        e1: entityId,
        relation: relationType,
        e2: personId,
      }).catch(() => undefined)
    }
  }

  async function insertRow(defaults?: Record<string, unknown>): Promise<string | null> {
    if (!sheetDef.value?.query) return null
    const entityType = inferEntityTypeFromEqls(sheetDef.value.query) ?? 'entity'
    const entityId = `entity:${entityType}-${Date.now()}`
    const data: Record<string, unknown> = {
      type: entityType,
      title: 'New row',
      quarter: 'Q3-2026',
      ...defaults,
    }
    if (sheetDef.value.zoneId) data.zoneId = sheetDef.value.zoneId
    if (sheetDef.value.facilityId) data.facilityId = sheetDef.value.facilityId

    await mutate({
      action: 'createNode',
      entityId,
      type: 'entity',
      data,
    })
    rawRows.value = [
      ...rawRows.value,
      {
        '?e': entityId,
        '?e.title': data.title,
        '?e.category': data.category ?? '',
        '?e.budgeted': data.budgeted ?? '',
        '?e.spent': data.spent ?? '',
      },
    ]
    return entityId
  }

  function readRange(rangeStr: string): {
    headers: string[]
    cells: string[][]
  } {
    const range = parseA1Range(rangeStr)
    if (!range || !columns.value.length) return { headers: [], cells: [] }

    const cols = columns.value.slice(range.startCol, range.endCol + 1)
    const headers = cols.map((c) => c.label || c.attribute)

    const cells: string[][] = []
    for (let a1RowIdx = range.startRow; a1RowIdx <= range.endRow; a1RowIdx++) {
      // A1 row 1 = column headers (rendered separately); row 2+ = data rows[0..]
      if (a1RowIdx === 0) continue
      const dataIdx = a1RowIdx - 1
      if (dataIdx >= rows.value.length) continue
      const row = rows.value[dataIdx]
      if (!row) continue
      const line: string[] = []
      for (const col of cols) {
        const v = getCellValue(row.entityId, col, dataIdx)
        line.push(v == null ? '' : String(v))
      }
      cells.push(line)
    }
    return { headers, cells }
  }

  function footerAggregate(formula: string): unknown {
    try {
      const records = rows.value.map((r) => r.data)
      return evaluateSingleFormula(formula, {}, records)
    } catch {
      return null
    }
  }

  function cellRefLabel(rowIndex: number, colIndex: number): string {
    return toA1Ref(rowIndex, colIndex)
  }

  return {
    sheetDef,
    sheetLoading,
    sheetError,
    rows,
    columns,
    rowsLoading,
    rowsError,
    sseConnected,
    getCellValue,
    getDisplayFormula,
    updateCell,
    updateColumnsOrder,
    updateRelationCell,
    insertRow,
    readRange,
    footerAggregate,
    cellRefLabel,
    reload: loadSheetMeta,
  }
}

export type SheetProjection = ReturnType<typeof useSheetProjection>
