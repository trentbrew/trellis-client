<script setup lang="ts">
  import { ENTITY_NAVIGATE_KEY } from '~/composables/useDialogStack'
  import { useHashDialogRestore } from '~/composables/useHashDialogRestore'
  import { LOCATION_ENTITY_TYPES, type LocationEntityType } from '~/lib/locations/types'
  import type { Entity } from '~/types/entity'

  definePageMeta({
    title: 'Locations',
    icon: 'lucide:map-pin',
  })

  useHead({ title: 'Locations' })

  const { items } = useEntities()
  const {
    inspectorOpen,
    inspectorItem,
    openInspector,
    closeInspector,
    navigateToEntity,
  } = useLocationsMap()

  const locationItems = computed(() =>
    items.value.filter((item) =>
      LOCATION_ENTITY_TYPES.includes(item.type as LocationEntityType),
    ) as Entity[],
  )

  provide(ENTITY_NAVIGATE_KEY, navigateToEntity)

  useHashDialogRestore(locationItems, (entityId) => {
    openInspector(entityId)
  })
</script>

<template>
  <Page variant="canvas" :fill-height="true">
    <ClientOnly>
      <div class="relative flex h-full w-full min-h-0">
        <LocationsMapView class="relative min-h-0 min-w-0 flex-1" />

        <EntityDialog
          v-if="inspectorItem"
          v-model:open="inspectorOpen"
          variant="inset"
          mode="edit"
          :item="inspectorItem"
          @close="closeInspector" />
      </div>
      <template #fallback>
        <div class="flex h-full items-center justify-center text-muted-foreground">
          <Icon name="lucide:loader-circle" class="h-8 w-8 animate-spin" />
        </div>
      </template>
    </ClientOnly>
  </Page>
</template>
