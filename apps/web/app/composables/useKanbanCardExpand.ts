import type { MaybeRefOrGetter } from 'vue'
import { toValue } from 'vue'

/**
 * Per-entity expand/collapse for kanban card properties.
 * Persisted in localStorage so disclosure state survives navigation.
 */
export function useKanbanCardExpand(entityType?: MaybeRefOrGetter<string | undefined>) {
  const typeRef = computed(() => toValue(entityType) ?? 'all')

  const storageKey = computed(() => `browse:kanban:${typeRef.value}:expanded-cards`)

  const expandedIds = ref<Set<string>>(new Set())

  function load() {
    if (!import.meta.client) return
    try {
      const raw = window.localStorage.getItem(storageKey.value)
      if (!raw) {
        expandedIds.value = new Set()
        return
      }
      const parsed = JSON.parse(raw)
      expandedIds.value = new Set(Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [])
    } catch {
      expandedIds.value = new Set()
    }
  }

  function persist() {
    if (!import.meta.client) return
    try {
      window.localStorage.setItem(storageKey.value, JSON.stringify([...expandedIds.value]))
    } catch {
      // ignore quota / private mode
    }
  }

  watch(storageKey, load, { immediate: true })

  function isExpanded(entityId: string) {
    return expandedIds.value.has(entityId)
  }

  function toggleExpanded(entityId: string) {
    const next = new Set(expandedIds.value)
    if (next.has(entityId)) next.delete(entityId)
    else next.add(entityId)
    expandedIds.value = next
    persist()
  }

  return { isExpanded, toggleExpanded }
}
