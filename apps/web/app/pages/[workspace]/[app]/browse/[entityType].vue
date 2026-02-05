<script setup lang="ts">
  import type { PageStat } from '~/components/layout/Page.vue'
  import { useBrowse } from '~/composables/useBrowse'
  import { buildPageConfigFromSlug, type DerivedPageConfig } from '~/lib/appConfig'
  import { buildViewModeOptions, type ViewModeOption } from '~/lib/projections'

  const route = useRoute()
  const entityType = computed(() => route.params.entityType as string)

  const pageConfig = computed<DerivedPageConfig | null>(() => {
    return buildPageConfigFromSlug(entityType.value)
  })

  const items = ref<any[]>([])

  const { browseState, viewMode } = useBrowse({
    items,
    searchFields: ['title', 'name', 'description'] as any,
    defaultViewMode: 'table',
    sortOptions: [
      { value: 'name', label: 'Name' },
      { value: 'createdAt', label: 'Created' },
      { value: 'updatedAt', label: 'Updated' },
    ],
  })

  const viewModeOptions = computed<ViewModeOption[]>(() => {
    if (!pageConfig.value?.schema) return []
    return buildViewModeOptions(pageConfig.value.schema, ['grid', 'list', 'table', 'calendar', 'kanban'], {
      includeDisabled: true,
    })
  })

  const stats = computed<PageStat[]>(() => [
    { label: 'Total Items', value: items.value.length, icon: 'lucide:database' },
  ])
</script>

<template>
  <Page
    v-if="pageConfig"
    variant="browse"
    :title="pageConfig.title"
    :subtitle="pageConfig.subtitle"
    :description="pageConfig.description"
    :icon="pageConfig.icon || 'lucide:database'"
    :icon-class="pageConfig.iconClass"
    search-placeholder="Search..."
    :stats="stats"
    :show-view-switcher="true"
    :fill-height="true"
    :browse="browseState"
    :view-mode-options="viewModeOptions">
    <template #content>
      <div v-if="viewMode === 'table'" class="h-full">
        <TableView
          v-if="pageConfig.schema"
          :collection-id="pageConfig.entityTypeId || entityType"
          :schema="pageConfig.schema" />
        <div v-else class="flex h-full items-center justify-center text-muted-foreground">
          <p>No schema available for this entity type.</p>
        </div>
      </div>

      <div v-else-if="viewMode === 'kanban'" class="h-full">
        <BoardView
          v-if="pageConfig.schema"
          :collection-id="pageConfig.entityTypeId || entityType"
          :schema="pageConfig.schema" />
        <div v-else class="flex h-full items-center justify-center text-muted-foreground">
          <p>Kanban view requires a schema with select fields.</p>
        </div>
      </div>

      <div v-else-if="viewMode === 'calendar'" class="h-full">
        <CalendarView
          v-if="pageConfig.schema"
          :collection-id="pageConfig.entityTypeId || entityType"
          :schema="pageConfig.schema" />
        <div v-else class="flex h-full items-center justify-center text-muted-foreground">
          <p>Calendar view requires a schema with date fields.</p>
        </div>
      </div>

      <div v-else-if="viewMode === 'grid'" class="p-4">
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <UiCard v-for="item in items" :key="item.id" class="cursor-pointer transition-colors hover:bg-muted">
            <UiCardContent class="p-4">
              <div class="flex items-start gap-3">
                <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon :name="pageConfig.icon || 'lucide:file'" class="h-5 w-5" />
                </div>
                <div class="min-w-0 flex-1">
                  <p class="truncate font-medium">{{ item.name || item.title || 'Untitled' }}</p>
                  <p class="truncate text-sm text-muted-foreground">
                    {{ item.description || 'No description' }}
                  </p>
                </div>
              </div>
            </UiCardContent>
          </UiCard>
        </div>
        <div v-if="!items.length" class="flex h-64 items-center justify-center text-muted-foreground">
          <p>No items found.</p>
        </div>
      </div>

      <div v-else-if="viewMode === 'list'" class="divide-y divide-border">
        <div
          v-for="item in items"
          :key="item.id"
          class="flex cursor-pointer items-center gap-4 p-4 transition-colors hover:bg-muted">
          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon :name="pageConfig.icon || 'lucide:file'" class="h-5 w-5" />
          </div>
          <div class="min-w-0 flex-1">
            <p class="font-medium">{{ item.name || item.title || 'Untitled' }}</p>
            <p class="truncate text-sm text-muted-foreground">
              {{ item.description || 'No description' }}
            </p>
          </div>
        </div>
        <div v-if="!items.length" class="flex h-64 items-center justify-center text-muted-foreground">
          <p>No items found.</p>
        </div>
      </div>
    </template>
  </Page>

  <div v-else class="flex h-full items-center justify-center">
    <UiCard class="max-w-md">
      <UiCardContent class="p-6 text-center">
        <Icon name="lucide:alert-circle" class="mx-auto h-12 w-12 text-muted-foreground/50" />
        <h2 class="mt-4 text-lg font-semibold">Entity Type Not Found</h2>
        <p class="mt-2 text-sm text-muted-foreground">
          The entity type "{{ entityType }}" is not defined in the application configuration.
        </p>
        <UiButton class="mt-4" variant="outline" @click="$router.back()">
          <Icon name="lucide:arrow-left" class="mr-2 h-4 w-4" />
          Go Back
        </UiButton>
      </UiCardContent>
    </UiCard>
  </div>
</template>
