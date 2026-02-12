import type { CalendarItem } from '~/types/calendarItem'

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
    /** Called before each save — use for field defaults, formulas, etc. */
    beforeSave?: (_item: T) => void
  },
) {
  const { update: updateItem } = useCalendarItems()

  const status = ref<SaveStatus>('idle')
  const debounceMs = options.debounce ?? 800
  let resetTimer: ReturnType<typeof setTimeout> | null = null

  const setStatus = (s: SaveStatus, resetAfter?: number) => {
    status.value = s
    if (resetTimer) clearTimeout(resetTimer)
    if (resetAfter) {
      resetTimer = setTimeout(() => {
        status.value = 'idle'
      }, resetAfter)
    }
  }

  const save = async () => {
    if (!options.enabled.value) return
    if (!item.id) return

    try {
      options.beforeSave?.(item)
      setStatus('saving')
      await updateItem({ ...item } as unknown as CalendarItem)
      setStatus('saved', 2000)
    } catch (err) {
      console.error('[useAutoSave] save failed:', err)
      setStatus('error', 4000)
    }
  }

  watchDebounced(
    () => JSON.stringify(item),
    () => {
      if (options.enabled.value && item.id) {
        save()
      }
    },
    { debounce: debounceMs, deep: false },
  )

  return { status, save }
}
