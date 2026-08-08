import type { DeckDefinition, DeckSlideObject, QueryViewRegionConfig, SlideDefinition, SlideLayoutId, SlideRegions } from '~/types/deck'
import { useSSEStatus } from '~/composables/useTrellisSSE'
import { entityId as toEntityId } from '~/lib/tql-namespace'
import { YC_S26_SLIDE_QUERY } from '~/lib/deck-demo'
import { FOUNDER_FACILITY_ID, WORKSHOP_ZONE_ID } from '~/lib/workshop-create'
import { createDeckHtmlObject } from '~/lib/block-registry/html-embed'

function parseQueryView(raw: unknown): QueryViewRegionConfig | undefined {
  if (raw == null) return undefined
  if (typeof raw === 'object' && !Array.isArray(raw)) return raw as QueryViewRegionConfig
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as QueryViewRegionConfig
    } catch {
      return undefined
    }
  }
  return undefined
}

function parseDeckObjects(raw: unknown): DeckSlideObject[] | undefined {
  if (raw == null) return undefined
  let parsed = raw
  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw)
    } catch {
      return undefined
    }
  }
  if (!Array.isArray(parsed)) return undefined
  const objects = parsed
    .filter((item): item is Record<string, unknown> => item != null && typeof item === 'object' && !Array.isArray(item))
    .filter((item) => item.kind === 'html' && typeof item.id === 'string')
    .map((item) => {
      const block = item.block && typeof item.block === 'object' && !Array.isArray(item.block)
        ? item.block as Record<string, unknown>
        : {}
      const frame = item.frame && typeof item.frame === 'object' && !Array.isArray(item.frame)
        ? item.frame as Record<string, unknown>
        : {}
      const id = typeof item.id === 'string' ? item.id : String(item.id ?? '')
      return createDeckHtmlObject({
        id,
        block: {
          id,
          title: typeof block.title === 'string' ? block.title : 'HTML embed',
          source: typeof block.source === 'string' ? block.source : undefined,
          height: typeof block.height === 'number' ? block.height : undefined,
          lastValidSource: typeof block.lastValidSource === 'string' ? block.lastValidSource : undefined,
          kind: 'html',
          safety: { allowScripts: false, trusted: false },
        },
        frame: {
          x: Number(frame.x) || 12,
          y: Number(frame.y) || 30,
          width: Number(frame.width) || 76,
          height: Number(frame.height) || 38,
          zIndex: Number(frame.zIndex) || 10,
        },
        style: item.style as DeckSlideObject['style'],
        motion: item.motion as DeckSlideObject['motion'],
      })
    })
  return objects.length ? objects : undefined
}

function parseRegionsFromNode(data: Record<string, unknown>): SlideRegions {
  const regions: SlideRegions = {}
  const nested = data.regions
  if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
    const obj = nested as Record<string, unknown>
    if (obj.eyebrow != null) regions.eyebrow = String(obj.eyebrow)
    if (obj.title != null) regions.title = String(obj.title)
    if (obj.body != null) regions.body = String(obj.body)
    if (obj.layoutId != null) regions.layoutId = String(obj.layoutId) as SlideLayoutId
    regions.queryView = parseQueryView(obj.queryView)
    regions.objects = parseDeckObjects(obj.objects)
  } else if (typeof nested === 'string') {
    try {
      Object.assign(regions, JSON.parse(nested) as SlideRegions)
    } catch {
      /* ignore */
    }
  }
  for (const [key, value] of Object.entries(data)) {
    if (!key.startsWith('regions.') || value == null) continue
    const regionKey = key.slice('regions.'.length)
    if (regionKey === 'queryView') {
      regions.queryView = parseQueryView(value)
    } else if (regionKey === 'layoutId') {
      regions.layoutId = String(value) as SlideLayoutId
    } else if (regionKey === 'eyebrow' || regionKey === 'title' || regionKey === 'body') {
      regions[regionKey] = String(value)
    } else if (regionKey === 'objects') {
      regions.objects = parseDeckObjects(value)
    }
  }
  if (typeof regions.queryView === 'string') {
    regions.queryView = parseQueryView(regions.queryView)
  }
  return regions
}

function slideFromNode(node: Record<string, unknown>, entityId: string): SlideDefinition {
  const data = (node.data ?? node) as Record<string, unknown>
  const regions = parseRegionsFromNode(data)
  const titleFromRegions = regions.title?.replace(/<[^>]+>/g, '').trim()
  return {
    entityId,
    title: String(data.title ?? titleFromRegions ?? 'Slide'),
    order: Number(data.order) || 0,
    regions,
    speakerNotes: data.speakerNotes != null ? String(data.speakerNotes) : undefined,
    deckId: data.deckId != null ? String(data.deckId) : undefined,
  }
}

function rowEntityId(row: Record<string, unknown>): string {
  const id = row['?s'] ?? row['?e'] ?? row.id ?? row['@id'] ?? row.entityId
  return typeof id === 'string' ? id : ''
}

/**
 * Reactive deck projection — deck meta, ordered slides, region mutations.
 */
export function useDeckProjection(deckIdInput: MaybeRef<string>) {
  const deckId = computed(() => unref(deckIdInput))
  const { query, fetchNode, fetchNodes, mutate, graphVersion } = useTrellisGraph()
  const sseConnected = useSSEStatus()

  const deckDef = ref<DeckDefinition | null>(null)
  const deckLoading = ref(true)
  const deckError = ref<string | null>(null)
  const slides = ref<SlideDefinition[]>([])
  const slidesLoading = ref(false)
  const slidesError = ref<string | null>(null)
  const optimisticRegionsBySlide = new Map<string, SlideRegions>()

  async function loadDeckMeta() {
    if (!deckId.value) return
    deckLoading.value = true
    deckError.value = null
    try {
      const id = deckId.value.includes(':') ? deckId.value : toEntityId(deckId.value)
      const { node } = await fetchNode(id)
      const data = node?.data ?? node ?? {}
      deckDef.value = {
        title: (data.title as string) || 'Deck',
        zoneId: data.zoneId as string | undefined,
        facilityId: data.facilityId as string | undefined,
      }
    } catch (e: unknown) {
      deckError.value = e instanceof Error ? e.message : 'Failed to load deck'
      deckDef.value = null
    } finally {
      deckLoading.value = false
    }
  }

  const slideQuery = computed(() => {
    if (!deckId.value) return ''
    const id = deckId.value.includes(':') ? deckId.value : toEntityId(deckId.value)
    return YC_S26_SLIDE_QUERY(id)
  })

  const { data: rawSlideRows, loading: slideIdsLoading, error: slideIdsError } = query(slideQuery)

  async function hydrateSlides(ids: string[]) {
    if (!ids.length) {
      slides.value = []
      return
    }
    slidesLoading.value = true
    slidesError.value = null
    try {
      const nodes = await fetchNodes(ids)
      const byId = new Map<string, Record<string, unknown>>()
      for (const node of nodes) {
        const id = String(node['@id'] ?? node.entityId ?? '')
        if (id) byId.set(id, node)
      }
      slides.value = ids
        .map((id) => {
          const node = byId.get(id)
          if (!node) return null
          let slide = slideFromNode(node, id)
          const optimistic = optimisticRegionsBySlide.get(id)
          if (optimistic) {
            slide = { ...slide, regions: { ...slide.regions, ...optimistic } }
          }
          return slide
        })
        .filter((s): s is SlideDefinition => s != null)
        .sort((a, b) => a.order - b.order)
    } catch (e: unknown) {
      slidesError.value = e instanceof Error ? e.message : 'Failed to load slides'
      slides.value = []
    } finally {
      slidesLoading.value = false
    }
  }

  watch(
    [rawSlideRows, graphVersion],
    () => {
      const ids = (rawSlideRows.value || []).map(rowEntityId).filter(Boolean)
      void hydrateSlides(ids)
    },
    { immediate: true },
  )

  watch(deckId, () => loadDeckMeta(), { immediate: true })

  async function updateSlideRegions(slideEntityId: string, patch: Partial<SlideRegions>): Promise<void> {
    const slideIndex = slides.value.findIndex((s) => s.entityId === slideEntityId)
    const slide = slideIndex >= 0 ? slides.value[slideIndex] : undefined
    const merged: SlideRegions = { ...(slide?.regions ?? {}), ...patch }

    if (slide && slideIndex >= 0) {
      slides.value[slideIndex] = { ...slide, regions: merged }
    }

    optimisticRegionsBySlide.set(slideEntityId, merged)

    const data: Record<string, string> = {}
    if (merged.eyebrow != null) data['regions.eyebrow'] = merged.eyebrow
    if (merged.title != null) data['regions.title'] = merged.title
    if (merged.body != null) data['regions.body'] = merged.body
    if (merged.queryView != null) data['regions.queryView'] = JSON.stringify(merged.queryView)
    if (merged.objects != null) data['regions.objects'] = JSON.stringify(merged.objects)
    if (merged.layoutId != null) data['regions.layoutId'] = merged.layoutId
    try {
      await mutate({
        action: 'updateNode',
        entityId: slideEntityId,
        type: 'entity',
        data,
      })
    } finally {
      optimisticRegionsBySlide.delete(slideEntityId)
    }
  }

  async function updateSpeakerNotes(slideEntityId: string, html: string): Promise<void> {
    await mutate({
      action: 'updateNode',
      entityId: slideEntityId,
      type: 'entity',
      data: { speakerNotes: html },
    })
  }

  async function updateSlideOrder(reorderedIds: string[]): Promise<void> {
    const byId = new Map(slides.value.map((s) => [s.entityId, s]))
    slides.value = reorderedIds
      .map((id, index) => {
        const slide = byId.get(id)
        return slide ? { ...slide, order: index + 1 } : null
      })
      .filter((s): s is SlideDefinition => s != null)

    await Promise.all(
      reorderedIds.map((entityId, index) =>
        mutate({
          action: 'updateNode',
          entityId,
          type: 'entity',
          data: { order: index + 1 },
        }),
      ),
    )
  }

  const creatingSlide = ref(false)

  function deckSlugFromId(id: string): string {
    return id.replace(/^entity:deck-/, '').replace(/^entity:/, '')
  }

  function nextSlideEntityId(deckEntityId: string): string {
    const slug = deckSlugFromId(deckEntityId)
    const taken = new Set(slides.value.map((s) => s.entityId))
    let n = slides.value.length + 1
    let candidate = toEntityId(`slide-${slug}-${n}`)
    while (taken.has(candidate)) {
      n += 1
      candidate = toEntityId(`slide-${slug}-${n}`)
    }
    return candidate
  }

  async function createSlide(): Promise<string | null> {
    if (!deckId.value || creatingSlide.value) return null
    creatingSlide.value = true
    try {
      const deckEntityId = deckId.value.includes(':') ? deckId.value : toEntityId(deckId.value)
      const order = slides.value.length + 1
      const slideEntityId = nextSlideEntityId(deckEntityId)
      const zoneId = deckDef.value?.zoneId ?? WORKSHOP_ZONE_ID
      const facilityId = deckDef.value?.facilityId ?? FOUNDER_FACILITY_ID
      const label = `Slide ${order}`

      await mutate({
        action: 'createNode',
        entityId: slideEntityId,
        type: 'entity',
        data: {
          type: 'slide',
          title: label,
          deckId: deckEntityId,
          order,
          'regions.title': `<p>${label}</p>`,
          'regions.body': '<p></p>',
          'regions.layoutId': 'content',
          zoneId,
          facilityId,
        },
      })

      await mutate({
        action: 'link',
        e1: deckEntityId,
        relation: 'parentOf',
        e2: slideEntityId,
      })

      return slideEntityId
    } finally {
      creatingSlide.value = false
    }
  }

  async function deleteSlide(slideEntityId: string): Promise<void> {
    await mutate({
      action: 'deleteNode',
      entityId: slideEntityId,
    })
    const remaining = slides.value
      .filter((s) => s.entityId !== slideEntityId)
      .map((s) => s.entityId)
    if (remaining.length) await updateSlideOrder(remaining)
  }

  return {
    deckDef,
    deckLoading,
    deckError,
    slides,
    slidesLoading: computed(() => slideIdsLoading.value || slidesLoading.value),
    slidesError: computed(() => slideIdsError.value ?? slidesError.value),
    sseConnected,
    creatingSlide,
    updateSlideRegions,
    updateSpeakerNotes,
    updateSlideOrder,
    createSlide,
    deleteSlide,
    reload: loadDeckMeta,
  }
}

export type DeckProjection = ReturnType<typeof useDeckProjection>
