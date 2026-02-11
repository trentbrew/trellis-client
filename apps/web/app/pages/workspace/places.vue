<script setup lang="ts">
  import type { PageStat } from '~/components/layout/Page.vue'

  definePageMeta({ layout: 'default' })
  useHead({ title: 'Places | Personal' })

  // ---------------------------------------------------------------------------
  // Stats (placeholder)
  // ---------------------------------------------------------------------------

  const stats = computed<PageStat[]>(() => [
    { label: 'Places', value: 0, icon: 'lucide:map-pin' },
  ])
</script>

<template>
  <Page
    variant="browse"
    title="Places"
    subtitle="Personal"
    description="Locations, addresses, and venues."
    icon="lucide:map-pin"
    icon-class="text-lime-300"
    search-placeholder="Search places..."
    :stats="stats"
    :fill-height="true">

    <!-- Empty State -->
    <div class="flex flex-col items-center justify-center h-64 text-center">
      <div class="rounded-full bg-muted/50 p-4 mb-4">
        <Icon name="lucide:map-pin" class="h-8 w-8 text-muted-foreground/50" />
      </div>
      <h3 class="text-lg font-medium text-foreground mb-1">No places yet</h3>
      <p class="text-sm text-muted-foreground max-w-sm">
        Save locations, addresses, and venues you want to remember.
      </p>
    </div>
  </Page>
</template>
