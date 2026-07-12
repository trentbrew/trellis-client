import { ref, watch, computed, type Ref } from 'vue'
import {
  BROWSE_GRID_DEFAULT_DENSITY,
  BROWSE_GRID_DENSITY_STEP,
  BROWSE_GRID_MIN_DENSITY,
  BROWSE_GRID_MAX_DENSITY,
  browseGridDensityLabel,
  buildBrowseGridStyle,
  clampBrowseGridDensity,
  colsPreferenceToDensity,
} from '~/lib/browse-grid-density'

const LEGACY_COLS_PREFIX = 'browse:grid-cols:'
const DENSITY_PREFIX = 'browse:grid-density:'

function loadDensity(storageKey: string, fallback = BROWSE_GRID_DEFAULT_DENSITY) {
  if (!import.meta.client) return fallback
  try {
    const densityRaw = window.localStorage.getItem(`${DENSITY_PREFIX}${storageKey}`)
    if (densityRaw) {
      const parsed = Number.parseFloat(densityRaw)
      if (Number.isFinite(parsed)) return clampBrowseGridDensity(parsed)
    }

    const legacyRaw = window.localStorage.getItem(`${LEGACY_COLS_PREFIX}${storageKey}`)
    if (legacyRaw) {
      const cols = Number.parseInt(legacyRaw, 10)
      if (Number.isFinite(cols)) return colsPreferenceToDensity(cols)
    }
  } catch {
    // ignore quota / private mode
  }
  return fallback
}

function saveDensity(storageKey: string, density: number) {
  if (!import.meta.client) return
  try {
    window.localStorage.setItem(`${DENSITY_PREFIX}${storageKey}`, String(density))
  } catch {
    // ignore quota / private mode
  }
}

function touchDistance(touches: TouchList) {
  const dx = touches[0]!.clientX - touches[1]!.clientX
  const dy = touches[0]!.clientY - touches[1]!.clientY
  return Math.hypot(dx, dy)
}

/**
 * Responsive browse card-grid density — auto-fill reflow plus persisted pinch/keyboard zoom.
 */
export function useBrowseGridDensity(storageKey: Ref<string>) {
  const density = ref(BROWSE_GRID_DEFAULT_DENSITY)

  let pinchStartDistance = 0
  let pinchStartDensity = BROWSE_GRID_DEFAULT_DENSITY

  watch(
    storageKey,
    (key) => {
      density.value = loadDensity(key)
    },
    { immediate: true },
  )

  watch(density, (value) => {
    saveDensity(storageKey.value, value)
  })

  const gridStyle = computed(() => buildBrowseGridStyle(density.value))
  const densityLabel = computed(() => browseGridDensityLabel(density.value))

  function setDensity(next: number) {
    density.value = clampBrowseGridDensity(next)
  }

  function zoomIn() {
    setDensity(density.value + BROWSE_GRID_DENSITY_STEP)
  }

  function zoomOut() {
    setDensity(density.value - BROWSE_GRID_DENSITY_STEP)
  }

  function applyWheelDelta(deltaY: number) {
    setDensity(density.value - deltaY * 0.002)
  }

  function onGridDensityWheel(event: WheelEvent) {
    if (!event.ctrlKey) return
    event.preventDefault()
    applyWheelDelta(event.deltaY)
  }

  function onGridDensityTouchStart(event: TouchEvent) {
    if (event.touches.length !== 2) return
    pinchStartDistance = touchDistance(event.touches)
    pinchStartDensity = density.value
  }

  function onGridDensityTouchMove(event: TouchEvent) {
    if (event.touches.length !== 2 || pinchStartDistance <= 0) return
    event.preventDefault()
    const scale = touchDistance(event.touches) / pinchStartDistance
    setDensity(pinchStartDensity * scale)
  }

  function onGridDensityTouchEnd(event: TouchEvent) {
    if (event.touches.length >= 2) return
    pinchStartDistance = 0
  }

  return {
    density,
    densityLabel,
    gridStyle,
    zoomIn,
    zoomOut,
    setDensity,
    onGridDensityWheel,
    onGridDensityTouchStart,
    onGridDensityTouchMove,
    onGridDensityTouchEnd,
    minDensity: BROWSE_GRID_MIN_DENSITY,
    maxDensity: BROWSE_GRID_MAX_DENSITY,
  }
}
