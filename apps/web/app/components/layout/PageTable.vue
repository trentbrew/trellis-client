<script setup lang="ts">
  import type { PageStat } from './Page.vue'

  interface PageTableProps {
    title?: string
    subtitle?: string
    description?: string
    icon?: string
    iconClass?: string
    showBackButton?: boolean
    /** Show search input in header */
    showSearch?: boolean
    /** Placeholder for search input */
    searchPlaceholder?: string
    /** v-model for search */
    search?: string
    /** Number of selected items (for bulk actions) */
    selectedCount?: number
    /** Stats to display in the header */
    stats?: PageStat[]
  }

  const props = withDefaults(defineProps<PageTableProps>(), {
    showSearch: true,
    searchPlaceholder: 'Search...',
    search: '',
    selectedCount: 0,
  })

  const emit = defineEmits<{
    'update:search': [value: string]
  }>()

  const searchModel = computed({
    get: () => props.search,
    set: (value) => emit('update:search', value),
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
    :full-width="true"
    :fill-height="true">
    <!-- Stats slot -->
    <template v-if="$slots.stats" #stats>
      <slot name="stats" />
    </template>

    <!-- Header actions slot -->
    <template #header>
      <div class="mt-4 flex flex-wrap items-center gap-3">
        <!-- Search -->
        <div v-if="showSearch" class="relative w-full max-w-xs">
          <Icon name="lucide:search" class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <UiInput v-model="searchModel" type="search" :placeholder="searchPlaceholder" class="pl-9" />
        </div>

        <!-- Filters slot -->
        <slot name="filters" />

        <!-- Spacer -->
        <div class="flex-1" />

        <!-- Bulk actions (when items selected) -->
        <div v-if="selectedCount > 0" class="flex items-center gap-2">
          <span class="text-sm text-muted-foreground">{{ selectedCount }} selected</span>
          <slot name="bulk-actions" />
        </div>

        <!-- Primary actions -->
        <slot name="actions" />
      </div>
    </template>

    <!-- Main content: Table area -->
    <div class="flex h-full flex-col">
      <!-- Table container with scroll -->
      <div class="min-h-0 flex-1 overflow-auto">
        <slot />
      </div>

      <!-- Pagination footer -->
      <div v-if="$slots.pagination" class="shrink-0 border-t border-border bg-card/50 px-4 py-3">
        <slot name="pagination" />
      </div>
    </div>
  </Page>
</template>
