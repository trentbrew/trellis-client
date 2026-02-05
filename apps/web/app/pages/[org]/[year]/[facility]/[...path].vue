<script setup lang="ts">
  /**
   * Universal Graph-Driven Page Renderer
   *
   * This catch-all route renders facility pages dynamically based on:
   * - Route configuration from app-config.jsonld
   * - Entity type and schema definitions
   * - Projection/view mode capabilities
   *
   * Falls back to placeholder only for truly undefined routes.
   */
  import { getRouteMeta } from '~/config/routes'
  import { useGraphDrivenPage } from '~/composables/useGraphDrivenPage'
  import CalendarView from '~/components/views/CalendarView.vue'

  definePageMeta({
    layout: 'default',
  })

  const route = useRoute()
  const { selectedYear } = useYear()
  const { currentOrganization } = useOrganizations()
  const { currentFacility } = useFacilities()

  // Extract the path after facility
  const facilityPath = computed(() => {
    const pathSegments = (route.params.path as string[]) || []
    return pathSegments.length ? '/' + pathSegments.join('/') : ''
  })

  // Build the logical route path for metadata lookup
  const logicalPath = computed(() => {
    return `/facility${facilityPath.value}`
  })

  // Legacy route meta lookup
  const routeMeta = computed(() => getRouteMeta(logicalPath.value))

  // Graph-driven page configuration and data
  const {
    pageConfig,
    isConfigured,
    items,
    filteredItems,
    loading,
    browseState,
    viewMode,
    viewModeOptions,
    stats,
    openDetail,
    createItem,
  } = useGraphDrivenPage({
    routePath: logicalPath.value,
    facilityId: currentFacility.value?.id,
  })

  // Selected items for bulk actions
  const selectedItems = ref<string[]>([])

  // Status colors for task-like entities
  const statusColors: Record<string, string> = {
    overdue: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    'due-soon': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    'on-track': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    completed: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  }

  const priorityIcons: Record<string, string> = {
    high: 'lucide:alert-circle',
    medium: 'lucide:minus-circle',
    low: 'lucide:arrow-down-circle',
  }

  const priorityColors: Record<string, string> = {
    high: 'text-rose-500',
    medium: 'text-amber-500',
    low: 'text-blue-500',
  }

  // Kanban columns for board view
  const kanbanColumns = computed(() => [
    { id: 'overdue', label: 'Overdue', color: 'border-red-500', items: filteredItems.value.filter((t: any) => t.status === 'overdue') },
    { id: 'due-soon', label: 'Due Soon', color: 'border-amber-500', items: filteredItems.value.filter((t: any) => t.status === 'due-soon') },
    { id: 'on-track', label: 'On Track', color: 'border-emerald-500', items: filteredItems.value.filter((t: any) => t.status === 'on-track') },
    { id: 'completed', label: 'Completed', color: 'border-gray-400', items: filteredItems.value.filter((t: any) => t.status === 'completed') },
  ])

  // Calendar data transformation
  const calendarData = computed(() => {
    const nodes = items.value.map((item: any) => ({
      '@id': `item:${item.id}`,
      '@type': pageConfig.value?.entityTypeId || 'Item',
      'trellis:title': item.title || item.name,
      'user:dueDate': item.dueDate,
      'user:status': item.status,
      'user:assignee': item.assignee,
      'user:priority': item.priority,
    }))
    return JSON.stringify({ '@graph': nodes })
  })

  useHead(() => {
    const title = pageConfig.value?.title || routeMeta.value?.title || currentFacility.value?.name || 'Facility'
    return { title: `${title} | ${currentOrganization.value?.name || 'Platform Sandbox'}` }
  })
</script>

<template>
  <!-- Graph-Driven Page: Configured route with entity data -->
  <Page
    v-if="isConfigured"
    variant="browse"
    :title="pageConfig?.title || routeMeta?.title || facilityPath || 'Browse'"
    :subtitle="pageConfig?.subtitle || routeMeta?.subtitle || currentFacility?.name"
    :description="pageConfig?.description || routeMeta?.description || 'Facility data.'"
    :icon="pageConfig?.icon || 'lucide:database'"
    :icon-class="pageConfig?.iconClass || 'text-sky-300'"
    search-placeholder="Search..."
    :stats="stats"
    :show-view-switcher="true"
    :fill-height="true"
    :browse="browseState"
    :view-mode-options="viewModeOptions">
    <!-- Actions -->
    <template #toolbarActions>
      <div v-if="selectedItems.length > 0" class="flex items-center gap-2 mr-2">
        <span class="text-sm text-muted-foreground">{{ selectedItems.length }} selected</span>
        <UiButton variant="outline" size="sm">
          <Icon name="lucide:check-check" class="mr-2 h-4 w-4" />
          Mark Complete
        </UiButton>
      </div>
      <UiButton @click="createItem">
        <Icon name="lucide:plus" class="mr-2 h-4 w-4" />
        Add {{ pageConfig?.title?.replace(/s$/, '') || 'Item' }}
      </UiButton>
    </template>

    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center h-64">
      <Icon name="lucide:loader-2" class="h-8 w-8 animate-spin text-muted-foreground" />
    </div>

    <!-- Table View -->
    <div v-else-if="viewMode === 'table'" class="overflow-hidden rounded-xl border border-border bg-card">
      <UiTable>
        <UiTableHeader>
          <UiTableRow>
            <UiTableHead class="w-12">
              <UiCheckbox
                :checked="selectedItems.length === filteredItems.length && filteredItems.length > 0"
                @update:checked="selectedItems = $event ? filteredItems.map((t: any) => t.id) : []" />
            </UiTableHead>
            <UiTableHead>Name</UiTableHead>
            <UiTableHead>Status</UiTableHead>
            <UiTableHead>Priority</UiTableHead>
            <UiTableHead>Due Date</UiTableHead>
            <UiTableHead>Assignee</UiTableHead>
            <UiTableHead class="w-12"></UiTableHead>
          </UiTableRow>
        </UiTableHeader>
        <UiTableBody>
          <UiTableRow
            v-for="item in filteredItems"
            :key="item.id"
            class="cursor-pointer"
            @click="openDetail(item)">
            <UiTableCell @click.stop>
              <UiCheckbox
                :checked="selectedItems.includes(item.id)"
                @update:checked="selectedItems = $event ? [...selectedItems, item.id] : selectedItems.filter((id) => id !== item.id)" />
            </UiTableCell>
            <UiTableCell>
              <div class="flex items-center gap-2">
                <Icon
                  :name="priorityIcons[item.priority] || 'lucide:circle'"
                  :class="['h-4 w-4', priorityColors[item.priority]]" />
                <span class="font-medium">{{ item.title || item.name }}</span>
              </div>
            </UiTableCell>
            <UiTableCell>
              <span v-if="item.status" :class="['rounded-full px-2 py-1 text-xs font-medium', statusColors[item.status] || 'bg-gray-100 text-gray-600']">
                {{ item.status.replace('-', ' ') }}
              </span>
            </UiTableCell>
            <UiTableCell>
              <div v-if="item.priority" class="flex items-center gap-1.5">
                <Icon :name="priorityIcons[item.priority] || 'lucide:circle'" :class="['h-4 w-4', priorityColors[item.priority]]" />
                <span class="text-sm capitalize">{{ item.priority }}</span>
              </div>
            </UiTableCell>
            <UiTableCell class="text-muted-foreground">{{ item.dueDate || '-' }}</UiTableCell>
            <UiTableCell>{{ item.assignee || '-' }}</UiTableCell>
            <UiTableCell>
              <UiButton variant="ghost" size="icon">
                <Icon name="lucide:more-horizontal" class="h-4 w-4" />
              </UiButton>
            </UiTableCell>
          </UiTableRow>
        </UiTableBody>
      </UiTable>
    </div>

    <!-- List View -->
    <div v-else-if="viewMode === 'list'" class="space-y-2">
      <div
        v-for="item in filteredItems"
        :key="item.id"
        class="flex items-center gap-4 rounded-lg border border-border bg-card p-4 hover:bg-muted transition-colors cursor-pointer"
        @click="openDetail(item)">
        <UiCheckbox
          :checked="selectedItems.includes(item.id)"
          @update:checked="selectedItems = $event ? [...selectedItems, item.id] : selectedItems.filter((id) => id !== item.id)"
          @click.stop />
        <Icon :name="priorityIcons[item.priority] || 'lucide:circle'" :class="['h-5 w-5 shrink-0', priorityColors[item.priority]]" />
        <div class="flex-1 min-w-0">
          <p class="font-medium truncate">{{ item.title || item.name }}</p>
          <p class="text-sm text-muted-foreground">{{ item.assignee || 'Unassigned' }} · {{ item.dueDate || 'No due date' }}</p>
        </div>
        <span v-if="item.status" :class="['rounded-full px-2 py-1 text-xs font-medium shrink-0', statusColors[item.status] || 'bg-gray-100']">
          {{ item.status.replace('-', ' ') }}
        </span>
      </div>
      <div v-if="!filteredItems.length" class="flex h-64 items-center justify-center text-muted-foreground">
        No items found.
      </div>
    </div>

    <!-- Grid View -->
    <div v-else-if="viewMode === 'grid'" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <UiCard
        v-for="item in filteredItems"
        :key="item.id"
        class="relative overflow-hidden hover:bg-muted transition-colors cursor-pointer"
        @click="openDetail(item)">
        <div v-if="item.status" class="absolute top-0 left-0 w-1 h-full" :class="(statusColors[item.status] || '').split(' ')[0]" />
        <UiCardHeader class="pb-2">
          <div class="flex items-start justify-between">
            <div class="flex items-center gap-2">
              <UiCheckbox
                :checked="selectedItems.includes(item.id)"
                @update:checked="selectedItems = $event ? [...selectedItems, item.id] : selectedItems.filter((id) => id !== item.id)"
                @click.stop />
              <Icon :name="priorityIcons[item.priority] || 'lucide:circle'" :class="['h-4 w-4', priorityColors[item.priority] || '']" />
            </div>
            <span v-if="item.status" :class="['rounded-full px-2 py-0.5 text-xs font-medium', statusColors[item.status]]">
              {{ item.status.replace('-', ' ') }}
            </span>
          </div>
          <UiCardTitle class="text-base mt-2">{{ item.title || item.name }}</UiCardTitle>
        </UiCardHeader>
        <UiCardContent class="pt-0">
          <div class="flex items-center justify-between text-sm text-muted-foreground">
            <span>{{ item.assignee || 'Unassigned' }}</span>
            <span>{{ item.dueDate || '-' }}</span>
          </div>
        </UiCardContent>
      </UiCard>
      <div v-if="!filteredItems.length" class="col-span-full flex h-64 items-center justify-center text-muted-foreground">
        No items found.
      </div>
    </div>

    <!-- Kanban View -->
    <div v-else-if="viewMode === 'kanban'" class="flex gap-4 overflow-x-auto pb-4">
      <div
        v-for="column in kanbanColumns"
        :key="column.id"
        class="flex-shrink-0 w-72 rounded-lg border-t-4 bg-muted/30"
        :class="column.color">
        <div class="p-3 border-b border-border">
          <div class="flex items-center justify-between">
            <h3 class="font-semibold text-sm">{{ column.label }}</h3>
            <span class="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{{ column.items.length }}</span>
          </div>
        </div>
        <div class="p-2 space-y-2 min-h-[200px]">
          <div
            v-for="item in column.items"
            :key="item.id"
            class="rounded-lg border border-border bg-card p-3 hover:bg-muted transition-colors cursor-pointer"
            @click="openDetail(item)">
            <div class="flex items-start gap-2 mb-2">
              <Icon :name="priorityIcons[item.priority] || 'lucide:circle'" :class="['h-4 w-4 mt-0.5 shrink-0', priorityColors[item.priority] || '']" />
              <p class="text-sm font-medium leading-tight">{{ item.title || item.name }}</p>
            </div>
            <div class="flex items-center justify-between text-xs text-muted-foreground">
              <span>{{ item.assignee || 'Unassigned' }}</span>
              <span>{{ item.dueDate || '-' }}</span>
            </div>
          </div>
          <div v-if="column.items.length === 0" class="flex items-center justify-center h-20 text-sm text-muted-foreground">
            No items
          </div>
        </div>
      </div>
    </div>

    <!-- Calendar View -->
    <div v-else-if="viewMode === 'calendar'" class="h-fit min-h-[500px]">
      <CalendarView
        v-if="pageConfig?.schema"
        :collection-id="pageConfig.entityTypeId || 'items'"
        :model-value="calendarData"
        :schema="pageConfig.schema" />
      <div v-else class="flex h-64 items-center justify-center text-muted-foreground">
        Calendar view requires a schema with date fields.
      </div>
    </div>

    <!-- Results count -->
    <div class="text-xs text-muted-foreground mt-4 pt-4 border-t border-border pb-10">
      Showing {{ filteredItems.length }} of {{ items.length }} items
    </div>
  </Page>

  <!-- Fallback: Route not configured in graph -->
  <Page
    v-else
    :subtitle="routeMeta?.subtitle || currentFacility?.name || 'Facility'"
    :title="routeMeta?.title || facilityPath || 'Page Not Found'"
    :description="routeMeta?.description || 'This route is not yet configured.'"
    icon="lucide:construction"
    icon-class="text-amber-300">
    <div class="rounded-xl border border-dashed border-border bg-muted/30 p-12">
      <div class="flex items-start gap-4">
        <div class="mt-0.5">
          <Icon name="lucide:construction" class="h-10 w-10 text-muted-foreground opacity-70" />
        </div>
        <div class="space-y-2">
          <div class="text-sm text-muted-foreground">
            Organization:
            <span class="font-medium text-foreground">{{ currentOrganization?.name }}</span>
          </div>
          <div class="text-sm text-muted-foreground">
            Year:
            <span class="font-medium text-foreground">{{ selectedYear }}</span>
          </div>
          <div class="text-sm text-muted-foreground">
            Facility:
            <span class="font-medium text-foreground">{{ currentFacility?.name }}</span>
          </div>
          <div class="text-base font-medium">{{ logicalPath }}</div>
          <div class="text-sm text-muted-foreground">
            This route is not configured in the application graph. To add it:
          </div>
          <ol class="text-sm text-muted-foreground list-decimal list-inside space-y-1 pl-2">
            <li>Add a route definition to <code class="rounded bg-foreground/5 px-1 py-0.5">app-config.jsonld</code></li>
            <li>Or create a page at <code class="rounded bg-foreground/5 px-1 py-0.5">app/pages{{ logicalPath }}/index.vue</code></li>
          </ol>
          <div class="pt-4">
            <UiButton variant="outline" as-child>
              <NuxtLink to="/personal/tasks">Go to My Tasks</NuxtLink>
            </UiButton>
          </div>
        </div>
      </div>
    </div>
  </Page>
</template>
