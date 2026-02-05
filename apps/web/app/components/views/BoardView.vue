<script setup lang="ts">
  import type { DatabaseField, DatabaseSchema } from '~/types/database'
  import { createDefaultTrellisContext } from '~/lib/trellis'

  const CLEAR_SELECT_VALUE = '__clear__'
  const UNGROUPED_KEY = '__ungrouped__'

  const props = defineProps<{
    collectionId: string
    modelValue?: string
    schema?: DatabaseSchema | null
  }>()

  const emit = defineEmits<{
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

  const stripJsoncComments = (input: string) => {
    const raw = String(input || '')
    const withoutLine = raw.replace(/^\s*\/\/.*$/gm, '')
    return withoutLine.replace(/\/\*[\s\S]*?\*\//g, '')
  }

  const parseError = ref<string | null>(null)
  const doc = ref<any>({ '@context': createDefaultTrellisContext(), '@graph': [] })
  const lastEmittedValue = ref<string | null>(null)

  const schemaFields = computed<DatabaseField[]>(() => {
    const fields = props.schema?.fields
    if (!Array.isArray(fields)) return []
    return fields.slice().sort((a, b) => a.order - b.order)
  })

  const selectFields = computed<DatabaseField[]>(() => {
    return schemaFields.value.filter((f) => f.type === 'select')
  })

  const groupFieldId = ref<string>('')

  watch(
    selectFields,
    (fields) => {
      if (groupFieldId.value && fields.some((f) => f.id === groupFieldId.value)) return
      groupFieldId.value = fields[0]?.id || ''
    },
    { immediate: true },
  )

  const groupField = computed(() => {
    const id = groupFieldId.value
    if (!id) return null
    return selectFields.value.find((f) => f.id === id) || null
  })

  const isDragging = ref(false)

  const unwrapLdValue = (value: any): any => {
    if (Array.isArray(value)) return value.map(unwrapLdValue)
    if (value && typeof value === 'object') {
      if ('@value' in value) return unwrapLdValue((value as any)['@value'])
      if ('value' in value && Object.keys(value).length === 1) return unwrapLdValue((value as any).value)
    }
    return value
  }

  const propKeyForField = (field: DatabaseField) => {
    return `user:${field.id}`
  }

  const getNodeId = (node: any) => {
    if (!node || typeof node !== 'object' || Array.isArray(node)) return ''
    const id = (node as any)['@id'] ?? (node as any).id
    return typeof id === 'string' ? id : ''
  }

  const getNodeType = (node: any) => {
    if (!node || typeof node !== 'object' || Array.isArray(node)) return ''
    const t = (node as any)['@type'] ?? (node as any).type
    return typeof t === 'string' ? t : ''
  }

  const getFieldValue = (node: any, field: DatabaseField) => {
    if (!node || typeof node !== 'object' || Array.isArray(node)) return undefined
    const preferredKey = propKeyForField(field)
    if (preferredKey in node) return unwrapLdValue(node[preferredKey])
    if (field.id in node) return unwrapLdValue(node[field.id])
    if (field.name in node) return unwrapLdValue(node[field.name])
    return undefined
  }

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
            if (Array.isArray(extracted) && extracted.length) {
              nextDoc['@graph'] = extracted
            } else {
              nextDoc['@graph'] = []
            }
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

  const recordsRoot = computed<{ path: Array<string | number>; items: any[] }>(() => {
    const root = doc.value

    const graph = root?.graph
    if (graph && typeof graph === 'object' && !Array.isArray(graph)) {
      const nodes = (graph as any).nodes
      if (Array.isArray(nodes)) return { path: ['graph', 'nodes'], items: nodes }
    }

    const g = root?.['@graph']
    if (Array.isArray(g)) return { path: ['@graph'], items: g }

    return { path: ['@graph'], items: [] }
  })

  const graph = computed<any[]>(() => recordsRoot.value.items)

  const recordNodes = computed<any[]>(() => {
    return graph.value.filter((n) => {
      if (!n || typeof n !== 'object' || Array.isArray(n)) return false
      const t = (n as any)['@type'] ?? (n as any).type
      if (t === 'trellis:Collection') return false
      if (t === 'trellis:PropertyValueSpecification') return false
      return true
    })
  })

  const isBoardRecordNode = (n: any) => {
    if (!n || typeof n !== 'object' || Array.isArray(n)) return false
    const t = (n as any)['@type'] ?? (n as any).type
    if (t === 'trellis:Collection') return false
    if (t === 'trellis:PropertyValueSpecification') return false
    return true
  }

  const graphIdKey = computed<'@id' | 'id'>(() => {
    const g = graph.value
    for (const n of g) {
      if (!n || typeof n !== 'object' || Array.isArray(n)) continue
      if (typeof (n as any).id === 'string' && !('@id' in (n as any) && typeof (n as any)['@id'] === 'string'))
        return 'id'
      if (typeof (n as any)['@id'] === 'string') return '@id'
    }
    return '@id'
  })

  const graphTypeKey = computed<'@type' | 'type'>(() => {
    const g = graph.value
    for (const n of g) {
      if (!n || typeof n !== 'object' || Array.isArray(n)) continue
      if (typeof (n as any).type === 'string' && !('@type' in (n as any) && typeof (n as any)['@type'] === 'string'))
        return 'type'
      if (typeof (n as any)['@type'] === 'string') return '@type'
    }
    return '@type'
  })

  const setAtPath = (root: any, path: Array<string | number>, next: any) => {
    const out = JSON.parse(JSON.stringify(root || {}))
    if (path.length === 0) return next

    let cursor: any = out
    for (let i = 0; i < path.length - 1; i++) {
      const key = path[i]!
      const existing = cursor[key]
      if (!existing || typeof existing !== 'object' || Array.isArray(existing)) cursor[key] = {}
      cursor = cursor[key]
    }
    cursor[path[path.length - 1]!] = next
    return out
  }

  const emitDoc = (nextDoc: any) => {
    doc.value = nextDoc
    const serialized = JSON.stringify(nextDoc, null, 2)
    lastEmittedValue.value = serialized
    emit('update:modelValue', serialized)
  }

  const updateNode = (nodeId: string, patch: Record<string, any>) => {
    const nextDoc = JSON.parse(JSON.stringify(doc.value || {}))
    if (!nextDoc['@context']) nextDoc['@context'] = createDefaultTrellisContext()

    const { path, items } = recordsRoot.value
    const nextItems = Array.isArray(items) ? JSON.parse(JSON.stringify(items)) : []

    const idx = (nextItems as any[]).findIndex((n) => getNodeId(n) === nodeId)
    if (idx < 0) return

    const now = new Date().toISOString()
    const current = nextItems[idx] as any
    const metadata =
      current?.['trellis:metadata'] && typeof current['trellis:metadata'] === 'object'
        ? current['trellis:metadata']
        : {}

    const idKey = graphIdKey.value
    const nextMetadata = {
      ...metadata,
      lastEditedTime: now,
      lastEditedBy: { [idKey]: 'system:ui' },
    }

    nextItems[idx] = { ...current, ...patch, 'trellis:metadata': nextMetadata }
    emitDoc(setAtPath(nextDoc, path, nextItems))
  }

  const updateFieldValue = (nodeId: string, field: DatabaseField, nextValue: any) => {
    const key = propKeyForField(field)
    updateNode(nodeId, { [key]: nextValue })
  }

  const addRecord = () => {
    const nextDoc = JSON.parse(JSON.stringify(doc.value || {}))
    if (!nextDoc['@context']) nextDoc['@context'] = createDefaultTrellisContext()

    const { path, items } = recordsRoot.value
    const nextItems = Array.isArray(items) ? JSON.parse(JSON.stringify(items)) : []

    const id = `trellis:record/${crypto.randomUUID()}`
    const now = new Date().toISOString()

    const idKey = graphIdKey.value
    const typeKey = graphTypeKey.value

    const record: any = {
      [idKey]: id,
      [typeKey]: 'trellis:Record',
      'trellis:title': 'Untitled',
      'trellis:description': '',
      'trellis:content': {
        [typeKey]: 'trellis:Document',
        blocks: [],
      },
      'trellis:metadata': {
        createdTime: now,
        createdBy: { [idKey]: 'system:ui' },
        lastEditedTime: now,
        lastEditedBy: { [idKey]: 'system:ui' },
      },
    }

    for (const f of schemaFields.value) {
      const key = propKeyForField(f)
      if (f.type === 'multiselect') record[key] = []
      else if (f.type === 'checkbox') record[key] = false
      else record[key] = ''
    }

    nextItems.push(record)
    emitDoc(setAtPath(nextDoc, path, nextItems))
  }

  const nodeTitle = (node: any) => {
    const t = (node as any)?.['trellis:title'] ?? (node as any)?.name
    return typeof t === 'string' && t.trim() ? t : 'Untitled'
  }

  const nodeDescription = (node: any) => {
    const d = (node as any)?.['trellis:description'] ?? (node as any)?.description
    return typeof d === 'string' ? d : ''
  }

  type BoardColumn = { key: string; label: string; value: string; nodes: any[] }

  const columns = computed<BoardColumn[]>(() => {
    const field = groupField.value
    const nodes = recordNodes.value

    if (!field) {
      return [{ key: '__all__', label: 'All', value: '', nodes }]
    }

    const optionValues = (field.options || []).map((o) => String(o.value))
    const seen = new Set<string>(optionValues)

    const valuesFromData: string[] = []
    for (const n of nodes) {
      const v = String(getFieldValue(n, field) ?? '')
      if (!seen.has(v)) {
        seen.add(v)
        valuesFromData.push(v)
      }
    }

    const values = [...optionValues, ...valuesFromData]
    if (!values.includes('')) values.unshift('')

    return values.map((v) => {
      const label = v === '' ? 'Ungrouped' : v
      const grouped = nodes.filter((n) => String(getFieldValue(n, field) ?? '') === v)
      return { key: v || UNGROUPED_KEY, label, value: v, nodes: grouped }
    })
  })

  const columnLists = ref<Record<string, any[]>>({})

  const syncColumnListsFromComputed = () => {
    const next: Record<string, any[]> = {}
    for (const col of columns.value) {
      next[col.key] = (col.nodes || []).slice()
    }
    columnLists.value = next
  }

  watch(
    [columns, recordNodes, groupFieldId],
    () => {
      if (isDragging.value) return
      syncColumnListsFromComputed()
    },
    { immediate: true },
  )

  const computeOrderedNodeIds = () => {
    const out: string[] = []
    for (const col of columns.value) {
      const list = columnLists.value[col.key] || []
      for (const n of list) {
        const id = getNodeId(n)
        if (id) out.push(id)
      }
    }
    return out
  }

  const persistBoardMutation = (opts: { nodeId?: string; nextGroupValue?: string | null }) => {
    const field = groupField.value
    const nextDoc = JSON.parse(JSON.stringify(doc.value || {}))
    if (!nextDoc['@context']) nextDoc['@context'] = createDefaultTrellisContext()

    const { path, items } = recordsRoot.value
    const nextItems = Array.isArray(items) ? JSON.parse(JSON.stringify(items)) : []

    const idKey = graphIdKey.value

    if (field && opts.nodeId && opts.nextGroupValue !== null && opts.nextGroupValue !== undefined) {
      const idx = (nextItems as any[]).findIndex((n) => getNodeId(n) === opts.nodeId)
      if (idx >= 0) {
        const now = new Date().toISOString()
        const current = nextItems[idx] as any
        const metadata =
          current?.['trellis:metadata'] && typeof current['trellis:metadata'] === 'object'
            ? current['trellis:metadata']
            : {}

        const nextMetadata = {
          ...metadata,
          lastEditedTime: now,
          lastEditedBy: { [idKey]: 'system:ui' },
        }

        const key = propKeyForField(field)
        nextItems[idx] = { ...current, [key]: opts.nextGroupValue, 'trellis:metadata': nextMetadata }
      }
    }

    const pinned: any[] = []
    const reorderable: any[] = []
    for (const n of nextItems) {
      if (isBoardRecordNode(n)) reorderable.push(n)
      else pinned.push(n)
    }

    const byId = new Map<string, any>()
    const noId: any[] = []
    for (const n of reorderable) {
      const id = getNodeId(n)
      if (id) byId.set(id, n)
      else noId.push(n)
    }

    const orderedIds = computeOrderedNodeIds()
    const reordered: any[] = []

    for (const id of orderedIds) {
      const node = byId.get(id)
      if (!node) continue
      reordered.push(node)
      byId.delete(id)
    }

    const remaining: any[] = []
    for (const n of reorderable) {
      const id = getNodeId(n)
      if (!id) continue
      const still = byId.get(id)
      if (!still) continue
      remaining.push(still)
      byId.delete(id)
    }

    const finalItems = [...pinned, ...reordered, ...remaining, ...noId]
    emitDoc(setAtPath(nextDoc, path, finalItems))
  }

  const onColumnChange = (destValue: string, event: any) => {
    if (!groupField.value) return

    const addedEl = event?.added?.element
    const movedEl = event?.moved?.element

    if (addedEl) {
      const nodeId = getNodeId(addedEl)
      if (!nodeId) return
      persistBoardMutation({ nodeId, nextGroupValue: destValue })
      return
    }

    if (movedEl) {
      persistBoardMutation({})
    }
  }

  const onCardStatusChange = (node: any, next: unknown) => {
    const field = groupField.value
    if (!field) return
    const nodeId = getNodeId(node)
    if (!nodeId) return
    const nextString = String(next ?? '')
    updateFieldValue(nodeId, field, nextString === CLEAR_SELECT_VALUE ? '' : nextString)
  }
</script>

<template>
  <div ref="rootEl" class="h-full w-full px-6 py-4">
    <UiAlert
      v-if="parseError"
      variant="destructive"
      :title="'Board view unavailable'"
      :description="parseError"
      icon="lucide:triangle-alert"
      class="mb-4" />

    <div v-else class="space-y-4">
      <div class="flex items-center justify-between gap-4">
        <div class="min-w-0">
          <div class="text-sm text-muted-foreground">{{ recordNodes.length }} records</div>
        </div>

        <div class="flex items-center gap-3">
          <UiSelect
            v-if="selectFields.length"
            :model-value="groupFieldId"
            @update:model-value="(v) => (groupFieldId = String(v ?? ''))">
            <UiSelectTrigger size="sm" class="h-8 w-[220px]">
              <UiSelectValue placeholder="Group by" />
            </UiSelectTrigger>
            <UiSelectContent>
              <UiSelectItem v-for="f in selectFields" :key="f.id" :value="f.id">
                {{ f.name }}
              </UiSelectItem>
            </UiSelectContent>
          </UiSelect>

          <UiButton size="sm" @click="addRecord">
            <Icon name="lucide:plus" class="mr-2 h-4 w-4" />
            New record
          </UiButton>
        </div>
      </div>

      <div v-if="!selectFields.length" class="rounded-lg border border-dashed p-8">
        <div class="max-w-md space-y-2">
          <div class="text-sm font-medium">No select field for grouping</div>
          <div class="text-xs text-muted-foreground">Add a select field (like Status) to enable kanban grouping.</div>
        </div>
      </div>

      <div v-else class="overflow-x-auto">
        <div class="flex gap-4 min-w-max pb-2">
          <div v-for="col in columns" :key="col.key" class="w-72 shrink-0">
            <div class="flex items-center justify-between rounded-md border border-border/60 bg-card/20 px-3 py-2">
              <div class="min-w-0">
                <div class="text-sm font-medium truncate">{{ col.label }}</div>
              </div>
              <div class="text-xs text-muted-foreground">{{ (columnLists[col.key] || col.nodes).length }}</div>
            </div>

            <div class="mt-3 space-y-2">
              <UiDraggable
                :list="columnLists[col.key]"
                :item-key="(el) => getNodeId(el)"
                :group="{ name: 'trellis-board-cards', pull: true, put: true }"
                handle=".board-card-handle"
                :animation="150"
                ghost-class="sortable-ghost"
                class="space-y-2 min-h-[12px]"
                @start="() => (isDragging = true)"
                @end="() => (isDragging = false)"
                @change="(e) => onColumnChange(col.value, e)">
                <template #item="{ element: node }">
                  <div class="rounded-lg border border-border/60 bg-card/20 backdrop-blur-2xl p-3">
                    <div class="flex items-start justify-between gap-3">
                      <div class="min-w-0 flex-1">
                        <div class="flex items-center gap-2 min-w-0">
                          <div
                            class="board-card-handle shrink-0 text-muted-foreground/70 hover:text-muted-foreground cursor-grab">
                            <Icon name="lucide:grip-vertical" class="h-4 w-4" />
                          </div>
                          <div class="text-sm font-medium truncate">{{ nodeTitle(node) }}</div>
                        </div>
                        <div v-if="nodeDescription(node)" class="text-xs text-muted-foreground line-clamp-2 mt-1">
                          {{ nodeDescription(node) }}
                        </div>
                      </div>

                      <div class="shrink-0">
                        <UiSelect
                          :model-value="groupField ? String(getFieldValue(node, groupField) ?? '') : ''"
                          @update:model-value="(v) => onCardStatusChange(node, v)">
                          <UiSelectTrigger size="sm" class="h-8 w-[130px]">
                            <UiSelectValue placeholder="Status" />
                          </UiSelectTrigger>
                          <UiSelectContent>
                            <UiSelectItem :value="CLEAR_SELECT_VALUE">—</UiSelectItem>
                            <UiSelectItem v-for="opt in groupField?.options || []" :key="opt.value" :value="opt.value">
                              {{ opt.value }}
                            </UiSelectItem>
                          </UiSelectContent>
                        </UiSelect>
                      </div>
                    </div>

                    <div class="mt-2 text-[11px] text-muted-foreground font-mono truncate">
                      {{ getNodeType(node) || '' }} · {{ getNodeId(node) }}
                    </div>
                  </div>
                </template>
              </UiDraggable>

              <div
                v-if="!(columnLists[col.key] || []).length"
                class="rounded-md border border-dashed border-border/60 p-3">
                <div class="text-xs text-muted-foreground">Drop items here</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
