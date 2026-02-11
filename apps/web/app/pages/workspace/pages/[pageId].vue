<script setup lang="ts">
  import { useBrowse, type BrowseViewMode } from '~/composables/useBrowse'
  import type { PageConfig } from '~/composables/usePages'

  definePageMeta({ layout: 'default' })

  const route = useRoute()
  const pageId = computed(() => route.params.pageId as string)

  const { pages } = usePages()
  const { items: allItems } = useCalendarItems()

  // Resolve the page config
  const pageConfig = computed<PageConfig | null>(() => {
    return (pages.value || []).find((p) => p.id === pageId.value) || null
  })

  const pageTitle = computed(() => pageConfig.value?.title || 'Untitled Page')
  const pageIcon = computed(() => pageConfig.value?.icon || 'lucide:file-text')
  const dataSource = computed(() => pageConfig.value?.dataSource || '')

  // Filter items by data source type
  const sourceItems = computed(() => {
    const ds = dataSource.value.toLowerCase()
    if (!ds || ds === 'all') return allItems.value
    return allItems.value.filter((item) => (item.type || '').toLowerCase() === ds)
  })

  // Build table rows
  const tableRows = computed(() =>
    sourceItems.value.map((item) => ({
      id: item.id,
      title: item.title || 'Untitled',
      type: item.type,
      status: (item as any).taskStatus || (item as any).status || '',
      priority: (item as any).priority || '',
      startDate: item.startDate || '',
    })),
  )

  // Browse composable
  const defaultView = computed<BrowseViewMode>(() => {
    const proj = pageConfig.value?.defaultProjection
    if (proj && ['table', 'list', 'kanban', 'calendar', 'grid'].includes(proj)) {
      return proj as BrowseViewMode
    }
    return 'table'
  })

  const { browseState, filteredItems } = useBrowse({
    items: tableRows,
    searchFields: ['title'] as (keyof (typeof tableRows.value)[0])[],
    defaultViewMode: defaultView.value,
    sortOptions: [
      { value: 'title', label: 'Title' },
      { value: 'startDate', label: 'Date' },
    ],
  })
</script>

<template>
  <Page
    variant="canvas"
    :title="pageTitle"
    subtitle="Page"
    :icon="pageIcon"
    :fill-height="true">
    <!-- Page not found -->
    <div v-if="!pageConfig" class="flex h-full flex-col items-center justify-center">
      <Icon name="lucide:file-x" class="text-muted-foreground mb-4 h-12 w-12" />
      <h2 class="text-lg font-semibold">Page not found</h2>
      <p class="text-muted-foreground text-sm mt-1">This page may have been deleted.</p>
      <NuxtLink to="/workspace" class="mt-4">
        <UiButton variant="outline" size="sm">
          <Icon name="lucide:arrow-left" class="mr-2 h-4 w-4" />
          Back to Workspace
        </UiButton>
      </NuxtLink>
    </div>

    <!-- Page content -->
    <div v-else class="flex h-full flex-col">
      <!-- Info bar -->
      <div class="shrink-0 border-b border-border px-6 py-3">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="text-xs text-muted-foreground">
              Source: <code class="bg-muted/50 px-1.5 py-0.5 rounded text-[11px]">{{ dataSource || 'all' }}</code>
            </span>
            <span class="text-xs text-muted-foreground">
              {{ sourceItems.length }} {{ sourceItems.length === 1 ? 'item' : 'items' }}
            </span>
          </div>
        </div>
      </div>

      <!-- Search -->
      <div class="px-6 py-3 border-b border-border">
        <div class="relative max-w-md">
          <Icon name="lucide:search" class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            v-model="browseState.searchQuery.value"
            type="text"
            placeholder="Search..."
            class="w-full rounded-lg border border-border bg-transparent py-2 pl-9 pr-3 text-sm outline-none focus:ring-1 focus:ring-ring" />
        </div>
      </div>

      <!-- Table -->
      <div class="flex-1 overflow-auto">
        <div v-if="filteredItems.length === 0" class="flex flex-col items-center justify-center py-16">
          <Icon name="lucide:inbox" class="text-muted-foreground h-10 w-10 mb-3" />
          <p class="text-sm text-muted-foreground">
            {{ browseState.hasSearch.value ? 'No matching items.' : 'No items yet.' }}
          </p>
        </div>

        <table v-else class="w-full text-sm">
          <thead>
            <tr class="border-b border-border bg-muted/30">
              <th class="text-left px-6 py-2 text-xs font-medium text-muted-foreground">Title</th>
              <th class="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Type</th>
              <th class="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Status</th>
              <th class="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Priority</th>
              <th class="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Date</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in filteredItems"
              :key="row.id"
              class="border-b border-border/50 hover:bg-accent/30 cursor-pointer transition-colors">
              <td class="px-6 py-2.5 font-medium">{{ row.title }}</td>
              <td class="px-4 py-2.5">
                <span class="text-xs text-muted-foreground bg-muted/30 px-1.5 py-0.5 rounded">{{ row.type }}</span>
              </td>
              <td class="px-4 py-2.5">
                <span v-if="row.status" class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] bg-muted/50 text-muted-foreground">
                  {{ row.status }}
                </span>
              </td>
              <td class="px-4 py-2.5 text-xs text-muted-foreground">{{ row.priority }}</td>
              <td class="px-4 py-2.5 text-xs text-muted-foreground">{{ row.startDate }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </Page>
</template>
