import type { EntityReference, EntityType } from '~/types/entity'
import { getEntityTypeConfig } from '~/config/entityRegistry'
import { useEntities } from '~/composables/useEntities'

export interface EntitySearchItem {
  id: string
  title: string
  type: string
  description?: string
}

export function useEntitySearch(options?: { excludeId?: Ref<string | undefined>; filterType?: Ref<string | undefined> }) {
  const { items } = useEntities()

  const search = ref('')

  const filteredItems = computed(() => {
    const q = search.value.toLowerCase().trim()
    const exclude = options?.excludeId?.value
    const typeFilter = options?.filterType?.value

    // Base list: all regular entities
    let list: EntitySearchItem[] = (items.value ?? []) as EntitySearchItem[]

    // Include gcal-enrichment nodes as a special 'gcal-calendar' type
    // so other entities can reference GCal events. Only include when no
    // type filter is active (or when explicitly filtering for 'gcal-calendar').
    const gcalEnrichments: EntitySearchItem[] = (items.value ?? [])
      .filter((i) => (i as any).eventType === 'gcal-enrichment')
      .map((i) => ({ ...i, type: 'gcal-calendar' } as EntitySearchItem))

    if (!typeFilter || typeFilter === 'gcal-calendar') {
      // Merge enrichment nodes; deduplicate by id
      const enrichmentIds = new Set(gcalEnrichments.map((e) => e.id))
      list = [
        ...list.filter((i) => !enrichmentIds.has(i.id)),
        ...gcalEnrichments,
      ]
    }

    if (exclude) {
      list = list.filter((i) => i.id !== exclude)
    }

    if (typeFilter) {
      list = list.filter((i) => i.type === typeFilter)
    }

    if (!q) return list.slice(0, 20)
    return list
      .filter((i) => i.title?.toLowerCase().includes(q) || i.type?.toLowerCase().includes(q) || (i as any).url?.toLowerCase().includes(q))
      .slice(0, 20)
  })

  const getIcon = (type: string) => {
    if (type === 'gcal-calendar') return 'simple-icons:googlecalendar'
    try {
      return getEntityTypeConfig(type as EntityType).icon
    } catch {
      return 'lucide:file'
    }
  }

  const getColor = (type: string) => {
    if (type === 'gcal-calendar') return 'text-blue-600 bg-blue-500/10'
    try {
      const color = getEntityTypeConfig(type as EntityType).color
      return `text-${color}-600 bg-${color}-500/10`
    } catch {
      return 'text-gray-600 bg-gray-500/10'
    }
  }

  const getLabel = (type: string) => {
    if (type === 'gcal-calendar') return 'Google Calendar'
    try {
      return getEntityTypeConfig(type as EntityType).label
    } catch {
      return type
    }
  }

  const buildEntityReference = (item: EntitySearchItem): EntityReference => ({
    kind: 'entity',
    id: `ref-${crypto.randomUUID().slice(0, 8)}`,
    entityId: item.id,
    entityType: item.type as EntityType,
    title: item.title || 'Untitled',
    direction: 'outgoing',
  })

  return {
    items,
    search,
    filteredItems,
    getIcon,
    getColor,
    getLabel,
    buildEntityReference,
  }
}
