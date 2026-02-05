<script setup lang="ts">
  import type { PageStat } from './Page.vue'

  interface PageDashboardProps {
    title?: string
    subtitle?: string
    description?: string
    icon?: string
    iconClass?: string
    showBackButton?: boolean
    /** Number of columns for stat cards grid */
    statColumns?: 2 | 3 | 4
    /** Stats to display in the header */
    stats?: PageStat[]
  }

  const props = withDefaults(defineProps<PageDashboardProps>(), {
    statColumns: 4,
  })

  const gridClass = computed(() => {
    const cols: Record<number, string> = {
      2: 'grid-cols-1 sm:grid-cols-2',
      3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
      4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
    }
    return cols[props.statColumns] || cols[4]
  })
</script>

<template>
  <Page
    :title="title"
    :subtitle="subtitle"
    :description="description"
    :icon="icon"
    :icon-class="iconClass"
    :show-back-button="showBackButton"
    :stats="stats"
    :full-width="true">
    <!-- Header stats slot -->
    <template v-if="$slots['header-stats']" #stats>
      <slot name="header-stats" />
    </template>

    <!-- Header actions -->
    <template v-if="$slots.actions" #header>
      <div class="mt-4 flex items-center gap-3">
        <div class="flex-1" />
        <slot name="actions" />
      </div>
    </template>

    <div class="space-y-6 p-6">
      <!-- Stats Grid -->
      <div v-if="$slots.stats" :class="['grid gap-4', gridClass]">
        <slot name="stats" />
      </div>

      <!-- Primary content area (charts, tables, etc.) -->
      <div v-if="$slots.default" class="grid gap-6 lg:grid-cols-2">
        <slot />
      </div>

      <!-- Full-width content section -->
      <div v-if="$slots.fullWidth">
        <slot name="fullWidth" />
      </div>
    </div>
  </Page>
</template>
