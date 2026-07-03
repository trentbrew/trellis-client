<script setup lang="ts">
  import maplibregl from 'maplibre-gl'
  import 'maplibre-gl/dist/maplibre-gl.css'
  import type { MapPin } from '~/lib/locations/types'
  import { MAP_ATTRIBUTION, MAP_STYLE_URL } from '~/lib/locations/map-config'
  import { pinColor } from '~/lib/locations/pin-styles'

  const {
    isResolving,
    geocodeFailures,
    filteredPins,
    hoveredPinId,
    selectedPinId,
    pendingFlyTo,
    prefersReducedMotion,
    hasCandidates,
    loadViewport,
    saveViewport,
    openPinEntity,
    clearPendingFlyTo,
    createLocationEntity,
  } = useLocationsMap()

  const mapContainer = ref<HTMLElement | null>(null)
  const mapReady = ref(false)
  const locateDenied = ref(false)

  let map: maplibregl.Map | null = null
  const markers = new Map<string, { marker: maplibregl.Marker; el: HTMLElement }>()
  let hidePreviewTimer: ReturnType<typeof setTimeout> | null = null
  let onWheelPan: ((_event: WheelEvent) => void) | null = null

  const previewPin = ref<MapPin | null>(null)
  const previewVisible = ref(false)
  const previewStyle = ref<Record<string, string>>({})

  function updateMarkerSelection(el: HTMLElement, pinId: string) {
    const active = selectedPinId.value === pinId || hoveredPinId.value === pinId
    el.style.boxShadow = active ? '0 0 0 2px var(--primary, #e85d4c)' : 'none'
  }

  function showPreviewForPin(pin: MapPin, el: HTMLElement) {
    if (hidePreviewTimer) {
      clearTimeout(hidePreviewTimer)
      hidePreviewTimer = null
    }
    hoveredPinId.value = pin.id
    previewPin.value = pin
    const rect = el.getBoundingClientRect()
    const flipBelow = rect.top < 120
    const top = flipBelow ? rect.bottom + 8 : rect.top - 8
    previewStyle.value = {
      left: `${Math.max(8, Math.min(rect.left, window.innerWidth - 296))}px`,
      top: `${top}px`,
      transform: flipBelow ? 'none' : 'translateY(-100%)',
    }
    previewVisible.value = true
  }

  function scheduleHidePreview() {
    hidePreviewTimer = setTimeout(() => {
      previewVisible.value = false
      previewPin.value = null
      hoveredPinId.value = null
    }, 180)
  }

  function keepPreview() {
    if (hidePreviewTimer) {
      clearTimeout(hidePreviewTimer)
      hidePreviewTimer = null
    }
  }

  function createMarkerElement(pin: MapPin): HTMLElement {
    const el = document.createElement('button')
    el.type = 'button'
    el.setAttribute('role', 'button')
    el.setAttribute('aria-label', `${pin.entityType}: ${pin.label}`)
    el.tabIndex = 0
    el.style.cssText = [
      'width:28px',
      'height:28px',
      'border-radius:50%',
      'border:2px solid var(--background,#0a0a0c)',
      `background:${pinColor(pin.entityType)}`,
      'cursor:pointer',
      'padding:0',
      'transition:box-shadow 0.15s ease',
    ].join(';')

    el.addEventListener('mouseenter', () => showPreviewForPin(pin, el))
    el.addEventListener('mouseleave', scheduleHidePreview)
    el.addEventListener('click', (event) => {
      event.stopPropagation()
      openPinEntity(pin)
    })
    el.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        openPinEntity(pin)
      }
    })

    return el
  }

  function syncMarkers() {
    if (!map) return

    const ids = new Set(filteredPins.value.map((pin) => pin.id))
    for (const [id, entry] of markers) {
      if (!ids.has(id)) {
        entry.marker.remove()
        markers.delete(id)
      }
    }

    for (const pin of filteredPins.value) {
      const existing = markers.get(pin.id)
      if (existing) {
        existing.marker.setLngLat([pin.lng, pin.lat])
        updateMarkerSelection(existing.el, pin.id)
        continue
      }
      const el = createMarkerElement(pin)
      const marker = new maplibregl.Marker({ element: el }).setLngLat([pin.lng, pin.lat]).addTo(map)
      markers.set(pin.id, { marker, el })
      updateMarkerSelection(el, pin.id)
    }
  }

  function initMap() {
    if (!mapContainer.value) return

    const saved = loadViewport()

    map = new maplibregl.Map({
      container: mapContainer.value,
      style: MAP_STYLE_URL,
      center: saved ? [saved.lng, saved.lat] : [-122.42, 37.77],
      zoom: saved?.zoom ?? 10,
    })

    map.on('load', () => {
      mapReady.value = true
      syncMarkers()
      if (!saved && filteredPins.value.length > 0) fitAll()
      if (pendingFlyTo.value) {
        const target = pendingFlyTo.value
        flyTo(target.lng, target.lat, target.zoom)
        clearPendingFlyTo()
      }
    })

    map.on('moveend', () => {
      if (!map) return
      const center = map.getCenter()
      saveViewport({ lng: center.lng, lat: center.lat, zoom: map.getZoom() })
    })

    // Figma-style gestures: wheel pans; ctrl+wheel (trackpad pinch) uses MapLibre scrollZoom.
    map.scrollZoom.enable()
    onWheelPan = (event: WheelEvent) => {
      if (!map) return
      if (event.ctrlKey) return
      event.preventDefault()
      event.stopImmediatePropagation()
      map.panBy([event.deltaX, event.deltaY], { animate: false })
    }
    map.getCanvas().addEventListener('wheel', onWheelPan, { passive: false, capture: true })
  }

  function flyTo(lng: number, lat: number, zoom?: number) {
    if (!map) return
    map.flyTo({
      center: [lng, lat],
      zoom: zoom ?? map.getZoom(),
      duration: prefersReducedMotion.value ? 0 : 800,
    })
  }

  function zoomIn() {
    map?.zoomIn({ duration: prefersReducedMotion.value ? 0 : 300 })
  }

  function zoomOut() {
    map?.zoomOut({ duration: prefersReducedMotion.value ? 0 : 300 })
  }

  function fitAll() {
    if (!map || filteredPins.value.length === 0) return
    const bounds = new maplibregl.LngLatBounds()
    for (const pin of filteredPins.value) bounds.extend([pin.lng, pin.lat])
    map.fitBounds(bounds, {
      padding: 60,
      duration: prefersReducedMotion.value ? 0 : 800,
      maxZoom: 14,
    })
  }

  function locateUser() {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        locateDenied.value = false
        flyTo(pos.coords.longitude, pos.coords.latitude, 12)
      },
      () => {
        locateDenied.value = true
      },
    )
  }

  async function createSampleEvent() {
    await createLocationEntity('event')
  }

  watch(filteredPins, () => syncMarkers(), { deep: true })

  watch(mapReady, (ready) => {
    if (ready) syncMarkers()
  })

  watch([hoveredPinId, selectedPinId], () => {
    for (const [id, { el }] of markers) updateMarkerSelection(el, id)
  })

  watch(pendingFlyTo, (target) => {
    if (!target || !map || !mapReady.value) return
    flyTo(target.lng, target.lat, target.zoom)
    clearPendingFlyTo()
  })

  onMounted(() => {
    nextTick(() => initMap())
  })

  onBeforeUnmount(() => {
    if (hidePreviewTimer) clearTimeout(hidePreviewTimer)
    if (map && onWheelPan) map.getCanvas().removeEventListener('wheel', onWheelPan, { capture: true })
    onWheelPan = null
    for (const { marker } of markers.values()) marker.remove()
    markers.clear()
    map?.remove()
    map = null
  })
</script>

<template>
  <div class="relative h-full w-full overflow-hidden" aria-label="Locations map">
    <div v-if="!mapReady || isResolving" class="absolute inset-0 z-[5] flex items-center justify-center bg-background/40">
      <Icon name="lucide:loader-circle" class="h-8 w-8 animate-spin text-muted-foreground" />
    </div>

    <div ref="mapContainer" class="absolute inset-0 h-full w-full" style="touch-action: none" />

    <div
      class="pointer-events-none absolute inset-0 z-[1]"
      style="background: radial-gradient(ellipse at center, transparent 35%, rgba(10, 10, 12, 0.55) 100%)" />

    <p
      v-if="mapReady"
      class="pointer-events-none absolute bottom-1 right-2 z-[2] text-[9px] text-muted-foreground/70">
      {{ MAP_ATTRIBUTION }}
    </p>

    <MapZoomControls
      v-if="mapReady"
      @zoom-in="zoomIn"
      @zoom-out="zoomOut"
      @fit-all="fitAll"
      @locate="locateUser" />

    <div
      v-if="geocodeFailures > 0 && mapReady"
      class="pointer-events-none absolute bottom-4 left-4 z-10 max-w-xs rounded-lg border border-border/60 bg-card/90 px-3 py-2 text-[11px] text-muted-foreground backdrop-blur-sm">
      Some locations couldn't be placed ({{ geocodeFailures }}).
    </div>

    <div
      v-if="locateDenied"
      class="pointer-events-none absolute bottom-16 left-1/2 z-10 -translate-x-1/2 rounded-lg border border-border/60 bg-card/90 px-3 py-1.5 text-[11px] text-muted-foreground backdrop-blur-sm">
      Location permission denied
    </div>

    <div
      v-if="mapReady && !isResolving && !hasCandidates"
      class="pointer-events-none absolute inset-0 z-[4] flex items-center justify-center">
      <div
        class="pointer-events-auto flex max-w-sm flex-col items-center gap-3 rounded-2xl border border-border bg-card/95 px-6 py-8 text-center shadow-lg backdrop-blur-sm">
        <Icon name="lucide:map-pin" class="h-10 w-10 text-primary/70" />
        <h2 class="text-sm font-semibold">No places yet</h2>
        <p class="text-xs text-muted-foreground">
          Add a location to an event, trip, or appointment — or set latitude and longitude on the entity.
        </p>
        <UiButton size="sm" @click="createSampleEvent">Create event</UiButton>
      </div>
    </div>

    <MapPreviewCard
      :pin="previewPin"
      :style="previewStyle"
      :visible="previewVisible"
      @enter="keepPreview"
      @leave="scheduleHidePreview"
      @open="previewPin && openPinEntity(previewPin)" />
  </div>
</template>

<style scoped>
  :deep(.maplibregl-ctrl-logo) {
    opacity: 0.45;
  }

  :deep(.maplibregl-ctrl) {
    display: none !important;
  }
</style>
