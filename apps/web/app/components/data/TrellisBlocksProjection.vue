<script setup lang="ts">
  import type { DatabaseField, DatabaseSchema } from '~/types/database'
  import { parseTurtleIri, routeForTurtleIri } from '~/lib/ontology'
  import { createDefaultTrellisContext } from '~/lib/trellis'

  const CLEAR_SELECT_VALUE = '__clear__'

  const iconForField = (field: DatabaseField) => {
    if (field.type === 'formula') return 'lucide:sigma'
    if (field.type === 'checkbox') return 'lucide:check-square'
    if (field.type === 'select') return 'lucide:list'
    if (field.type === 'multiselect') return 'lucide:tags'
    if (field.type === 'date') return 'lucide:calendar'
    if (field.type === 'number') return 'lucide:hash'
    if (field.type === 'url') return 'lucide:link'
    if (field.type === 'email') return 'lucide:at-sign'
    if (field.type === 'file') return 'lucide:paperclip'
    if (field.type === 'relation') return 'lucide:link-2'
    return 'lucide:type'
  }

  const toIdentifier = (label: string) => {
    const raw = String(label || '').trim()
    if (!raw) return ''
    const parts = raw.split(/[^A-Za-z0-9]+/g).filter(Boolean)
    if (!parts.length) return ''
    const first = parts[0]!
    const rest = parts.slice(1)
    return (
      first.slice(0, 1).toLowerCase() +
      first.slice(1) +
      rest.map((p) => p.slice(0, 1).toUpperCase() + p.slice(1)).join('')
    )
  }

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

  defineExpose({ scrollToTop })

  const parseError = ref<string | null>(null)
  const doc = ref<any>({ '@context': createDefaultTrellisContext(), '@graph': [] })
  const lastEmittedValue = ref<string | null>(null)

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

  const normalizeFieldValue = (value: any, field: DatabaseField) => {
    const v = unwrapLdValue(value)

    if (field.type === 'select') {
      if (v && typeof v === 'object' && !Array.isArray(v) && typeof (v as any).value === 'string') {
        return (v as any).value
      }
    }

    if (field.type === 'multiselect') {
      if (Array.isArray(v)) {
        return v.map((item) => {
          if (item && typeof item === 'object' && typeof (item as any).value === 'string') return (item as any).value
          return item
        })
      }
    }

    return v
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
    if (preferredKey in node) return normalizeFieldValue(node[preferredKey], field)

    // Fallback: if schema field ids changed (e.g. UUID ids) but the content uses
    // a stable key derived from the field name (e.g. user:status), still read it.
    const alias = toIdentifier(field.name)
    if (alias) {
      const aliasKey = `user:${alias}`
      if (aliasKey in node) return normalizeFieldValue(node[aliasKey], field)
    }

    if (field.id in node) return normalizeFieldValue(node[field.id], field)
    if (field.name in node) return normalizeFieldValue(node[field.name], field)
    return undefined
  }

  const getAllRecordContexts = () => {
    const fields = schemaFields.value
    return recordNodes.value.map((n) => {
      const ctx: Record<string, any> = {}
      for (const f of fields) {
        const v = getFieldValue(n, f)
        ctx[f.id] = v
        ctx[f.name] = v
        const alias = toIdentifier(f.name)
        if (alias && !(alias in ctx)) ctx[alias] = v
      }
      return ctx
    })
  }

  const { evaluateFormula } = useCollectionFormulas(props.collectionId)

  const computeFormulaDisplay = (field: DatabaseField, node: any) => {
    try {
      const fields = schemaFields.value
      const record: Record<string, any> = {}
      for (const f of fields) {
        const v = getFieldValue(node, f)
        record[f.id] = v
        record[f.name] = v
        const alias = toIdentifier(f.name)
        if (alias && !(alias in record)) record[alias] = v
      }

      const all = getAllRecordContexts()
      const result = evaluateFormula(field, record, all, props.schema)
      if (result === null || result === undefined) return ''
      if (field.formulaReturnType === 'date') {
        const d = result instanceof Date ? result : new Date(result)
        return Number.isFinite(d.getTime()) ? d.toLocaleDateString() : String(result)
      }
      if (field.formulaReturnType === 'number') {
        return typeof result === 'number' ? result.toLocaleString() : String(result)
      }
      if (field.formulaReturnType === 'boolean') {
        return result ? 'true' : 'false'
      }
      return String(result)
    } catch {
      return ''
    }
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
        // Preserve the original document shape if present.
        const nextDoc: any = parsed
        if (!nextDoc['@context'] || typeof nextDoc['@context'] !== 'object') {
          nextDoc['@context'] = createDefaultTrellisContext()
        }

        const hasGraphObj = nextDoc.graph && typeof nextDoc.graph === 'object' && !Array.isArray(nextDoc.graph)

        // If a graph object exists, keep edits inside graph.nodes.
        if (hasGraphObj) {
          if (!Array.isArray((nextDoc.graph as any).nodes)) {
            ;(nextDoc.graph as any).nodes = []
          }
        } else {
          // Legacy fallback: If no graph object exists and no legacy @graph exists, extract candidates into @graph.
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
      // Skip re-parsing if this value came from our own emit (prevents cursor jump)
      if (v === lastEmittedValue.value) return
      tryParse(v || '')
    },
    { immediate: true },
  )

  const recordsRoot = computed<{ path: Array<string | number>; items: any[] }>(() => {
    const root = doc.value

    // New finalized format (preferred)
    const graph = root?.graph
    if (graph && typeof graph === 'object' && !Array.isArray(graph)) {
      const nodes = (graph as any).nodes
      if (Array.isArray(nodes)) return { path: ['graph', 'nodes'], items: nodes }
    }

    // Legacy format
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

  const makeRef = (iri: string) => {
    const key = graphIdKey.value
    return { [key]: iri }
  }

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

  const deleteNode = (nodeId: string) => {
    const nextDoc = JSON.parse(JSON.stringify(doc.value || {}))
    const { path, items } = recordsRoot.value
    const nextItems = (Array.isArray(items) ? items : []).filter((n) => getNodeId(n) !== nodeId)
    emitDoc(setAtPath(nextDoc, path, nextItems))
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
    const userRef = makeRef('system:ui')

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
        createdBy: userRef,
        lastEditedTime: now,
        lastEditedBy: userRef,
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

  const onTitleInput = (nodeId: string, v: string) => {
    updateNode(nodeId, { 'trellis:title': String(v || '').slice(0, 280) })
  }

  const onDescriptionInput = (nodeId: string, v: string) => {
    updateNode(nodeId, { 'trellis:description': String(v || '').slice(0, 1000) })
  }

  const relationTarget = (value: any) => {
    const v = typeof value === 'string' ? value : ''
    const parsed = parseTurtleIri(v)
    if (!parsed) return null
    const route = routeForTurtleIri(v)
    if (!route) return null
    return { iri: v, route, parsed }
  }

  const openRelation = async (iri: string) => {
    const route = routeForTurtleIri(iri)
    if (!route) return
    await navigateTo({ path: route, query: { focusIri: iri } })
  }
</script>

<template>
  <div ref="rootEl" class="h-full w-full overflow-auto px-6 py-4">
    <UiAlert
      v-if="parseError"
      variant="destructive"
      :title="'Trellis view unavailable'"
      :description="parseError"
      icon="lucide:triangle-alert"
      class="mb-4" />

    <div v-else class="space-y-4">
      <div class="flex items-center justify-between">
        <div class="text-sm text-muted-foreground">{{ recordNodes.length }} records</div>
        <UiButton size="sm" @click="addRecord">
          <Icon name="lucide:plus" class="mr-2 h-4 w-4" />
          New record
        </UiButton>
      </div>

      <div v-if="!recordNodes.length" class="flex items-center justify-center rounded-lg border border-dashed p-10">
        <div class="text-center">
          <div class="text-sm font-medium">No records yet</div>
          <div class="text-xs text-muted-foreground mt-1">Add your first record to populate the Trellis graph.</div>
        </div>
      </div>

      <div v-else class="space-y-3">
        <div
          v-for="node in recordNodes"
          :key="getNodeId(node)"
          class="rounded-lg border border-border/60 bg-card/20 backdrop-blur-2xl p-4">
          <div class="flex items-start justify-between gap-4">
            <div class="min-w-0 flex-1 space-y-2">
              <UiInput
                :model-value="node['trellis:title'] || ''"
                class="h-9 bg-background/50"
                placeholder="Title"
                @update:model-value="(v) => onTitleInput(getNodeId(node), String(v ?? ''))" />
              <UiTextarea
                :model-value="node['trellis:description'] || ''"
                class="bg-background/50"
                placeholder="Description"
                :rows="2"
                @update:model-value="(v) => onDescriptionInput(getNodeId(node), String(v ?? ''))" />

              <div v-if="schemaFields.length" class="mt-3 space-y-2">
                <div
                  v-for="field in schemaFields"
                  :key="field.id"
                  class="flex items-start gap-3 rounded-md border border-border/40 bg-background/20 px-3 py-2">
                  <div class="w-40 shrink-0 text-xs font-medium text-muted-foreground">
                    <div class="flex items-center gap-2 py-2">
                      <Icon :name="iconForField(field)" class="h-4 w-4 opacity-50" />
                      <span>{{ field.name }}</span>
                    </div>
                  </div>

                  <div class="min-w-0 flex-1">
                    <template v-if="field.type === 'formula'">
                      <template v-if="field.formulaReturnType === 'boolean'">
                        <div class="flex items-center gap-2 mt-2">
                          <UiSwitch :checked="computeFormulaDisplay(field, node) === 'true'" disabled />
                          <div class="text-xs text-muted-foreground italic">Computed</div>
                        </div>
                      </template>
                      <template v-else>
                        <div class="flex items-center gap-2">
                          <Icon name="lucide:zap" class="h-4 w-4 text-amber-500" />
                          <div class="text-sm text-muted-foreground italic truncate">
                            {{ computeFormulaDisplay(field, node) || '—' }}
                          </div>
                        </div>
                      </template>
                    </template>

                    <template v-else-if="field.type === 'checkbox'">
                      <div class="flex items-center gap-2">
                        <UiSwitch
                          :checked="!!getFieldValue(node, field)"
                          @update:checked="(v: boolean) => updateFieldValue(getNodeId(node), field, !!v)" />
                      </div>
                    </template>

                    <template v-else-if="field.type === 'select'">
                      <UiSelect
                        :model-value="String(getFieldValue(node, field) ?? '')"
                        @update:model-value="
                          (v) =>
                            updateFieldValue(
                              getNodeId(node),
                              field,
                              String(v ?? '') === CLEAR_SELECT_VALUE ? '' : String(v ?? ''),
                            )
                        ">
                        <UiSelectTrigger size="sm" class="h-9 bg-background/50">
                          <UiSelectValue placeholder="Select" />
                        </UiSelectTrigger>
                        <UiSelectContent>
                          <UiSelectItem :value="CLEAR_SELECT_VALUE">—</UiSelectItem>
                          <UiSelectItem v-for="opt in field.options || []" :key="opt.value" :value="opt.value">
                            {{ opt.value }}
                          </UiSelectItem>
                        </UiSelectContent>
                      </UiSelect>
                    </template>

                    <template v-else-if="field.type === 'multiselect'">
                      <UiInput
                        :model-value="
                          Array.isArray(getFieldValue(node, field))
                            ? (getFieldValue(node, field) as any[]).join(', ')
                            : ''
                        "
                        class="h-9 bg-background/50"
                        placeholder="Comma-separated"
                        @update:model-value="
                          (v) =>
                            updateFieldValue(
                              getNodeId(node),
                              field,
                              String(v ?? '')
                                .split(',')
                                .map((s) => s.trim())
                                .filter(Boolean),
                            )
                        " />
                    </template>

                    <template v-else-if="field.type === 'date'">
                      <UiDatepicker
                        :model-value="getFieldValue(node, field) ? new Date(getFieldValue(node, field)) : null"
                        @update:model-value="
                          (v) => updateFieldValue(getNodeId(node), field, v ? new Date(v as any).getTime() : null)
                        ">
                        <template #default="{ inputValue, inputEvents }">
                          <UiInput
                            class="h-9 bg-background/50"
                            :model-value="inputValue"
                            placeholder="Pick a date"
                            v-on="inputEvents" />
                        </template>
                      </UiDatepicker>
                    </template>

                    <template v-else-if="field.type === 'relation'">
                      <div class="flex items-center gap-2">
                        <UiInput
                          :model-value="String(getFieldValue(node, field) ?? '')"
                          class="h-9 bg-background/50 font-mono"
                          :class="{
                            'text-primary underline decoration-primary/40 underline-offset-2 cursor-pointer':
                              relationTarget(getFieldValue(node, field)),
                          }"
                          @dblclick="
                            () => {
                              const target = relationTarget(getFieldValue(node, field))
                              if (target) void openRelation(target.iri)
                            }
                          "
                          @click="
                            (e: MouseEvent) => {
                              const target = relationTarget(getFieldValue(node, field))
                              if (!target) return
                              if (!(e.metaKey || e.ctrlKey)) return
                              e.preventDefault()
                              e.stopPropagation()
                              void openRelation(target.iri)
                            }
                          "
                          @update:model-value="(v) => updateFieldValue(getNodeId(node), field, String(v ?? ''))" />
                        <UiButton
                          v-if="relationTarget(getFieldValue(node, field))"
                          size="icon"
                          variant="secondary"
                          class="h-9 w-9"
                          aria-label="Open relation"
                          @click.stop="
                            () => {
                              const target = relationTarget(getFieldValue(node, field))
                              if (target) void openRelation(target.iri)
                            }
                          ">
                          <Icon name="lucide:arrow-up-right" class="h-4 w-4" />
                        </UiButton>
                      </div>
                    </template>

                    <template v-else>
                      <UiInput
                        :model-value="String(getFieldValue(node, field) ?? '')"
                        class="h-9 bg-background/50"
                        @update:model-value="(v) => updateFieldValue(getNodeId(node), field, v)" />
                    </template>
                  </div>
                </div>
              </div>
            </div>

            <div class="shrink-0 flex flex-col items-end gap-2">
              <div class="text-xs text-muted-foreground font-mono">{{ getNodeType(node) || '' }}</div>
              <UiDropdownMenu>
                <UiDropdownMenuTrigger as-child>
                  <UiButton size="icon-sm" variant="ghost">
                    <Icon name="lucide:more-horizontal" class="h-4 w-4" />
                  </UiButton>
                </UiDropdownMenuTrigger>
                <UiDropdownMenuContent align="end" class="w-44">
                  <UiDropdownMenuItem
                    class="text-destructive focus:text-destructive"
                    @click="deleteNode(getNodeId(node))">
                    <Icon name="lucide:trash-2" class="mr-2 h-4 w-4" />
                    Delete
                  </UiDropdownMenuItem>
                </UiDropdownMenuContent>
              </UiDropdownMenu>
            </div>
          </div>

          <div class="mt-3 text-xs text-muted-foreground font-mono truncate">{{ getNodeId(node) }}</div>
        </div>
      </div>
    </div>
  </div>
</template>
