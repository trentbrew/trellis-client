<script setup lang="ts">
  import { Worksheet } from '@jspreadsheet-ce/vue'

  import type JSpreadsheetCore from 'jspreadsheet-ce'

  const props = defineProps<{
    collectionId: string
    modelValue?: string
  }>()

  const emit = defineEmits<{
    'update:modelValue': [value: string]
  }>()

  const rootEl = ref<HTMLElement | null>(null)

  const spreadsheetRef = ref<any>(null)

  const worksheet = computed<JSpreadsheetCore.WorksheetInstance | null>(() => {
    const exposed = spreadsheetRef.value?.worksheet
    const v = (
      exposed && typeof exposed === 'object' && 'value' in exposed ? (exposed as any).value : null
    ) as JSpreadsheetCore.WorksheetInstance | null
    return v ?? null
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

  type IndexedItem = { item: any; index: number }

  const indexedSourceItems = computed<IndexedItem[]>(() => {
    const { items } = recordsInfo.value
    if (!items || !Array.isArray(items)) return []
    return items
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => {
        if (!item || typeof item !== 'object' || Array.isArray(item)) return false
        const t = getNodeType(item)
        if (t === 'trellis:Collection') return false
        if (t === 'trellis:PropertyValueSpecification') return false
        return true
      })
  })

  const sourceItems = computed<any[]>(() => indexedSourceItems.value.map((x) => x.item))
  const sourceItemIndexes = computed<number[]>(() => indexedSourceItems.value.map((x) => x.index))

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

  const toCellValue = (value: any): JSpreadsheetCore.CellValue => {
    const v = normalizeValue(value)
    if (v === null || v === undefined) return ''
    if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') return v
    try {
      return JSON.stringify(v)
    } catch {
      return String(v)
    }
  }

  const columns = computed<any[]>(() => {
    const keys = derivedKeys.value
    const [minCols] = minDimensions.value

    const base = keys.length ? keys.map((k) => ({ title: k, width: 200 })) : []
    if (base.length >= minCols) return base

    const padding = Array.from({ length: minCols - base.length }, () => ({ title: '', width: 200 }))
    return [...base, ...padding]
  })

  const gridData = computed<JSpreadsheetCore.CellValue[][]>(() => {
    const keys = derivedKeys.value
    const items = sourceItems.value
    const [, minRows] = minDimensions.value
    const colCount = columns.value.length

    const targetRows = Math.max(items.length, minRows)

    return Array.from({ length: targetRows }, (_, rowIndex) => {
      const item = items[rowIndex]

      if (!item || !keys.length) {
        return Array.from({ length: colCount }, () => '')
      }

      const row = keys.map((k) => (k in item ? toCellValue(item[k]) : ''))
      if (row.length >= colCount) return row
      return [...row, ...Array.from({ length: colCount - row.length }, () => '')]
    })
  })

  const minDimensions = computed<[number, number]>(() => {
    return [Math.max(derivedKeys.value.length, 6), Math.max(sourceItems.value.length, 20)]
  })

  const sheetMountKey = computed(() => {
    const sig = [
      derivedKeys.value.join(','),
      columns.value.length,
      sourceItems.value.length,
      props.modelValue?.length || 0,
    ].join('|')
    return sig
  })

  const clone = (v: any) => {
    return JSON.parse(JSON.stringify(v))
  }

  const getAtPath = (root: any, path: Array<string | number>) => {
    let cursor: any = root
    for (const key of path) {
      if (cursor === undefined || cursor === null) return undefined
      cursor = cursor[key]
    }
    return cursor
  }

  const updateSource = (newDoc: any) => {
    emit('update:modelValue', JSON.stringify(newDoc, null, 2))
  }

  const applyingExternalUpdate = ref(false)

  const applyCellChangesToSource = (changes: JSpreadsheetCore.CellChange[]) => {
    const { path } = recordsInfo.value
    const basePath = path || []

    const nextDoc = clone(doc.value)
    const items = basePath.length === 0 ? nextDoc : getAtPath(nextDoc, basePath)
    if (!Array.isArray(items)) return

    const keys = derivedKeys.value
    const rowMap = sourceItemIndexes.value

    for (const change of changes) {
      const colIndex = Number(change.x)
      const rowIndex = Number(change.y)
      if (!Number.isFinite(colIndex) || !Number.isFinite(rowIndex)) continue

      const key = keys[colIndex]
      if (!key) continue

      const sourceIdx = rowMap[rowIndex]
      if (typeof sourceIdx !== 'number' || !Number.isFinite(sourceIdx)) continue

      const current = items[sourceIdx]
      if (!current || typeof current !== 'object' || Array.isArray(current)) continue

      const raw = change.value
      const nextValue = raw === '' ? null : raw

      items[sourceIdx] = { ...current, [key]: nextValue }
    }

    updateSource(nextDoc)
  }

  const onAfterChanges = (instance: JSpreadsheetCore.WorksheetInstance, changes: JSpreadsheetCore.CellChange[]) => {
    if (applyingExternalUpdate.value) return
    if (!Array.isArray(changes) || !changes.length) return
    if (!instance) return
    applyCellChangesToSource(changes)
  }

  watch(
    [worksheet, () => props.modelValue],
    async ([ws]) => {
      if (!ws) return
      applyingExternalUpdate.value = true
      try {
        ws.setData(gridData.value)
      } finally {
        await nextTick()
        applyingExternalUpdate.value = false
      }
    },
    { immediate: true },
  )

  const scrollToTop = () => {
    const scroller = worksheet.value?.content as HTMLElement | undefined
    const target = scroller || rootEl.value
    if (!target) return

    try {
      target.scrollTo({ top: 0, behavior: 'auto' })
    } catch {
      target.scrollTop = 0
    }
  }

  defineExpose({ scrollToTop })
</script>

<template>
  <div ref="rootEl" class="h-full w-full">
    <div v-if="error" class="p-4 text-sm text-destructive">
      {{ error }}
    </div>

    <UiJspreadsheet
      v-else
      ref="spreadsheetRef"
      :key="sheetMountKey"
      class="h-full w-full"
      :toolbar="true"
      :onafterchanges="onAfterChanges">
      <Worksheet
        :data="gridData"
        :columns="columns"
        :min-dimensions="minDimensions"
        :table-overflow="true"
        :table-width="'100%'"
        :table-height="'600px'" />
    </UiJspreadsheet>
  </div>
</template>
