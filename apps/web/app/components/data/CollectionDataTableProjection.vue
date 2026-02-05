<script setup lang="ts">
  import UiSpreadsheet from '~/components/Ui/Spreadsheet.client.vue'

  const props = defineProps<{
    collectionId: string
    modelValue?: string
  }>()

  const _emit = defineEmits<{
    'update:modelValue': [value: string]
  }>()

  const rootEl = ref<HTMLElement | null>(null)
  const spreadsheetRef = ref<any>(null)

  const scrollToTop = () => {
    const el = rootEl.value
    if (!el) return
    try {
      el.scrollTo({ top: 0, behavior: 'auto' })
    } catch {
      el.scrollTop = 0
    }
  }

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

  const spreadsheetData = computed(() => {
    const items = sourceItems.value
    if (!items.length) return []

    return items.map((item) => {
      return derivedKeys.value.map((key) => {
        const value = normalizeValue(item[key])
        if (value === null || value === undefined) return ''
        if (typeof value === 'object') return JSON.stringify(value)
        return String(value)
      })
    })
  })

  const spreadsheetColumns = computed(() => {
    return derivedKeys.value.map((key) => ({
      title: key,
      width: 150,
    }))
  })

  const handleSpreadsheetChange = (_instance: any, _cell: any, _x: number, _y: number, _value: any) => {
    // Handle data changes if needed
  }

  defineExpose({ scrollToTop })
</script>

<template>
  <div ref="rootEl" class="h-full w-full overflow-auto">
    <div v-if="error" class="flex items-center justify-center p-8 text-destructive">
      <p>{{ error }}</p>
    </div>
    <div v-else-if="!sourceItems.length" class="flex items-center justify-center p-8 text-muted-foreground">
      <p>No data available</p>
    </div>
    <UiSpreadsheet
      v-else
      ref="spreadsheetRef"
      :data="spreadsheetData"
      :columns="spreadsheetColumns"
      :options="{
        tableOverflow: true,
        tableWidth: '100%',
        tableHeight: '600px',
      }"
      @change="handleSpreadsheetChange" />
  </div>
</template>
