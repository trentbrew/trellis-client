<script setup lang="ts">
  import {
    LOCATION_ENTITY_TYPES,
    type LocationEntityType,
    type MapPin,
  } from '~/lib/locations/types'
  import { pinColor, pinIcon } from '~/lib/locations/pin-styles'

  const {
    filteredPins,
    visiblePins,
    isResolving,
    searchQuery,
    typeFilters,
    selectedPinId,
    toggleTypeFilter,
    openPinEntity,
    createLocationEntity,
  } = useLocationsMap()

  const creating = ref(false)
  const focusedIndex = ref(0)

  const typeLabels: Record<LocationEntityType, string> = {
    event: 'Events',
    trip: 'Trips',
    appointment: 'Appointments',
  }

  const hasSearch = computed(() => !!searchQuery.value.trim())

  watch(
    () => filteredPins.value.length,
    () => {
      focusedIndex.value = 0
    },
  )

  function onKeydown(event: KeyboardEvent, index: number, pin: MapPin) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      focusedIndex.value = Math.min(filteredPins.value.length - 1, index + 1)
      focusRow(focusedIndex.value)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      focusedIndex.value = Math.max(0, index - 1)
      focusRow(focusedIndex.value)
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      openPinEntity(pin)
    } else if (event.key === 'o' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault()
      openPinEntity(pin)
    }
  }

  function focusRow(index: number) {
    nextTick(() => {
      const el = document.querySelector<HTMLElement>(`[data-locations-sidebar-item="${index}"]`)
      el?.focus()
    })
  }

  async function handleCreate(type: LocationEntityType) {
    if (creating.value) return
    creating.value = true
    try {
      await createLocationEntity(type)
    } finally {
      creating.value = false
    }
  }
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col overflow-hidden">
    <div class="shrink-0 space-y-2.5 px-2.5 pb-2 pt-1">
      <div class="flex items-center justify-between px-0.5">
        <span class="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Places
        </span>
        <span v-if="isResolving" class="text-[10px] text-muted-foreground">
          <Icon name="lucide:loader-circle" class="inline h-3 w-3 animate-spin" />
        </span>
        <span v-else class="rounded-full bg-muted/60 px-2 py-0.5 text-[10px] text-muted-foreground">
          {{ filteredPins.length }}
          <template v-if="hasSearch && filteredPins.length !== visiblePins.length">
            / {{ visiblePins.length }}
          </template>
        </span>
      </div>

      <div class="relative">
        <Icon
          name="lucide:search"
          class="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/70" />
        <input
          v-model="searchQuery"
          type="search"
          placeholder="Search places…"
          aria-label="Search places"
          class="w-full rounded-md border border-border bg-card/50 py-2 pl-8 pr-8 text-xs text-foreground outline-none placeholder:text-muted-foreground/50 focus:ring-1 focus:ring-ring/50"
          @keydown.escape="searchQuery = ''" />
        <button
          v-if="hasSearch"
          type="button"
          class="absolute right-1.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted/60 hover:text-foreground"
          aria-label="Clear search"
          @click="searchQuery = ''">
          <Icon name="lucide:x" class="h-3.5 w-3.5" />
        </button>
      </div>

      <div class="flex flex-wrap gap-1" role="group" aria-label="Filter by entity type">
        <button
          v-for="type in LOCATION_ENTITY_TYPES"
          :key="type"
          type="button"
          class="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] transition-colors"
          :class="
            typeFilters[type]
              ? 'border-primary/40 bg-primary/15 text-foreground'
              : 'border-border/60 bg-muted/20 text-muted-foreground hover:bg-muted/50'
          "
          :aria-pressed="typeFilters[type]"
          @click="toggleTypeFilter(type)">
          <span class="h-1.5 w-1.5 rounded-full" :style="{ background: pinColor(type) }" />
          {{ typeLabels[type] }}
        </button>
      </div>
    </div>

    <ul class="min-h-0 flex-1 overflow-y-auto px-2" role="listbox" aria-label="Map places">
      <li
        v-if="!filteredPins.length && !isResolving"
        class="px-2 py-8 text-center text-xs text-muted-foreground">
        {{ hasSearch ? 'No places match your search' : 'No visible places on the map' }}
      </li>
      <li
        v-for="(pin, index) in filteredPins"
        :key="pin.id"
        role="option"
        :aria-selected="selectedPinId === pin.id">
        <button
          :data-locations-sidebar-item="index"
          type="button"
          class="flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-muted/60 focus:bg-muted/60 focus:outline-none focus:ring-1 focus:ring-ring"
          :class="selectedPinId === pin.id ? 'bg-muted/50' : ''"
          :aria-label="`${pin.entityType}: ${pin.label}`"
          @click="openPinEntity(pin)"
          @keydown="onKeydown($event, index, pin)">
          <span
            class="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
            :style="{ background: pinColor(pin.entityType) + '22', color: pinColor(pin.entityType) }">
            <Icon :name="pinIcon(pin.entityType)" class="h-3.5 w-3.5" />
          </span>
          <span class="min-w-0">
            <span class="block truncate text-sm font-medium text-foreground">{{ pin.label }}</span>
            <span class="block truncate text-[10px] capitalize text-muted-foreground">
              {{ pin.entityType }}
              <template v-if="pin.placeName"> · {{ pin.placeName }}</template>
            </span>
          </span>
        </button>
      </li>
    </ul>

    <div class="shrink-0 border-t border-border/60 bg-card/80 p-2.5 backdrop-blur-sm">
      <UiDropdownMenu>
        <UiDropdownMenuTrigger as-child>
          <UiButton class="w-full" size="sm" :disabled="creating">
            <Icon name="lucide:plus" class="mr-1.5 h-3.5 w-3.5" />
            Add place
          </UiButton>
        </UiDropdownMenuTrigger>
        <UiDropdownMenuContent align="center" class="w-48">
          <UiDropdownMenuItem
            v-for="type in LOCATION_ENTITY_TYPES"
            :key="type"
            @click="handleCreate(type)">
            <span
              class="mr-2 flex h-5 w-5 items-center justify-center rounded-md"
              :style="{ background: pinColor(type) + '22', color: pinColor(type) }">
              <Icon :name="pinIcon(type)" class="h-3 w-3" />
            </span>
            New {{ type === 'event' ? 'event' : type === 'trip' ? 'trip' : 'appointment' }}
          </UiDropdownMenuItem>
        </UiDropdownMenuContent>
      </UiDropdownMenu>
    </div>
  </div>
</template>
