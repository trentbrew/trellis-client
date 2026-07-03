<script setup lang="ts">
  import { computed } from 'vue'
  import type { Collection, DatabaseSchema, Projection } from '~/types/database'
  import CollectionDataGridProjection from '~/components/data/CollectionDataGridProjection.vue'
  import { CodeEditor } from '~/components/editors/CodeEditor'
  import { JsonLdBlocksEditor } from '~/components/JsonLdBlocks'
  import TrellisBlocksProjection from '~/components/data/TrellisBlocksProjection.vue'
  import DataTableSchemaEditor from '~/components/data/DataTable/SchemaEditor.vue'
  import CollectionTemplates from '~/components/data/CollectionTemplates.vue'
  import type { CollectionTemplate } from '~/components/data/CollectionTemplates.vue'
  import { createDefaultDatabaseSchema, normalizeDatabaseSchema } from '~/lib/normalizeDatabaseSchema'
  import { createDefaultProjections, normalizeProjections, buildProjectionTypeOptions, suggestProjections } from '~/lib/projections'
  import { createDefaultTrellisContext, createCollectionGraph, serializeTrellisDocument } from '~/lib/trellis'
  import BoardView from '~/components/views/BoardView.vue'
  import CalendarView from '~/components/views/CalendarView.vue'
  import GraphView from '~/components/views/GraphView.vue'
  import ListView from '~/components/views/ListView.vue'
  import TableView from '~/components/views/TableView.vue'

  definePageMeta({
    title: 'Collection',
    icon: 'lucide:database',
    middleware: ['auth'],
  })

  const route = useRoute()
  const {
    currentApp,
    collectionsLoading,
    updateCollection: updateCollectionData,
    getCollectionBySlug,
  } = useInstantData()
  const instant = useInstantDb()
  const tx = instant.tx as any

  const collectionSchemaSheetOpen = useState<boolean>('collectionSchemaSheetOpen', () => false)
  const collectionRefreshNonce = useState<number>('collectionRefreshNonce', () => 0)

  const setCollectionSchemaSheetOpen = (open: boolean) => {
    collectionSchemaSheetOpen.value = open
  }

  // Admin UI for schema builder
  const { showBuilderUI } = useAdminUI()
  const schemaBuilderOpen = ref(false)

  const isIconPickerOpen = ref(false)
  const activeProjection = ref<string>('')
  const contentContainer = ref<HTMLElement | null>(null)

  const blocksEditorRef = ref<any>(null)
  const trellisBlocksRef = ref<any>(null)
  const codeEditorRef = ref<any>(null)
  const tableProjectionRef = ref<any>(null)
  const boardProjectionRef = ref<any>(null)
  const calendarProjectionRef = ref<any>(null)
  const spreadsheetProjectionRef = ref<any>(null)
  const titleInputRef = ref<HTMLInputElement | null>(null)
  const descriptionTextareaRef = ref<HTMLTextAreaElement | null>(null)

  const didInitialScroll = ref(false)
  const resetContentDialogOpen = ref(false)
  const pendingResetTemplate = ref<{ template: CollectionTemplate; schema: Partial<DatabaseSchema> } | null>(null)

  // Projections state
  const projections = ref<Projection[]>([])
  const projectionsSettingsId = ref<string | null>(null)
  const projectionsIsLoading = ref(false)
  const projectionsIsSaving = ref(false)

  // All view types available in the picker
  const ALL_VIEW_TYPES: Array<Projection['type']> = ['table', 'spreadsheet', 'kanban', 'calendar', 'list', 'graph', 'slide-deck']

  interface ViewPickerItem {
    type: Projection['type']
    name: string
    icon: string
    projectionId: string | null
    isDefault: boolean
    isActive: boolean
    score: number
    suggested: boolean
    reason: string
    disabled: boolean
    tooltip: string
  }

  const viewPickerItems = computed<ViewPickerItem[]>(() => {
    const opts = buildProjectionTypeOptions(schema.value, ALL_VIEW_TYPES, {
      includeDisabled: true,
      hideUnsupported: false,
    })

    // Build suggestion scores
    const scoreMap = new Map<string, { score: number; suggested: boolean; reason: string }>()
    if (schema.value?.fields?.length) {
      const suggestions = suggestProjections(schema.value)
      suggestions.forEach((s) => scoreMap.set(s.type, { score: s.score, suggested: s.suggested, reason: s.reason }))
    }

    return opts.map((opt) => {
      const existing = projections.value.find((p) => p.type === opt.type)
      const suggestion = scoreMap.get(opt.type)
      return {
        type: opt.type,
        name: opt.name,
        icon: opt.icon,
        projectionId: existing?.id ?? null,
        isDefault: existing?.isDefault ?? false,
        isActive: existing?.id === activeProjection.value,
        score: suggestion?.score ?? 0,
        suggested: suggestion?.suggested ?? false,
        reason: suggestion?.reason ?? '',
        disabled: opt.disabled ?? false,
        tooltip: opt.tooltip ?? '',
      }
    })
  })

  const recommendedViews = computed(() =>
    viewPickerItems.value
      .filter((v) => v.suggested && !v.disabled)
      .sort((a, b) => b.score - a.score),
  )

  const otherViews = computed(() => {
    const recommendedTypes = new Set(recommendedViews.value.map((v) => v.type))
    return viewPickerItems.value.filter((v) => !recommendedTypes.has(v.type))
  })

  const activeProjectionConfig = computed(() => {
    const active = projections.value.find((p: Projection) => p.id === activeProjection.value)
    if (active) return active
    const fallback = projections.value.find((p: Projection) => p.isDefault)
    return fallback || null
  })

  const switchToView = async (item: ViewPickerItem) => {
    if (item.disabled) return
    if (item.projectionId) {
      activeProjection.value = item.projectionId
    } else {
      await _addProjection(item.type, item.name)
    }
    isProjectionMenuOpen.value = false
  }

  const activeProjectionType = computed(() => {
    const proj = projections.value.find((p: Projection) => p.id === activeProjection.value)
    return proj?.type || 'table'
  })

  const scrollActiveProjectionToTop = async () => {
    if (!import.meta.client) return
    await nextTick()

    const behavior: ScrollBehavior = didInitialScroll.value ? 'smooth' : 'auto'

    if (contentContainer.value) {
      contentContainer.value.scrollTo({ top: 0, behavior })
    }

    const type = activeProjectionType.value
    if (type === 'trellis-blocks') {
      trellisBlocksRef.value?.scrollToTop?.()
    } else if (type === 'blocks') {
      blocksEditorRef.value?.scrollToTop?.()
    } else if (type === 'table') {
      tableProjectionRef.value?.scrollToTop?.()
    } else if (type === 'kanban') {
      boardProjectionRef.value?.scrollToTop?.()
    } else if (type === 'calendar') {
      calendarProjectionRef.value?.scrollToTop?.()
    } else if (type === 'spreadsheet') {
      spreadsheetProjectionRef.value?.scrollToTop?.()
    } else if (type === 'code') {
      codeEditorRef.value?.scrollToTop?.()
    }

    didInitialScroll.value = true
  }

  // Auto-scroll to top when switching projections / first load
  watch(activeProjection, () => void scrollActiveProjectionToTop(), { flush: 'post', immediate: true })

  const handleRequestSource = () => {
    const codeProj = projections.value.find((p) => p.type === 'code')
    if (codeProj) activeProjection.value = codeProj.id
  }

  const focusIri = computed(() => {
    const v = route.query.focusIri
    return typeof v === 'string' ? v : ''
  })

  const focusPath = computed(() => {
    const v = route.query.focusPath
    return typeof v === 'string' ? v : ''
  })

  watch(
    [focusIri, focusPath, projections],
    ([fi, fp, projs]) => {
      if (fi || fp) {
        const blocksProj = projs?.find((p: Projection) => p.type === 'blocks')
        if (blocksProj) {
          activeProjection.value = blocksProj.id
        }
      }
    },
    { immediate: true },
  )

  const slug = computed(() => route.params.slug as string)
  const collection = computed(() => getCollectionBySlug(currentApp.value?.id || '', slug.value))
  const isLoading = computed(() => !currentApp.value || collectionsLoading.value)

  const lastVisitedKey = computed(() => {
    const appId = currentApp.value?.id
    return appId ? `last-visited-collection:${appId}` : ''
  })

  watch(
    [() => currentApp.value?.id, collection, slug],
    () => {
      if (!import.meta.client) return
      if (!currentApp.value) return
      if (!collection.value) return
      if (!lastVisitedKey.value) return
      try {
        localStorage.setItem(lastVisitedKey.value, slug.value)
      } catch {
        return
      }
    },
    { immediate: true },
  )

  const isDatabaseCollection = computed(() => collection.value?.type === 'database')

  const stripJsoncComments = (input: string) => {
    const raw = String(input || '')
    const withoutLine = raw.replace(/^\s*\/\/.*$/gm, '')
    return withoutLine.replace(/\/\*[\s\S]*?\*\//g, '')
  }

  const parseGraphFromContent = (raw: string): { root: any; graph: any[]; path: Array<string | number> } | null => {
    const trimmed = (raw || '').trim()
    let parsed: any
    try {
      parsed = trimmed === '' ? {} : JSON.parse(stripJsoncComments(trimmed))
    } catch {
      return null
    }

    if (Array.isArray(parsed)) {
      return { root: parsed, graph: parsed, path: [] }
    }

    if (parsed && typeof parsed === 'object') {
      const candidates = ['@graph', 'records', 'items', 'data', 'nodes']
      for (const k of candidates) {
        if (Array.isArray((parsed as any)[k])) return { root: parsed, graph: (parsed as any)[k], path: [k] }
      }

      const graphObj = (parsed as any).graph
      if (graphObj && typeof graphObj === 'object' && !Array.isArray(graphObj)) {
        const nodes = (graphObj as any).nodes
        return { root: parsed, graph: Array.isArray(nodes) ? nodes : [], path: ['graph', 'nodes'] }
      }
    }

    return null
  }

  const getNodeType = (node: any) => {
    if (!node || typeof node !== 'object' || Array.isArray(node)) return ''
    const t = (node as any)['@type'] ?? (node as any).type
    return typeof t === 'string' ? t : ''
  }

  const getGraphIdKey = (graph: any[]): '@id' | 'id' => {
    for (const n of graph) {
      if (!n || typeof n !== 'object' || Array.isArray(n)) continue
      if (typeof (n as any).id === 'string' && !('@id' in (n as any) && typeof (n as any)['@id'] === 'string'))
        return 'id'
      if (typeof (n as any)['@id'] === 'string') return '@id'
    }
    return '@id'
  }

  const getGraphTypeKey = (graph: any[]): '@type' | 'type' => {
    for (const n of graph) {
      if (!n || typeof n !== 'object' || Array.isArray(n)) continue
      if (typeof (n as any).type === 'string' && !('@type' in (n as any) && typeof (n as any)['@type'] === 'string'))
        return 'type'
      if (typeof (n as any)['@type'] === 'string') return '@type'
    }
    return '@type'
  }

  const isTrellisGraph = (graph: any[]) => {
    return graph.some((n) => {
      if (!n || typeof n !== 'object' || Array.isArray(n)) return false
      const t = getNodeType(n)
      if (t.startsWith('trellis:')) return true
      return 'trellis:title' in (n as any) || 'trellis:description' in (n as any)
    })
  }

  const extractGraphCollectionMeta = (raw: string): { title: string; description: string; hasNode: boolean } | null => {
    const info = parseGraphFromContent(raw)
    if (!info) return null

    const graphObj = (info.root as any)?.graph
    if (graphObj && typeof graphObj === 'object' && !Array.isArray(graphObj)) {
      const title = String((graphObj as any)['trellis:title'] ?? (graphObj as any).name ?? '')
      const description = String((graphObj as any)['trellis:description'] ?? (graphObj as any).description ?? '')
      const type = String((graphObj as any)['@type'] ?? (graphObj as any).type ?? '')
      const id = String((graphObj as any)['@id'] ?? (graphObj as any).id ?? '')

      const isTrellis =
        ('trellis:title' in (graphObj as any) || 'trellis:description' in (graphObj as any)) &&
        (title.trim() !== '' || description.trim() !== '')

      const isTrellisByTypeOrId =
        (typeof type === 'string' && type.startsWith('trellis:')) ||
        (typeof id === 'string' && id.startsWith('trellis:'))

      if (!isTrellis && !isTrellisByTypeOrId) return null
      return { title, description, hasNode: true }
    }

    if (!isTrellisGraph(info.graph)) return null

    const node = info.graph.find((n) => getNodeType(n) === 'trellis:Collection')
    if (!node || typeof node !== 'object') return { title: '', description: '', hasNode: false }

    const title = String((node as any)['trellis:title'] ?? (node as any).name ?? '')
    const description = String((node as any)['trellis:description'] ?? (node as any).description ?? '')
    return { title, description, hasNode: true }
  }

  const syncingHeaderToContent = ref(false)
  const syncingContentToHeader = ref(false)

  const saveCollectionDebounced = useDebounceFn(async (updates: Partial<Collection>) => {
    if (!collection.value) return
    await saveCollection(updates)
  }, 600)

  const syncHeaderFromContent = (raw: string) => {
    if (!collection.value) return
    if (syncingHeaderToContent.value) return

    const meta = extractGraphCollectionMeta(raw)
    if (!meta || !meta.hasNode) return

    if (import.meta.client) {
      const active = document.activeElement
      if (active && (active === titleInputRef.value || active === descriptionTextareaRef.value)) return
    }

    const nextTitle = meta.title.trim()
    const nextDesc = meta.description

    const updates: Partial<Collection> = {}
    if (nextTitle && nextTitle !== collection.value.title) {
      collection.value.title = nextTitle
      updates.title = nextTitle
    }
    if (nextDesc !== (collection.value.description || '')) {
      collection.value.description = nextDesc
      updates.description = nextDesc
    }

    if (Object.keys(updates).length === 0) return

    syncingContentToHeader.value = true
    void saveCollectionDebounced(updates)
    nextTick(() => {
      syncingContentToHeader.value = false
    })
  }

  const syncContentFromHeader = (opts?: { forceCreate?: boolean }) => {
    if (!collection.value) return
    if (!isDatabaseCollection.value) return
    if (syncingContentToHeader.value) return

    const raw = String(content.value || '')
    const trimmed = raw.trim()
    const stripped = stripJsoncComments(raw)
    const hasComments = stripped !== raw
    if (hasComments) return

    const existing = parseGraphFromContent(raw)
    let root: any
    let graph: any[]
    let path: Array<string | number>

    if (!existing) {
      if (!opts?.forceCreate) return
      if (trimmed !== '') return

      const nextTitle = String(collection.value.title || 'Untitled')
      const nextDesc = String(collection.value.description || '')

      root = {
        '@context': createDefaultTrellisContext(),
        graph: {
          '@id': `trellis:graph/${collection.value.id}`,
          '@type': 'trellis:Graph',
          'trellis:title': nextTitle,
          'trellis:description': nextDesc,
          name: nextTitle,
          description: nextDesc,
          nodes: [],
        },
      }

      graph = root.graph.nodes
      path = ['graph', 'nodes']
    } else {
      root = existing.root
      graph = existing.graph
      path = existing.path
    }

    if (path.length >= 2 && path[0] === 'graph') {
      const graphObj = root?.graph
      if (!graphObj || typeof graphObj !== 'object' || Array.isArray(graphObj)) return

      const nextTitle = String(collection.value.title || 'Untitled')
      const nextDesc = String(collection.value.description || '')

      const beforeTitle = String((graphObj as any)['trellis:title'] ?? (graphObj as any).name ?? '')
      const beforeDesc = String((graphObj as any)['trellis:description'] ?? (graphObj as any).description ?? '')

      ;(graphObj as any)['trellis:title'] = nextTitle
      ;(graphObj as any)['trellis:description'] = nextDesc
      ;(graphObj as any).name = nextTitle
      ;(graphObj as any).description = nextDesc

      const changed = beforeTitle !== nextTitle || beforeDesc !== nextDesc
      if (!changed) return

      if (!Array.isArray((graphObj as any).nodes)) {
        ;(graphObj as any).nodes = []
      }

      const nextString = JSON.stringify(root, null, 2)
      if (nextString === content.value) return

      syncingHeaderToContent.value = true
      content.value = nextString
      nextTick(() => {
        syncingHeaderToContent.value = false
      })
      return
    }

    if (!isTrellisGraph(graph) && trimmed !== '') return

    const idKey = getGraphIdKey(graph)
    const typeKey = getGraphTypeKey(graph)

    const collectionId = collection.value.id
    const nodeId = `trellis:collection/${collectionId}`

    let node = graph.find((n) => getNodeType(n) === 'trellis:Collection')
    if (!node || typeof node !== 'object' || Array.isArray(node)) {
      node = { [idKey]: nodeId, [typeKey]: 'trellis:Collection' }
      graph.unshift(node)
    }

    const nextTitle = String(collection.value.title || 'Untitled')
    const nextDesc = String(collection.value.description || '')

    const beforeTitle = String((node as any)['trellis:title'] ?? (node as any).name ?? '')
    const beforeDesc = String((node as any)['trellis:description'] ?? (node as any).description ?? '')

    ;(node as any)['trellis:title'] = nextTitle
    ;(node as any)['trellis:description'] = nextDesc
    ;(node as any).name = nextTitle
    ;(node as any).description = nextDesc

    const changed = beforeTitle !== nextTitle || beforeDesc !== nextDesc || getNodeType(node) !== 'trellis:Collection'
    if (!changed) return

    const nextRoot = Array.isArray(root) ? graph : root
    if (!Array.isArray(root) && path.length === 1) {
      ;(nextRoot as any)[path[0] as any] = graph
      if (!(nextRoot as any)['@context']) (nextRoot as any)['@context'] = createDefaultTrellisContext()
    }

    const nextString = JSON.stringify(nextRoot, null, 2)
    if (nextString === content.value) return

    syncingHeaderToContent.value = true
    content.value = nextString
    nextTick(() => {
      syncingHeaderToContent.value = false
    })
  }

  const tableMountKey = computed(() => {
    const id = collection.value?.id || ''
    return [id, collectionRefreshNonce.value].join(':')
  })

  watch(collectionRefreshNonce, () => {
    void scrollActiveProjectionToTop()
  })

  const schema = ref<DatabaseSchema | null>(null)
  const schemaSettingsId = ref<string | null>(null)
  const schemaIsSaving = ref(false)

  const hasRecordNodesInContent = computed(() => {
    const raw = String(content.value || '')
    const info = parseGraphFromContent(raw)
    if (!info) return false
    return info.graph.some((n) => {
      const t = getNodeType(n)
      if (t === 'trellis:Collection') return false
      if (t === 'trellis:PropertyValueSpecification') return false
      if (!t) return true
      return true
    })
  })

  // Check if collection needs initial setup (no schema fields defined yet)
  const needsSetup = computed(() => {
    if (!schema.value) return false
    return isDatabaseCollection.value && schema.value.fields.length === 0 && !hasRecordNodesInContent.value
  })

  // Sync needsSetup to shared state for AppHeader
  const collectionNeedsSetup = useState<boolean>('collectionNeedsSetup', () => false)
  watch(
    needsSetup,
    () => {
      collectionNeedsSetup.value = false
    },
    { immediate: true },
  )

  onUnmounted(() => {
    collectionNeedsSetup.value = false
  })

  const initializeSchema = (collectionId: string): DatabaseSchema => {
    return createDefaultDatabaseSchema(collectionId)
  }

  const needsSchemaRepair = (raw: any, collectionId: string) => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return true
    if (raw.collectionId !== collectionId) return true
    if (!Array.isArray(raw.fields)) return true
    if (!Array.isArray(raw.views) || raw.views.length === 0) return true
    if (!raw.views.some((v: any) => v && typeof v === 'object' && v.isDefault === true)) return true
    if (typeof raw.createdAt !== 'number') return true
    if (typeof raw.updatedAt !== 'number') return true
    return false
  }

  const loadSchema = async () => {
    if (!collection.value) return
    const collectionId = collection.value.id
    const settingKey = `collection:${collectionId}:schema`

    const resp = await instant.queryOnce({
      settings: {
        $: {
          where: {
            settingKey,
          },
        },
      },
    })

    let existing = (resp.data as any)?.settings?.[0]

    if (!existing?.id) {
      const fallbackResp = await instant.queryOnce({
        settings: {
          $: {
            where: {
              entityType: 'collection',
              entityId: collectionId,
              key: 'schema',
            },
          },
        },
      })
      existing = (fallbackResp.data as any)?.settings?.[0]
    }

    if (existing?.value) {
      const normalized = normalizeDatabaseSchema(existing.value, collectionId)
      schema.value = {
        ...normalized,
        id: existing.id,
        collectionId,
      }
      schemaSettingsId.value = existing.id

      if (needsSchemaRepair(existing.value, collectionId) || existing.settingKey !== settingKey) {
        const authUser = await instant.getAuth()
        if (!authUser) return
        const now = Date.now()
        const nextValue: DatabaseSchema = {
          ...normalized,
          id: existing.id,
          collectionId,
          fields: JSON.parse(JSON.stringify(normalized.fields)),
          views: JSON.parse(JSON.stringify(normalized.views)),
          updatedAt: now,
        }
        await instant.transact([
          tx.settings[existing.id].update({
            ownerId: authUser.id,
            settingKey,
            entityType: 'collection',
            entityId: collectionId,
            key: 'schema',
            value: nextValue,
            updatedAt: now,
          }),
        ])
      }
      return
    }

    schema.value = initializeSchema(collectionId)
    schemaSettingsId.value = null
  }

  watch(
    () => collection.value?.id,
    (id) => {
      if (!id) {
        schema.value = null
        schemaSettingsId.value = null
        return
      }

      schema.value = initializeSchema(id)
      schemaSettingsId.value = null
      if (isDatabaseCollection.value) {
        void loadSchema()
      }
    },
    { immediate: true },
  )

  watch(
    [collectionSchemaSheetOpen, isDatabaseCollection],
    ([open, isDb]) => {
      if (!open) return
      if (!isDb) return
      void loadSchema()
    },
    { immediate: true },
  )

  const saveSchema = async () => {
    if (!schema.value || !collection.value) return
    schemaIsSaving.value = true
    try {
      const authUser = await instant.getAuth()
      if (!authUser) return

      const now = Date.now()
      const collectionId = collection.value.id
      const settingKey = `collection:${collectionId}:schema`

      const nextValue: DatabaseSchema = {
        ...schema.value,
        id: schema.value.id || '',
        collectionId,
        fields: JSON.parse(JSON.stringify(schema.value.fields)),
        views: JSON.parse(JSON.stringify(schema.value.views)),
        updatedAt: now,
      }

      if (schemaSettingsId.value) {
        await instant.transact([
          tx.settings[schemaSettingsId.value].update({
            ownerId: authUser.id,
            settingKey,
            entityType: 'collection',
            entityId: collectionId,
            key: 'schema',
            value: nextValue,
            updatedAt: now,
          }),
        ])
      } else {
        const id = crypto.randomUUID()
        await instant.transact([
          tx.settings[id].create({
            ownerId: authUser.id,
            settingKey,
            entityType: 'collection',
            entityId: collectionId,
            key: 'schema',
            value: nextValue,
            updatedAt: now,
          }),
        ])
        schemaSettingsId.value = id
      }

      schema.value = { ...nextValue, id: schemaSettingsId.value || nextValue.id }
      collectionSchemaSheetOpen.value = false
    } finally {
      schemaIsSaving.value = false
    }
  }

  const applySchemaTemplate = (_template: CollectionTemplate, templateSchema: Partial<DatabaseSchema>) => {
    if (!schema.value || !templateSchema.fields) return

    const wasSetup = needsSetup.value
    schema.value = {
      ...schema.value,
      fields: templateSchema.fields,
    }

    if (wasSetup && collection.value) {
      const emptyContent = serializeTrellisDocument(
        createCollectionGraph({
          collectionId: collection.value.id,
          collectionName: collection.value.title || 'Untitled',
          collectionDescription: collection.value.description || '',
          schemaFields: templateSchema.fields.map((f) => ({
            name: f.name,
            valueType: f.type,
          })),
        }),
        true,
      )
      contentDraftError.value = null
      content.value = emptyContent
      contentDraft.value = emptyContent

      void updateCollectionData(collection.value.id, { content: emptyContent })
    }
  }

  /**
   * Initiate reset content to template scaffold.
   * If collection already has content, show confirmation dialog.
   * Otherwise, apply immediately.
   */
  const initiateResetContent = (template: CollectionTemplate, templateSchema: Partial<DatabaseSchema>) => {
    if (!collection.value || !templateSchema.fields) return

    // Check if there's existing content that would be lost
    const hasExistingContent = content.value && content.value.trim() !== '' && content.value !== '{}'
    if (hasExistingContent) {
      pendingResetTemplate.value = { template, schema: templateSchema }
      resetContentDialogOpen.value = true
    } else {
      executeResetContent(template, templateSchema)
    }
  }

  /**
   * Execute the content reset - regenerates content from template scaffold
   */
  const executeResetContent = (_template: CollectionTemplate, templateSchema: Partial<DatabaseSchema>) => {
    if (!collection.value || !schema.value || !templateSchema.fields) return

    // Update schema with template fields
    schema.value = {
      ...schema.value,
      fields: templateSchema.fields,
    }

    // Generate new content scaffold
    const newContent = serializeTrellisDocument(
      createCollectionGraph({
        collectionId: collection.value.id,
        collectionName: collection.value.title || 'Untitled',
        collectionDescription: collection.value.description || '',
        schemaFields: templateSchema.fields.map((f) => ({
          name: f.name,
          valueType: f.type,
        })),
      }),
      true,
    )

    contentDraftError.value = null
    content.value = newContent
    contentDraft.value = newContent

    // Persist to database
    void updateCollectionData(collection.value.id, { content: newContent })

    // Close dialog if open
    resetContentDialogOpen.value = false
    pendingResetTemplate.value = null
  }

  /**
   * Confirm and execute pending reset
   */
  const confirmResetContent = () => {
    if (pendingResetTemplate.value) {
      executeResetContent(pendingResetTemplate.value.template, pendingResetTemplate.value.schema)
    }
  }

  /**
   * Cancel pending reset
   */
  const cancelResetContent = () => {
    resetContentDialogOpen.value = false
    pendingResetTemplate.value = null
  }

  watch(
    [isDatabaseCollection, projections],
    ([isDb, projs]) => {
      if (!isDb || !projs) return
      if (focusIri.value || focusPath.value) return
      const currentProj = projs.find((p: Projection) => p.id === activeProjection.value)
      void currentProj
    },
    { immediate: true },
  )

  // Projections management
  const loadProjections = async () => {
    if (!collection.value) return
    projectionsIsLoading.value = true
    try {
      const collectionId = collection.value.id
      const settingKey = `collection:${collectionId}:projections`

      const resp = await instant.queryOnce({
        settings: {
          $: {
            where: {
              settingKey,
            },
          },
        },
      })

      let existing = (resp.data as any)?.settings?.[0]

      if (!existing?.id) {
        const fallbackResp = await instant.queryOnce({
          settings: {
            $: {
              where: {
                entityType: 'collection',
                entityId: collectionId,
                key: 'projections',
              },
            },
          },
        })
        existing = (fallbackResp.data as any)?.settings?.[0]
      }

      if (existing?.value) {
        const normalized = normalizeProjections(existing.value, collectionId, collection.value.type)
        projections.value = normalized
        projectionsSettingsId.value = existing.id

        // Set active projection to default if not set
        const defaultProj = normalized.find((p: Projection) => p.isDefault)
        if (defaultProj && !activeProjection.value) {
          activeProjection.value = defaultProj.id
        }
        return
      }

      // Create default projections if none exist
      const defaults = createDefaultProjections(collectionId, collection.value.type)
      projections.value = defaults
      projectionsSettingsId.value = null

      // Set active projection to default
      const defaultProj = defaults.find((p: Projection) => p.isDefault)
      if (defaultProj) {
        activeProjection.value = defaultProj.id
      }
    } finally {
      projectionsIsLoading.value = false
    }
  }

  const saveProjections = async () => {
    if (!collection.value || projections.value.length === 0) return
    projectionsIsSaving.value = true
    try {
      const authUser = await instant.getAuth()
      if (!authUser) return

      const now = Date.now()
      const collectionId = collection.value.id
      const settingKey = `collection:${collectionId}:projections`

      const nextValue = projections.value.map((p) => ({
        ...p,
        config: JSON.parse(JSON.stringify(p.config)),
        query: p.query ? JSON.parse(JSON.stringify(p.query)) : undefined,
      }))

      if (projectionsSettingsId.value) {
        await instant.transact([
          tx.settings[projectionsSettingsId.value].update({
            ownerId: authUser.id,
            settingKey,
            entityType: 'collection',
            entityId: collectionId,
            key: 'projections',
            value: nextValue,
            updatedAt: now,
          }),
        ])
      } else {
        const id = crypto.randomUUID()
        await instant.transact([
          tx.settings[id].create({
            ownerId: authUser.id,
            settingKey,
            entityType: 'collection',
            entityId: collectionId,
            key: 'projections',
            value: nextValue,
            updatedAt: now,
          }),
        ])
        projectionsSettingsId.value = id
      }
    } finally {
      projectionsIsSaving.value = false
    }
  }

  // Load projections when collection changes
  watch(
    () => collection.value?.id,
    (id) => {
      if (!id) {
        projections.value = []
        projectionsSettingsId.value = null
        return
      }
      void loadProjections()
    },
    { immediate: true },
  )

  // Content management
  const content = ref('')
  const contentDraft = ref('')
  const contentDraftError = ref<string | null>(null)
  const isHydratingContent = ref(false)
  const syncingDraftToSafe = ref(false)
  const syncingSafeToDraft = ref(false)
  const saveState = useCollectionSaveState()

  const draftErrorDescription = computed(() => {
    const err = contentDraftError.value
    if (!err) return ''
    return `Sync paused until JSON is valid. ${err}`
  })

  const validateContentDraft = (raw: string): boolean => {
    try {
      const trimmed = (raw || '').trim()
      if (trimmed === '') {
        contentDraftError.value = null
        return true
      }
      JSON.parse(stripJsoncComments(trimmed))
      contentDraftError.value = null
      return true
    } catch (e: any) {
      contentDraftError.value = e?.message ? String(e.message) : 'Invalid JSON'
      return false
    }
  }

  const discardDraftEdits = () => {
    syncingSafeToDraft.value = true
    contentDraft.value = content.value
    syncingSafeToDraft.value = false
    validateContentDraft(contentDraft.value)
  }

  const promoteDraftToSafe = useDebounceFn((next: string) => {
    if (syncingSafeToDraft.value) return
    if (isHydratingContent.value) return

    const isValid = validateContentDraft(next)
    if (!isValid) return
    if (next === content.value) return

    syncingDraftToSafe.value = true
    content.value = next
    syncingDraftToSafe.value = false
  }, 250)

  watch(
    contentDraft,
    (next) => {
      promoteDraftToSafe(next)
    },
    { immediate: true },
  )

  // Load content when collection changes
  watch(
    collection,
    async (newCollection) => {
      if (newCollection) {
        isHydratingContent.value = true

        const nextContent = newCollection.content || ''

        syncingSafeToDraft.value = true
        contentDraft.value = nextContent
        syncingSafeToDraft.value = false

        const isValid = validateContentDraft(nextContent)
        if (isValid) {
          if (nextContent !== content.value) {
            content.value = nextContent
          }

          syncHeaderFromContent(nextContent)
          syncContentFromHeader({ forceCreate: true })
        } else {
          if (content.value !== '') content.value = ''
        }

        await nextTick()
        isHydratingContent.value = false

        // Resize title input and description textarea when collection loads
        nextTick(() => {
          if (titleInputRef.value) {
            titleInputRef.value.style.width = 'auto'
            titleInputRef.value.style.width = `${Math.max(100, titleInputRef.value.scrollWidth + 10)}px`
          }
          if (descriptionTextareaRef.value) {
            descriptionTextareaRef.value.style.height = 'auto'
            descriptionTextareaRef.value.style.height = `${descriptionTextareaRef.value.scrollHeight}px`
          }
        })
      }
    },
    { immediate: true },
  )

  // Auto-save content (debounced)
  const saveContent = useDebounceFn(async (newContent: string) => {
    if (!collection.value || newContent === collection.value.content) return

    saveState.setSaving(true)
    try {
      await updateCollectionData(collection.value.id, { content: newContent })
      saveState.setLastSaved(new Date())
    } catch (error) {
      console.error('Failed to save content:', error)
    } finally {
      saveState.setSaving(false)
    }
  }, 1000)

  const syncHeaderFromContentDebounced = useDebounceFn((newContent: string) => {
    syncHeaderFromContent(newContent)
  }, 250)

  // Force save function (for Cmd+S)
  const forceSave = async () => {
    if (!collection.value) return
    saveState.setSaving(true)
    try {
      await updateCollectionData(collection.value.id, {
        title: collection.value.title,
        description: collection.value.description,
        content: content.value,
      })
      saveState.setLastSaved(new Date())
    } catch (error) {
      console.error('Failed to force save:', error)
    } finally {
      saveState.setSaving(false)
    }
  }

  // Cmd+S keyboard shortcut
  onMounted(() => {
    if (!import.meta.client) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        forceSave()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    onUnmounted(() => {
      window.removeEventListener('keydown', handleKeyDown)
    })

    // Resize title input and description textarea on mount
    nextTick(() => {
      if (titleInputRef.value && collection.value) {
        titleInputRef.value.style.width = 'auto'
        titleInputRef.value.style.width = `${Math.max(100, titleInputRef.value.scrollWidth + 10)}px`
      }
      if (descriptionTextareaRef.value && collection.value) {
        descriptionTextareaRef.value.style.height = 'auto'
        descriptionTextareaRef.value.style.height = `${descriptionTextareaRef.value.scrollHeight}px`
      }
    })
  })

  // Two-way sync across projections: any projection updates `content` in real time.
  // Persistence remains debounced.
  watch(content, (newContent) => {
    if (isHydratingContent.value) return

    syncHeaderFromContentDebounced(newContent)
    saveContent(newContent)

    if (syncingDraftToSafe.value) return
    if (contentDraftError.value) return
    if (newContent === contentDraft.value) return

    syncingSafeToDraft.value = true
    contentDraft.value = newContent
    syncingSafeToDraft.value = false
  })

  const onTitleBlur = async () => {
    if (!collection.value) return
    await saveCollection({ title: collection.value.title })
    syncContentFromHeader()
  }

  const onDescriptionBlur = async () => {
    if (!collection.value) return
    await saveCollection({ description: collection.value.description })
    syncContentFromHeader()
  }

  const saveCollection = async (updates: Partial<Collection>) => {
    if (!collection.value) return
    await updateCollectionData(collection.value.id, updates)
    // UI updates automatically via InstantDB reactivity
  }

  const selectIcon = async (icon: string) => {
    if (!collection.value) return
    await saveCollection({ icon })
    isIconPickerOpen.value = false
  }

  // Projection management functions
  const PROJECTION_ICON_MAP: Partial<Record<Projection['type'], string>> = {
    'trellis-blocks': 'lucide:layout-list',
    table: 'lucide:table',
    kanban: 'lucide:kanban',
    calendar: 'lucide:calendar',
    graph: 'lucide:network',
    list: 'lucide:list',
    spreadsheet: 'lucide:file-spreadsheet',
    blocks: 'lucide:blocks',
    code: 'lucide:code-2',
    'slide-deck': 'lucide:presentation',
    'card-grid': 'lucide:layout-grid',
  }

  const _addProjection = async (type: Projection['type'], name: string) => {
    if (!collection.value) return
    const newProj: Projection = {
      id: crypto.randomUUID(),
      type,
      name,
      icon: PROJECTION_ICON_MAP[type] || 'lucide:text',
      config: {},
      order: projections.value.length,
    }
    projections.value.push(newProj)
    await saveProjections()
    activeProjection.value = newProj.id
  }

  const _deleteProjection = async (projId: string) => {
    if (!collection.value) return
    const proj = projections.value.find((p: Projection) => p.id === projId)
    if (!proj || proj.isDefault) return // Can't delete default projection

    projections.value = projections.value.filter((p: Projection) => p.id !== projId)

    // If we deleted the active projection, switch to default
    if (activeProjection.value === projId) {
      const defaultProj = projections.value.find((p: Projection) => p.isDefault)
      if (defaultProj) {
        activeProjection.value = defaultProj.id
      }
    }

    await saveProjections()
  }

  const _renameProjection = async (projId: string, newName: string) => {
    if (!collection.value) return
    const proj = projections.value.find((p: Projection) => p.id === projId)
    if (proj) {
      proj.name = newName
      await saveProjections()
    }
  }

  const _setDefaultProjection = async (projId: string) => {
    if (!collection.value) return
    projections.value.forEach((p: Projection) => {
      p.isDefault = p.id === projId
    })
    await saveProjections()
  }

  const isProjectionMenuOpen = ref(false)
</script>

<template>
  <Page variant="canvas" :fill-height="true">
    <template #header>
      <div v-if="collection" class="space-y-3">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <button
              class="bg-foreground/0 hover:bg-accent/80 flex h-10 w-10 items-center justify-center rounded-lg transition"
              @click="isIconPickerOpen = true">
              <Icon :name="collection.icon" class="h-6 w-6" />
            </button>

            <input
              ref="titleInputRef"
              :value="collection.title"
              class="bg-transparent text-3xl font-bold outline-none border-none focus:outline-none focus:ring-0 rounded px-2 -ml-2 inline-block min-w-[100px]"
              placeholder="Untitled"
              @input="
                (e) => {
                  const target = e.target as HTMLInputElement
                  collection && (collection.title = target.value)
                  // Auto-resize input to fit content
                  target.style.width = 'auto'
                  target.style.width = `${Math.max(100, target.scrollWidth + 10)}px`
                }
              "
              @blur="onTitleBlur" />
          </div>
        </div>

        <div class="ml-0">
          <textarea
            ref="descriptionTextareaRef"
            :value="collection.description || ''"
            class="bg-transparent text-sm text-foreground/50 outline-none border-none focus:outline-none focus:ring-0 rounded px-2 -ml-2 max-w-[800px] w-full resize-none overflow-hidden"
            :rows="1"
            placeholder="Add a description..."
            @input="
              (e) => {
                const target = e.target as HTMLTextAreaElement
                collection && (collection.description = target.value)
                // Auto-resize textarea to fit content
                target.style.height = 'auto'
                target.style.height = `${target.scrollHeight}px`
              }
            "
            @blur="onDescriptionBlur" />
        </div>
      </div>
    </template>

    <div v-if="isLoading" class="flex h-full items-center justify-center">
      <Icon name="lucide:loader-2" class="h-8 w-8 animate-spin text-muted-foreground" />
    </div>

    <div v-else-if="!collection" class="flex h-full flex-col items-center justify-center">
      <Icon name="lucide:database-x" class="text-muted-foreground mb-4 h-12 w-12" />
      <h2 class="text-lg font-semibold">Collection not found</h2>
      <p class="text-muted-foreground text-sm">The collection you're looking for doesn't exist.</p>
    </div>

    <UiTabs v-else v-model="activeProjection" class="flex h-full flex-col gap-0! border-none">
      <!-- Dynamic Projection Tabs - hidden during setup -->
      <DatabaseToolbar>
        <template #left>
          <UiDropdownMenu v-model:open="isProjectionMenuOpen">
            <UiDropdownMenuTrigger as-child>
              <UiButton
                variant="ghost"
                size="sm"
                class="text-muted-foreground hover:text-foreground flex items-center">
                <Icon :name="activeProjectionConfig?.icon || 'lucide:sliders-horizontal'" class="mr-2 h-4 w-4" />
                {{ activeProjectionConfig?.name || 'View' }}
                <Icon name="lucide:chevron-down" class="ml-2 h-3.5 w-3.5" />
              </UiButton>
            </UiDropdownMenuTrigger>
            <UiDropdownMenuContent align="start" class="w-56">
              <template v-if="recommendedViews.length">
                <UiDropdownMenuLabel>Recommended</UiDropdownMenuLabel>
                <UiDropdownMenuSeparator />
                <UiTooltipProvider v-for="view in recommendedViews" :key="view.type">
                  <UiTooltip :disabled="!view.reason">
                    <UiTooltipTrigger as-child>
                      <UiDropdownMenuItem
                        class="gap-2 group/view"
                        @click="switchToView(view)">
                        <Icon :name="view.icon" class="h-4 w-4" />
                        <span class="flex-1">{{ view.name }}</span>
                        <Icon v-if="view.isDefault" name="lucide:pin" class="h-3 w-3 text-muted-foreground/60" title="Default view" />
                        <button
                          v-if="view.projectionId && !view.isDefault"
                          type="button"
                          class="h-5 w-5 flex items-center justify-center rounded opacity-0 group-hover/view:opacity-100 hover:bg-accent transition-all"
                          title="Set as default"
                          @click.stop="view.projectionId && _setDefaultProjection(view.projectionId)">
                          <Icon name="lucide:pin" class="h-3 w-3 text-muted-foreground" />
                        </button>
                        <Icon v-if="view.isActive" name="lucide:check" class="h-4 w-4 text-primary" />
                      </UiDropdownMenuItem>
                    </UiTooltipTrigger>
                    <UiTooltipContent v-if="view.reason" side="left">
                      {{ view.reason }}
                    </UiTooltipContent>
                  </UiTooltip>
                </UiTooltipProvider>
                <UiDropdownMenuSeparator v-if="otherViews.length" />
              </template>

              <template v-if="otherViews.length">
                <UiDropdownMenuLabel>All</UiDropdownMenuLabel>
                <UiDropdownMenuSeparator />
                <UiTooltipProvider v-for="view in otherViews" :key="view.type">
                  <UiTooltip :disabled="!view.disabled && !view.tooltip">
                    <UiTooltipTrigger as-child>
                      <UiDropdownMenuItem
                        class="gap-2 group/view"
                        :disabled="view.disabled"
                        @click="switchToView(view)">
                        <Icon :name="view.icon" class="h-4 w-4" />
                        <span class="flex-1">{{ view.name }}</span>
                        <Icon v-if="view.isDefault" name="lucide:pin" class="h-3 w-3 text-muted-foreground/60" title="Default view" />
                        <button
                          v-if="view.projectionId && !view.isDefault"
                          type="button"
                          class="h-5 w-5 flex items-center justify-center rounded opacity-0 group-hover/view:opacity-100 hover:bg-accent transition-all"
                          title="Set as default"
                          @click.stop="view.projectionId && _setDefaultProjection(view.projectionId)">
                          <Icon name="lucide:pin" class="h-3 w-3 text-muted-foreground" />
                        </button>
                        <Icon v-if="view.isActive" name="lucide:check" class="h-4 w-4 text-primary" />
                      </UiDropdownMenuItem>
                    </UiTooltipTrigger>
                    <UiTooltipContent v-if="view.tooltip" side="left">
                      {{ view.tooltip }}
                    </UiTooltipContent>
                  </UiTooltip>
                </UiTooltipProvider>
              </template>
            </UiDropdownMenuContent>
          </UiDropdownMenu>
        </template>

        <template #right>
          <UiButton
            v-if="isDatabaseCollection"
            variant="ghost"
            size="icon-sm"
            class="h-7 w-7"
            title="Edit schema"
            @click="setCollectionSchemaSheetOpen(true)">
            <Icon name="lucide:panel-right" class="h-3.5 w-3.5" />
          </UiButton>
        </template>
      </DatabaseToolbar>

      <div
        ref="contentContainer"
        class="min-h-0 flex-1 pb-0"
        :class="activeProjectionType === 'table' || activeProjectionType === 'spreadsheet' ? 'overflow-hidden' : 'overflow-auto'">
        <!-- Intro page for new collections that need setup -->
        <div v-if="false" class="flex h-full items-center justify-center p-8">
          <div class="max-w-3xl w-full space-y-8">
            <div class="text-center space-y-3">
              <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                <Icon :name="collection?.icon || 'lucide:database'" class="h-8 w-8 text-primary" />
              </div>
              <h2 class="text-2xl font-semibold">Set up your collection</h2>
              <p class="text-muted-foreground max-w-md mx-auto">
                Choose a template to get started quickly, or create a custom schema from scratch.
              </p>
            </div>

            <div class="space-y-4">
              <h3 class="text-sm font-medium text-muted-foreground uppercase tracking-wide">Start from a template</h3>
              <CollectionTemplates @select="applySchemaTemplate" />
            </div>

            <div class="relative">
              <div class="absolute inset-0 flex items-center">
                <div class="w-full border-t border-border" />
              </div>
              <div class="relative flex justify-center text-xs uppercase">
                <span class="bg-background px-2 text-muted-foreground">Or</span>
              </div>
            </div>

            <div class="text-center space-y-2">
              <UiButton variant="outline" @click="setCollectionSchemaSheetOpen(true)">
                <Icon name="lucide:settings-2" class="mr-2 h-4 w-4" />
                Create custom schema
              </UiButton>

              <!-- Schema Builder (Edit Mode) -->
              <UiButton
                v-if="showBuilderUI"
                variant="outline"
                class="border-amber-500/30 text-amber-600 hover:bg-amber-500/10"
                @click="schemaBuilderOpen = true">
                <Icon name="lucide:wand-2" class="mr-2 h-4 w-4" />
                Schema Builder
                <span class="ml-2 text-[10px] bg-amber-500/10 px-1.5 py-0.5 rounded">Edit Mode</span>
              </UiButton>
            </div>
          </div>
        </div>

        <!-- Render tab contents dynamically according to the projections list -->
        <template v-for="proj in projections" :key="proj.id">
          <UiTabsContent v-if="proj.type === 'trellis-blocks'" :value="proj.id" class="h-full mt-0">
            <TrellisBlocksProjection
              v-if="activeProjection === proj.id"
              ref="trellisBlocksRef"
              v-model="content"
              :collection-id="collection!.id"
              :schema="schema" />
          </UiTabsContent>

          <UiTabsContent v-if="proj.type === 'table'" :value="proj.id" class="h-full mt-0">
            <TableView
              v-if="activeProjection === proj.id"
              :key="tableMountKey"
              ref="tableProjectionRef"
              v-model="content"
              :collection-id="collection!.id"
              :schema="schema"
              @update:schema="(s) => { schema = s; saveSchema() }" />
          </UiTabsContent>

          <UiTabsContent v-else-if="proj.type === 'kanban'" :value="proj.id" class="h-full mt-0">
            <BoardView
              v-if="activeProjection === proj.id"
              ref="boardProjectionRef"
              v-model="content"
              :collection-id="collection!.id"
              :schema="schema" />
          </UiTabsContent>

          <UiTabsContent v-else-if="proj.type === 'calendar'" :value="proj.id" class="h-full mt-0">
            <CalendarView
              v-if="activeProjection === proj.id"
              ref="calendarProjectionRef"
              v-model="content"
              :collection-id="collection!.id"
              :schema="schema"
              @request-add-date-field="setCollectionSchemaSheetOpen(true)" />
          </UiTabsContent>

          <UiTabsContent v-else-if="proj.type === 'graph'" :value="proj.id" class="h-full mt-0">
            <GraphView
              v-if="activeProjection === proj.id"
              v-model="content"
              :collection-id="collection!.id"
              :schema="schema" />
          </UiTabsContent>

          <UiTabsContent v-else-if="proj.type === 'list'" :value="proj.id" class="h-full mt-0">
            <ListView
              v-if="activeProjection === proj.id"
              v-model="content"
              :collection-id="collection!.id"
              :schema="schema" />
          </UiTabsContent>

          <UiTabsContent v-else-if="proj.type === 'spreadsheet'" :value="proj.id" class="h-full mt-0">
            <CollectionDataGridProjection
              v-if="activeProjection === proj.id"
              ref="spreadsheetProjectionRef"
              v-model="content"
              :collection-id="collection!.id"
              :schema="schema"
              @update:schema="(s) => { schema = s; saveSchema() }" />
          </UiTabsContent>

          <UiTabsContent v-else-if="proj.type === 'blocks'" :value="proj.id" class="h-full mt-0">
            <JsonLdBlocksEditor
              ref="blocksEditorRef"
              v-model="content"
              :schema="schema"
              :focus-iri="focusIri"
              :focus-path="focusPath"
              @request-source="handleRequestSource" />
          </UiTabsContent>

          <UiTabsContent v-else-if="proj.type === 'code'" :value="proj.id" class="h-full mt-0">
            <div class="relative h-full">
              <div v-if="contentDraftError" class="absolute left-0 right-0 top-0 z-10 px-6 pt-3">
                <UiAlert
                  variant="destructive"
                  :filled="true"
                  icon="lucide:alert-triangle"
                  title="Invalid JSON"
                  :description="draftErrorDescription">
                  <template #default>
                    <UiAlertTitle title="Invalid JSON" />
                    <UiAlertDescription :description="draftErrorDescription" />
                    <div class="mt-3 flex items-center justify-end gap-2">
                      <UiButton size="sm" variant="outline" @click="discardDraftEdits">Revert to last valid</UiButton>
                    </div>
                  </template>
                </UiAlert>
              </div>

              <CodeEditor
                ref="codeEditorRef"
                v-model="contentDraft"
                language="jsonc"
                :persist-view-state="true"
                :persist-key="collection?.id || ''"
                height="100%" />
            </div>
          </UiTabsContent>

          <UiTabsContent v-else-if="proj.type === 'slide-deck'" :value="proj.id" class="h-full mt-0">
            <SlideDeckProjection
              v-if="activeProjection === proj.id"
              v-model="content"
              :collection-id="collection!.id"
              :schema="schema"
              :config="proj.config" />
          </UiTabsContent>
        </template>
      </div>
    </UiTabs>

    <!-- Icon Picker Modal -->
    <IconPicker
      v-model:open="isIconPickerOpen"
      :model-value="collection?.icon || ''"
      @update:model-value="selectIcon" />

    <UiSheet :open="collectionSchemaSheetOpen" @update:open="setCollectionSchemaSheetOpen">
      <UiSheetContent
        v-if="collection && isDatabaseCollection"
        side="right"
        class="p-0 sm:max-w-lg"
        :title="'Edit schema'"
        :description="collection.title">
        <template #close></template>
        <div class="flex h-full min-h-0 flex-col">
          <div class="shrink-0 border-b border-border px-4 py-3">
            <div class="flex items-center justify-between">
              <div class="text-sm font-medium text-foreground">Schema</div>
              <UiButton variant="ghost" size="icon-sm" @click="setCollectionSchemaSheetOpen(false)">
                <Icon name="lucide:x" class="h-4 w-4" />
              </UiButton>
            </div>
          </div>

          <div class="min-h-0 flex-1 overflow-auto p-4">
            <div v-if="!schema" class="flex h-full items-center justify-center">
              <Icon name="lucide:loader-2" class="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
            <template v-else>
              <!-- Show templates when schema has no fields -->
              <div v-if="schema.fields.length === 0" class="space-y-4">
                <div class="text-center py-4">
                  <Icon name="lucide:table" class="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <h3 class="font-medium mb-1">No fields yet</h3>
                  <p class="text-sm text-muted-foreground mb-4">Start from a template or add fields manually</p>
                </div>
                <div class="border-t pt-4">
                  <p class="text-sm font-medium mb-3">Quick start templates</p>
                  <CollectionTemplates compact @select="applySchemaTemplate" />
                </div>
                <div class="border-t pt-4">
                  <p class="text-sm font-medium mb-3">Or start from scratch</p>
                  <DataTableSchemaEditor :schema="schema" @update="schema = $event" />
                </div>
              </div>
              <!-- Normal schema editor when fields exist -->
              <template v-else>
                <DataTableSchemaEditor :schema="schema" @update="schema = $event" />

                <!-- Reset content to template section -->
                <div class="border-t mt-6 pt-4">
                  <div class="flex items-center gap-2 mb-3">
                    <Icon name="lucide:refresh-cw" class="h-4 w-4 text-muted-foreground" />
                    <p class="text-sm font-medium">Reset content to template</p>
                  </div>
                  <p class="text-xs text-muted-foreground mb-3">
                    Replace existing data with a fresh scaffold from a template. This will clear all current records.
                  </p>
                  <CollectionTemplates compact @select="initiateResetContent" />
                </div>
              </template>
            </template>
          </div>

          <div class="shrink-0 border-t border-border px-4 py-3">
            <div class="flex items-center justify-end gap-2">
              <UiButton variant="outline" @click="setCollectionSchemaSheetOpen(false)">Cancel</UiButton>
              <UiButton :disabled="!schema || schema.fields.length === 0 || schemaIsSaving" @click="saveSchema">
                <Icon v-if="schemaIsSaving" name="lucide:loader-2" class="mr-2 h-4 w-4 animate-spin" />
                Save changes
              </UiButton>
            </div>
          </div>
        </div>
      </UiSheetContent>
    </UiSheet>

    <!-- Schema Builder Dialog (Edit Mode) -->
    <CollectionSchemaBuilder
      v-if="schema && collection"
      :open="schemaBuilderOpen"
      :schema="schema"
      :collection-title="collection.title"
      @update:open="schemaBuilderOpen = $event"
      @save="schema = $event; saveSchema()" />

    <!-- Reset Content Confirmation Dialog -->
    <UiAlertDialog :open="resetContentDialogOpen" @update:open="(v) => !v && cancelResetContent()">
      <UiAlertDialogContent>
        <UiAlertDialogHeader>
          <UiAlertDialogTitle>Reset collection content?</UiAlertDialogTitle>
          <UiAlertDialogDescription>
            This will replace all existing data with a fresh scaffold from the selected template. This action cannot be
            undone.
          </UiAlertDialogDescription>
        </UiAlertDialogHeader>
        <UiAlertDialogFooter>
          <UiAlertDialogCancel @click="cancelResetContent">Cancel</UiAlertDialogCancel>
          <UiAlertDialogAction variant="destructive" @click="confirmResetContent">
            <Icon name="lucide:refresh-cw" class="mr-2 h-4 w-4" />
            Reset content
          </UiAlertDialogAction>
        </UiAlertDialogFooter>
      </UiAlertDialogContent>
    </UiAlertDialog>
  </Page>
</template>
