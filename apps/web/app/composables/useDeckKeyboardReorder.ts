import type { SlideDefinition } from '~/types/deck'

type Options = {
  slides: Ref<SlideDefinition[]>
  activeIndex: Ref<number>
  onReorder: (_orderedIds: string[]) => Promise<void>
  enabled?: Ref<boolean>
}

/** Alt+↑/↓ reorder for slide tablists (same mutate path as DnD). */
export function useDeckKeyboardReorder(options: Options) {
  const announcement = ref('')

  function handleKeydown(e: KeyboardEvent) {
    if (options.enabled && !unref(options.enabled)) return
    if (!e.altKey) return
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return

    e.preventDefault()
    const from = options.activeIndex.value
    const delta = e.key === 'ArrowUp' ? -1 : 1
    const to = from + delta
    if (to < 0 || to >= options.slides.value.length) return

    const ids = options.slides.value.map((s) => s.entityId)
    const [moved] = ids.splice(from, 1)
    if (!moved) return
    ids.splice(to, 0, moved)
    options.activeIndex.value = to
    announcement.value = `Slide ${from + 1} moved to position ${to + 1}`
    void options.onReorder(ids)
  }

  return { announcement, handleKeydown }
}
