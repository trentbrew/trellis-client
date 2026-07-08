import { select, type Selection } from 'd3-selection'
import { zoom as d3Zoom, zoomIdentity, type ZoomBehavior, type ZoomTransform } from 'd3-zoom'
import type { Ref } from 'vue'
import type { DeckViewportTransform } from '~/types/deck'

const MIN_ZOOM = 0.25
const MAX_ZOOM = 3
const FIT_PADDING = 32

type DeckViewportOptions = {
  deckId: Ref<string>
  viewportEl: Ref<HTMLElement | null>
  stageEl: Ref<HTMLElement | null>
}

export function useDeckViewport(options: DeckViewportOptions) {
  const transform = ref<DeckViewportTransform>({ x: 0, y: 0, k: 1 })
  const zoomPercent = computed(() => Math.round(transform.value.k * 100))

  let zoomBehavior: ZoomBehavior<HTMLElement, unknown> | null = null
  let viewportSelection: Selection<HTMLElement, unknown, null, undefined> | null = null
  let spacePressed = false

  const storageKey = computed(() => `deck-canvas:v1:${options.deckId.value}`)

  function toD3Transform(value: DeckViewportTransform): ZoomTransform {
    return zoomIdentity.translate(value.x, value.y).scale(value.k)
  }

  function persist(value = transform.value) {
    if (!import.meta.client) return
    try {
      sessionStorage.setItem(storageKey.value, JSON.stringify(value))
    } catch {
      /* sessionStorage may be unavailable in private contexts */
    }
  }

  function restore(): DeckViewportTransform | null {
    if (!import.meta.client) return null
    try {
      const raw = sessionStorage.getItem(storageKey.value)
      if (!raw) return null
      const parsed = JSON.parse(raw) as Partial<DeckViewportTransform>
      if (
        typeof parsed.x === 'number' &&
        typeof parsed.y === 'number' &&
        typeof parsed.k === 'number'
      ) {
        return {
          x: parsed.x,
          y: parsed.y,
          k: Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, parsed.k)),
        }
      }
    } catch {
      /* ignore bad cached transforms */
    }
    return null
  }

  function apply(next: ZoomTransform, shouldPersist = true) {
    transform.value = { x: next.x, y: next.y, k: next.k }
    if (shouldPersist) persist()
  }

  function setTransform(next: DeckViewportTransform) {
    if (!viewportSelection || !zoomBehavior) {
      transform.value = next
      persist(next)
      return
    }
    const d3Transform = toD3Transform(next)
    viewportSelection.call(zoomBehavior.transform, d3Transform)
  }

  function fit() {
    const viewport = options.viewportEl.value
    const stage = options.stageEl.value
    if (!viewport || !stage) return

    const viewportRect = viewport.getBoundingClientRect()
    const stageWidth = stage.offsetWidth
    const stageHeight = stage.offsetHeight
    if (!viewportRect.width || !viewportRect.height || !stageWidth || !stageHeight) return

    const k = Math.min(
      MAX_ZOOM,
      Math.max(
        MIN_ZOOM,
        Math.min(
          (viewportRect.width - FIT_PADDING * 2) / stageWidth,
          (viewportRect.height - FIT_PADDING * 2) / stageHeight,
        ),
      ),
    )

    setTransform({
      x: (viewportRect.width - stageWidth * k) / 2,
      y: (viewportRect.height - stageHeight * k) / 2,
      k,
    })
  }

  function zoomBy(multiplier: number) {
    if (!viewportSelection || !zoomBehavior) return
    viewportSelection.call(zoomBehavior.scaleBy, multiplier)
  }

  function zoomIn() {
    zoomBy(1.18)
  }

  function zoomOut() {
    zoomBy(1 / 1.18)
  }

  function zoomTo100() {
    const viewport = options.viewportEl.value
    const stage = options.stageEl.value
    if (!viewport || !stage) return
    const rect = viewport.getBoundingClientRect()
    setTransform({
      x: (rect.width - stage.offsetWidth) / 2,
      y: (rect.height - stage.offsetHeight) / 2,
      k: 1,
    })
  }

  function isEditableTarget(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) return false
    return !!target.closest('input, textarea, select, [contenteditable="true"], .ProseMirror')
  }

  function bind() {
    const viewport = options.viewportEl.value
    if (!viewport) return

    viewportSelection = select(viewport)
    zoomBehavior = d3Zoom<HTMLElement, unknown>()
      .scaleExtent([MIN_ZOOM, MAX_ZOOM])
      .filter((event: any) => {
        if (event.type === 'wheel') return event.ctrlKey || event.metaKey
        if (event.type === 'mousedown' || event.type === 'pointerdown' || event.type === 'touchstart') {
          const target = event.target as HTMLElement | null
          const onStage = !!target?.closest?.('[data-deck-stage]')
          return !event.button && (!onStage || spacePressed)
        }
        return !event.ctrlKey
      })
      .on('zoom', (event: { transform: ZoomTransform }) => apply(event.transform))

    viewportSelection.call(zoomBehavior).on('dblclick.zoom', null)
    viewportSelection.on('wheel.deck-pan', (event: WheelEvent) => {
      if (!viewportSelection || !zoomBehavior) return
      if (event.ctrlKey || event.metaKey) return
      event.preventDefault()
      zoomBehavior.translateBy(viewportSelection, -event.deltaX, -event.deltaY)
    })
    viewportSelection.on('dblclick.deck-fit', (event: MouseEvent) => {
      const target = event.target as HTMLElement | null
      if (target?.closest?.('[data-deck-stage]')) return
      event.preventDefault()
      fit()
    })

    const onKeydown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return
      if (event.code === 'Space') spacePressed = true
      if (event.key === '0') fit()
      if (event.key === '1') zoomTo100()
    }
    const onKeyup = (event: KeyboardEvent) => {
      if (event.code === 'Space') spacePressed = false
    }
    window.addEventListener('keydown', onKeydown)
    window.addEventListener('keyup', onKeyup)

    const cached = restore()
    nextTick(() => {
      if (cached) setTransform(cached)
      else fit()
    })

    return () => {
      window.removeEventListener('keydown', onKeydown)
      window.removeEventListener('keyup', onKeyup)
      viewportSelection?.on('.zoom', null)
      viewportSelection?.on('.deck-pan', null)
      viewportSelection?.on('.deck-fit', null)
      viewportSelection = null
      zoomBehavior = null
    }
  }

  return {
    transform,
    zoomPercent,
    bind,
    fit,
    zoomIn,
    zoomOut,
    zoomTo100,
  }
}
