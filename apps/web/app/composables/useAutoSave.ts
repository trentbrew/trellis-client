import type { Entity } from '~/types/entity'

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

/**
 * Auto-save composable for entity dialogs.
 *
 * Watches a reactive item for changes and debounces a save call.
 * Only active when `enabled` is true (i.e. edit mode, not create mode).
 *
 * Returns a reactive `status` ref for UI feedback:
 * - `idle`   — no pending changes
 * - `saving` — write in progress
 * - `saved`  — last write succeeded (resets to idle after 2s)
 * - `error`  — last write failed (resets to idle after 4s)
 */
export function useAutoSave<T extends Record<string, any>>(
  item: T,
  options: {
    /** Whether auto-save is active (typically `isEditMode`) */
    enabled: Ref<boolean> | ComputedRef<boolean>
    /** Debounce delay in ms. Default 800. */
    debounce?: number
    /** Called before each save — use for field defaults, formulas, etc. May be async. */
    beforeSave?: (_item: T) => void | Promise<void>
    /** Keys to ignore when computing the change snapshot. */
    ignoreKeys?: string[]
  },
) {
  const { update: updateItem } = useEntities()

  const status = ref<SaveStatus>('idle')
  const lastSavedAt = ref<Date | null>(null)
  const debounceMs = options.debounce ?? 800
  let resetTimer: ReturnType<typeof setTimeout> | null = null
  const ignoredKeys = new Set(options.ignoreKeys ?? ['updatedAt', 'createdAt'])
  const lastSnapshot = ref<string | null>(null)

  const formatLastSaved = computed(() => {
    if (!lastSavedAt.value) return ''
    return lastSavedAt.value.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  })

  const setStatus = (s: SaveStatus, resetAfter?: number) => {
    status.value = s
    if (resetTimer) clearTimeout(resetTimer)
    if (resetAfter) {
      resetTimer = setTimeout(() => {
        status.value = 'idle'
      }, resetAfter)
    }
  }

  const buildSnapshot = (): string => {
    const base: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(item as Record<string, unknown>)) {
      if (ignoredKeys.has(key)) continue
      base[key] = value
    }
    return JSON.stringify(base)
  }

  const resetSnapshot = () => {
    lastSnapshot.value = buildSnapshot()
  }

  const save = async () => {
    if (!options.enabled.value) return
    if (!item.id) return

    try {
      await options.beforeSave?.(item)
      setStatus('saving')
      await updateItem({ ...item } as unknown as Entity)
      lastSavedAt.value = new Date()
      setStatus('saved', 2000)
    } catch (err) {
      console.error('[useAutoSave] save failed:', err)
      setStatus('error', 4000)
    }
  }

  watch(
    () => [options.enabled.value, item.id],
    ([enabled, id]) => {
      if (enabled && id) resetSnapshot()
      else lastSnapshot.value = null
    },
    { immediate: true },
  )

  watchDebounced(
    () => buildSnapshot(),
    (snapshot) => {
      if (!options.enabled.value || !item.id) return
      if (lastSnapshot.value === null) {
        lastSnapshot.value = snapshot
        return
      }
      if (snapshot === lastSnapshot.value) return
      lastSnapshot.value = snapshot
      save()
    },
    { debounce: debounceMs, deep: false },
  )

  return { status, save, lastSavedAt, formatLastSaved }
}
