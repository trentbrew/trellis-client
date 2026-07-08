import { computed, onBeforeUnmount, onMounted, ref, type Ref } from 'vue'

export interface UseVirtualRowsOptions {
  rowHeight: number
  overscan?: number
}

/**
 * Windowed row virtualization for a fixed-row-height scroll container.
 * Attach `scrollerRef` to the scrolling element and call `measure` on its
 * scroll event; render only rows in `range` at `index * rowHeight`.
 */
export function useVirtualRows(count: Ref<number>, options: UseVirtualRowsOptions) {
  const overscan = options.overscan ?? 10
  const scrollerRef = ref<HTMLElement | null>(null)
  const viewportTop = ref(0)
  const viewportHeight = ref(0)
  let observer: ResizeObserver | null = null

  const measure = () => {
    const el = scrollerRef.value
    if (!el) return
    viewportTop.value = el.scrollTop
    viewportHeight.value = el.clientHeight
  }

  onMounted(() => {
    measure()
    if (typeof ResizeObserver !== 'undefined' && scrollerRef.value) {
      observer = new ResizeObserver(() => measure())
      observer.observe(scrollerRef.value)
    }
  })

  onBeforeUnmount(() => {
    observer?.disconnect()
    observer = null
  })

  const range = computed(() => {
    const height = viewportHeight.value || 600
    const start = Math.max(0, Math.floor(viewportTop.value / options.rowHeight) - overscan)
    const end = Math.min(count.value, Math.ceil((viewportTop.value + height) / options.rowHeight) + overscan)
    return { start, end }
  })

  function scrollToIndex(index: number) {
    const el = scrollerRef.value
    if (!el || index < 0) return
    const top = index * options.rowHeight
    const bottom = top + options.rowHeight
    if (top < el.scrollTop) el.scrollTop = top
    else if (bottom > el.scrollTop + el.clientHeight) el.scrollTop = bottom - el.clientHeight
  }

  return { scrollerRef, measure, range, scrollToIndex }
}
