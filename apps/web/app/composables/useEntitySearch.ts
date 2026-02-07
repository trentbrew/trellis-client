import type { EntityReference, EntityType } from '~/types/entity'
import { getEntityTypeConfig } from '~/config/entityRegistry'
import { useCalendarItems } from '~/composables/useCalendarItems'

export interface EntitySearchItem {
  id: string
  title: string
  type: string
  description?: string
}

export function useEntitySearch(options?: { excludeId?: Ref<string | undefined> }) {
  const { items } = useCalendarItems()

  const search = ref('')

  const filteredItems = computed(() => {
    const q = search.value.toLowerCase().trim()
    let list: EntitySearchItem[] = (items.value ?? []) as EntitySearchItem[]

    const exclude = options?.excludeId?.value
    if (exclude) {
      list = list.filter((i) => i.id !== exclude)
    }

    if (!q) return list.slice(0, 20)
    return list.filter((i) => i.title?.toLowerCase().includes(q) || i.type?.toLowerCase().includes(q)).slice(0, 20)
  })

  const getIcon = (type: string) => {
    try {
      return getEntityTypeConfig(type as EntityType).icon
    } catch {
      return 'lucide:file'
    }
  }

  const getColor = (type: string) => {
    try {
      const color = getEntityTypeConfig(type as EntityType).color
      return `text-${color}-600 bg-${color}-500/10`
    } catch {
      return 'text-gray-600 bg-gray-500/10'
    }
  }

  const getLabel = (type: string) => {
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
