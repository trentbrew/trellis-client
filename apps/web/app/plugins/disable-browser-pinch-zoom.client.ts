/**
 * Block browser-level pinch / ctrl+wheel page zoom so trackpad pinch reaches
 * map canvases and other opt-in zoom surfaces instead of zooming the whole app.
 */
export default defineNuxtPlugin(() => {
  if (!import.meta.client) return

  const PINCH_ZOOM_SELECTOR =
    '.maplibregl-map, .maplibregl-canvas, [data-pinch-zoom], .vue-flow__viewport'

  function allowsPinchZoom(target: EventTarget | null) {
    if (!(target instanceof Element)) return false
    return Boolean(target.closest(PINCH_ZOOM_SELECTOR))
  }

  function onWheel(event: WheelEvent) {
    if (!event.ctrlKey) return
    if (allowsPinchZoom(event.target)) return
    event.preventDefault()
  }

  function onGesture(event: Event) {
    if (allowsPinchZoom(event.target)) return
    event.preventDefault()
  }

  document.addEventListener('wheel', onWheel, { passive: false, capture: true })
  document.addEventListener('gesturestart', onGesture, { passive: false, capture: true })
  document.addEventListener('gesturechange', onGesture, { passive: false, capture: true })
  document.addEventListener('gestureend', onGesture, { passive: false, capture: true })
})
