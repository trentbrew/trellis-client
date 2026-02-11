<script setup lang="ts">
  import type { DatabaseField, DatabaseSchema } from '~/types/database'
  import { createDefaultTrellisContext } from '~/lib/trellis'
  import { extractNodeValue, fieldKeyAliases, getStatusBadgeClass } from '~/lib/ontology'

  const props = defineProps<{
    collectionId: string
    modelValue?: string
    schema?: DatabaseSchema | null
  }>()

  const _emit = defineEmits<{
    'update:modelValue': [value: string]
  }>()

  const rootEl = ref<HTMLElement | null>(null)

  const scrollToTop = () => {
    const el = rootEl.value
    if (!el) return
    try {
      el.scrollTo({ top: 0, behavior: 'auto' })
    } catch {
      el.scrollTop = 0
    }
  }

  defineExpose({ scrollToTop })

  // ── Parsing ──────────────────────────────────────────────────────────

  const stripJsoncComments = (input: string) => {
    const raw = String(input || '')
    const withoutLine = raw.replace(/^\s*\/\/.*$/gm, '')
    return withoutLine.replace(/\/\*[\s\S]*?\*\//g, '')
  }

  const extractGraphCandidates = (parsed: any): any[] => {
    if (!parsed || typeof parsed !== 'object') return []
    const candidates = ['@graph', 'items', 'records', 'data', 'nodes']
    for (const k of candidates) {
      if (Array.isArray((parsed as any)[k])) return (parsed as any)[k]
    }
    const paths: string[][] = [
      ['workspace', 'items'],
      ['workspace', 'records'],
      ['workspace', 'nodes'],
      ['collection', 'items'],
      ['collection', 'records'],
      ['collection', 'nodes'],
    ]
    for (const path of paths) {
      let cur: any = parsed
      for (const segment of path) {
        if (!cur || typeof cur !== 'object') {
          cur = null
          break
        }
        cur = cur[segment]
      }
      if (Array.isArray(cur)) return cur
    }
    return []
  }

  const parseError = ref<string | null>(null)
  const doc = ref<any>({ '@context': createDefaultTrellisContext(), '@graph': [] })
  const lastEmittedValue = ref<string | null>(null)

  const tryParse = (value: string) => {
    try {
      const trimmed = (value || '').trim()
      const parsed = trimmed === '' ? {} : JSON.parse(stripJsoncComments(trimmed))

      if (Array.isArray(parsed)) {
        doc.value = { '@context': createDefaultTrellisContext(), '@graph': parsed }
        parseError.value = null
        return
      }

      if (parsed && typeof parsed === 'object') {
        const nextDoc: any = parsed
        if (!nextDoc['@context'] || typeof nextDoc['@context'] !== 'object') {
          nextDoc['@context'] = createDefaultTrellisContext()
        }

        const hasGraphObj = nextDoc.graph && typeof nextDoc.graph === 'object' && !Array.isArray(nextDoc.graph)
        if (hasGraphObj) {
          if (!Array.isArray((nextDoc.graph as any).nodes)) {
            ;(nextDoc.graph as any).nodes = []
          }
        } else {
          const hasLegacyGraph = Array.isArray(nextDoc['@graph'])
          if (!hasLegacyGraph) {
            const extracted = extractGraphCandidates(nextDoc)
            nextDoc['@graph'] = Array.isArray(extracted) && extracted.length ? extracted : []
          }
        }

        doc.value = nextDoc
        parseError.value = null
        return
      }

      doc.value = { '@context': createDefaultTrellisContext(), '@graph': [] }
      parseError.value = null
    } catch (e: any) {
      parseError.value = e?.message ? String(e.message) : 'Invalid JSON'
    }
  }

  watch(
    () => props.modelValue,
    (v) => {
      if (v === lastEmittedValue.value) return
      tryParse(v || '')
    },
    { immediate: true },
  )

  // ── Records ──────────────────────────────────────────────────────────

  const graph = computed<any[]>(() => {
    const root = doc.value
    const g = root?.graph
    if (g && typeof g === 'object' && !Array.isArray(g)) {
      const nodes = (g as any).nodes
      if (Array.isArray(nodes)) return nodes
    }
    const legacy = root?.['@graph']
    if (Array.isArray(legacy)) return legacy
    return []
  })

  const recordNodes = computed<any[]>(() => {
    return graph.value.filter((n) => {
      if (!n || typeof n !== 'object' || Array.isArray(n)) return false
      const t = (n as any)['@type'] ?? (n as any).type
      if (t === 'trellis:Collection') return false
      if (t === 'trellis:PropertyValueSpecification') return false
      return true
    })
  })

  // ── Schema fields ────────────────────────────────────────────────────

  const schemaFields = computed<DatabaseField[]>(() => {
    const fields = props.schema?.fields
    if (!Array.isArray(fields)) return []
    return fields.slice().sort((a, b) => a.order - b.order)
  })

  const unwrapLdValue = (value: any): any => {
    if (Array.isArray(value)) return value.map(unwrapLdValue)
    if (value && typeof value === 'object') {
      if ('@value' in value) return unwrapLdValue((value as any)['@value'])
      if ('value' in value && Object.keys(value).length === 1) return unwrapLdValue((value as any).value)
    }
    return value
  }

  const getFieldValue = (node: any, field: DatabaseField) => {
    if (!node || typeof node !== 'object' || Array.isArray(node)) return undefined
    const preferredKey = `user:${field.id}`
    if (preferredKey in node) return unwrapLdValue(node[preferredKey])
    if (field.id in node) return unwrapLdValue(node[field.id])
    if (field.name in node) return unwrapLdValue(node[field.name])
    return undefined
  }

  // ── Display helpers ──────────────────────────────────────────────────

  const getNodeTitle = (node: any): string => {
    return extractNodeValue(node, [...fieldKeyAliases.title]) || 'Untitled'
  }

  const getNodeId = (node: any): string => {
    if (!node || typeof node !== 'object' || Array.isArray(node)) return ''
    const id = (node as any)['@id'] ?? (node as any).id
    return typeof id === 'string' ? id : ''
  }

  const getNodeStatus = (node: any): string | undefined => {
    return extractNodeValue(node, [...fieldKeyAliases.status])
  }

  const getNodePriority = (node: any): string | undefined => {
    return extractNodeValue(node, [...fieldKeyAliases.priority])
  }

  const formatFieldValue = (value: any, field: DatabaseField): string => {
    if (value === undefined || value === null || value === '') return ''
    if (field.type === 'date') {
      try {
        const d = new Date(value)
        if (!isNaN(d.getTime())) return d.toLocaleDateString()
      } catch {
        return String(value)
      }
    }
    if (field.type === 'number') return String(value)
    if (field.type === 'checkbox') return value ? 'Yes' : 'No'
    if (Array.isArray(value)) return value.join(', ')
    return String(value)
  }

  // Show up to 4 visible schema fields in the subtitle
  const visibleFields = computed(() => schemaFields.value.slice(0, 4))

  // ── Search ───────────────────────────────────────────────────────────

  const searchQuery = ref('')

  const filteredRecords = computed(() => {
    const q = searchQuery.value.toLowerCase().trim()
    if (!q) return recordNodes.value
    return recordNodes.value.filter((node) => {
      const title = getNodeTitle(node).toLowerCase()
      if (title.includes(q)) return true
      for (const field of schemaFields.value) {
        const val = getFieldValue(node, field)
        if (val !== undefined && String(val).toLowerCase().includes(q)) return true
      }
      return false
    })
  })
</script>

<template>
  <div ref="rootEl" class="h-full overflow-auto">
    <!-- Search bar -->
    <div class="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border px-6 py-3">
      <div class="relative max-w-md">
        <Icon name="lucide:search" class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search records..."
          class="w-full rounded-lg border border-border bg-muted/30 py-2 pl-9 pr-3 text-sm outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20" />
      </div>
    </div>

    <!-- Empty state -->
    <div v-if="filteredRecords.length === 0" class="flex flex-col items-center justify-center py-20 text-center">
      <Icon name="lucide:list" class="h-10 w-10 text-muted-foreground mb-3" />
      <h3 class="text-lg font-medium text-foreground">
        {{ searchQuery ? 'No matching records' : 'No records yet' }}
      </h3>
      <p class="text-sm text-muted-foreground mt-1 max-w-sm">
        {{ searchQuery ? 'Try adjusting your search query.' : 'Add records to your collection to see them here.' }}
      </p>
    </div>

    <!-- Record list -->
    <div v-else class="divide-y divide-border">
      <div
        v-for="(node, index) in filteredRecords"
        :key="getNodeId(node) || index"
        class="group px-6 py-3 hover:bg-muted/30 transition-colors cursor-default">
        <div class="flex items-start gap-3">
          <!-- Row number -->
          <span class="shrink-0 text-xs text-muted-foreground/50 font-mono w-6 pt-0.5 text-right">
            {{ index + 1 }}
          </span>

          <div class="min-w-0 flex-1">
            <!-- Title row -->
            <div class="flex items-center gap-2">
              <span class="font-medium text-sm text-foreground truncate">
                {{ getNodeTitle(node) }}
              </span>
              <span
                v-if="getNodeStatus(node)"
                class="shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                :class="getStatusBadgeClass(getNodeStatus(node)!)">
                {{ getNodeStatus(node) }}
              </span>
              <span
                v-if="getNodePriority(node)"
                class="shrink-0 text-[10px] font-medium text-muted-foreground">
                {{ getNodePriority(node) }}
              </span>
            </div>

            <!-- Field values -->
            <div v-if="visibleFields.length" class="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
              <template v-for="field in visibleFields" :key="field.id">
                <span
                  v-if="formatFieldValue(getFieldValue(node, field), field)"
                  class="text-xs text-muted-foreground truncate max-w-[200px]">
                  <span class="text-muted-foreground/60">{{ field.name }}:</span>
                  {{ formatFieldValue(getFieldValue(node, field), field) }}
                </span>
              </template>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Record count footer -->
    <div v-if="filteredRecords.length > 0" class="px-6 py-3 border-t border-border">
      <span class="text-xs text-muted-foreground">
        {{ filteredRecords.length }} {{ filteredRecords.length === 1 ? 'record' : 'records' }}
        <template v-if="searchQuery && filteredRecords.length !== recordNodes.length">
          of {{ recordNodes.length }}
        </template>
      </span>
    </div>
  </div>
</template>
