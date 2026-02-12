<script setup lang="ts">
  import type { PageStat } from '~/components/layout/Page.vue'
  import type { BrowseViewMode } from '~/composables/useBrowse'
  import { useBrowsePage } from '~/composables/useBrowsePage'

  definePageMeta({ layout: 'default' })
  useHead({ title: 'Projects | Personal' })

  // ---------------------------------------------------------------------------
  // Browse page (data + browse + dialog + CRUD)
  // ---------------------------------------------------------------------------

  const {
    items, filteredItems, browseState, viewMode,
    createOpen, viewOpen, viewingItem, openDetail,
    canPrev, canNext, navPrev, navNext,
    handleCreate, handleUpdate, handleDelete,
  } = useBrowsePage({
    entityType: 'project',
    searchFields: ['title', 'description'],
    defaultViewMode: 'grid',
    sortOptions: [
      { value: 'startDate', label: 'Start Date' },
      { value: 'title', label: 'Name' },
    ],
    filters: [
      {
        id: 'category', label: 'Category', icon: 'lucide:tag',
        options: [
          { value: 'all', label: 'All' },
          { value: 'work', label: 'Work' },
          { value: 'personal', label: 'Personal' },
          { value: 'travel', label: 'Travel' },
        ],
        fn: (item: any, val: string) => item.category === val,
      },
    ],
  })

  // ---------------------------------------------------------------------------
  // Stats (type-specific — stays in page)
  // ---------------------------------------------------------------------------

  const stats = computed<PageStat[]>(() => {
    const all = items.value as any[]
    return [
      { label: 'Projects', value: all.length, icon: 'lucide:folder-kanban' },
      { label: 'Active', value: all.filter((p) => p.containerStatus === 'active').length, icon: 'lucide:play', color: 'text-green-500' },
      { label: 'Work', value: all.filter((p) => p.category === 'work').length, icon: 'lucide:briefcase', color: 'text-blue-500' },
      { label: 'Personal', value: all.filter((p) => p.category === 'personal' || p.category === 'travel').length, icon: 'lucide:user', color: 'text-emerald-500' },
    ]
  })

  // ---------------------------------------------------------------------------
  // UI helpers (type-specific — stays in page)
  // ---------------------------------------------------------------------------

  const categoryColors: Record<string, string> = {
    work: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    personal: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    travel: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  }

  const priorityColors: Record<string, string> = {
    critical: 'text-red-500',
    high: 'text-orange-500',
    medium: 'text-yellow-500',
    low: 'text-muted-foreground',
  }

  function progressPercent(p: any): number {
    return Math.round((p.progress || 0) * 100)
  }

  const formatDate = (d: string) => {
    try { return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) }
    catch { return d }
  }

  const taskOwners = [{ id: 'you', name: 'You' }, { id: 'alex', name: 'Alex' }, { id: 'maya', name: 'Maya' }]
</script>

<template>
  <Page
    variant="browse"
    title="Projects"
    subtitle="Personal"
    description="Your projects and initiatives."
    icon="lucide:folder-kanban"
    icon-class="text-orange-300"
    search-placeholder="Search projects..."
    :stats="stats"
    :show-view-switcher="true"
    :fill-height="true"
    :browse="browseState">

    <!-- View Switcher -->
    <template #viewSwitcher>
      <div class="flex items-center gap-1">
        <button
          v-for="mode in (['grid', 'list'] as BrowseViewMode[])"
          :key="mode"
          type="button"
          class="flex h-8 items-center gap-2 rounded-md px-3 text-sm font-medium transition-colors"
          :class="viewMode === mode ? 'bg-foreground/10 text-foreground' : 'text-muted-foreground hover:bg-foreground/5 hover:text-foreground'"
          @click="browseState.setViewMode(mode)">
          <Icon :name="mode === 'grid' ? 'lucide:grid-3x3' : 'lucide:list'" class="h-4 w-4" />
        </button>
      </div>
    </template>

    <!-- Toolbar Actions -->
    <template #toolbarActions>
      <UiButton @click="createOpen = true">
        <Icon name="lucide:plus" class="mr-2 h-4 w-4" />
        New Project
      </UiButton>
    </template>

    <!-- ================= GRID VIEW ================= -->
    <div v-if="viewMode === 'grid'" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <UiCard
        v-for="item in filteredItems"
        :key="item.id"
        class="relative overflow-hidden hover:bg-muted transition-colors cursor-pointer group"
        @click="openDetail(item)">
        <UiCardHeader class="pb-2">
          <div class="flex items-start justify-between gap-2">
            <div class="flex items-center gap-2 min-w-0">
              <Icon name="lucide:folder-kanban" class="h-4 w-4 text-orange-400 shrink-0" />
              <span :class="['rounded-full px-1.5 py-0.5 text-[10px] font-medium shrink-0', categoryColors[(item as any).category] || 'bg-muted text-muted-foreground']">
                {{ (item as any).category }}
              </span>
            </div>
            <span v-if="(item as any).priority" :class="['text-xs font-medium', priorityColors[(item as any).priority] || 'text-muted-foreground']">
              {{ (item as any).priority }}
            </span>
          </div>
          <UiCardTitle class="text-base mt-2 line-clamp-1">{{ item.title }}</UiCardTitle>
        </UiCardHeader>
        <UiCardContent class="pt-0 space-y-3">
          <p v-if="item.description" class="text-sm text-muted-foreground line-clamp-2">{{ item.description }}</p>

          <!-- Progress bar -->
          <div class="space-y-1">
            <div class="flex items-center justify-between text-xs">
              <span class="text-muted-foreground">Progress</span>
              <span class="font-medium">{{ progressPercent(item) }}%</span>
            </div>
            <div class="h-1.5 w-full rounded-full bg-muted overflow-hidden">
              <div
                class="h-full rounded-full bg-orange-400 transition-all"
                :style="{ width: `${progressPercent(item)}%` }" />
            </div>
          </div>

          <!-- Date range & tags -->
          <div class="flex items-center justify-between text-xs text-muted-foreground border-t border-border pt-2">
            <span v-if="(item as any).startDate">
              {{ formatDate((item as any).startDate) }}
              <template v-if="(item as any).endDate"> → {{ formatDate((item as any).endDate) }}</template>
            </span>
            <div class="flex items-center gap-1">
              <span v-for="tag in (item.tags || []).slice(0, 2)" :key="tag" class="bg-muted px-1.5 py-0.5 rounded text-[10px]">#{{ tag }}</span>
            </div>
          </div>
        </UiCardContent>
      </UiCard>
      <div v-if="!filteredItems.length" class="col-span-full flex flex-col items-center justify-center py-20 text-center">
        <Icon name="lucide:folder-kanban" class="h-12 w-12 text-muted-foreground/30 mb-4" />
        <h3 class="text-lg font-medium text-foreground mb-1">No projects yet</h3>
        <p class="text-sm text-muted-foreground max-w-sm">Create a project to organize related tasks, notes, and files together.</p>
      </div>
    </div>

    <!-- ================= LIST VIEW ================= -->
    <div v-if="viewMode === 'list'" class="space-y-2">
      <div
        v-for="item in filteredItems"
        :key="item.id"
        class="flex items-center gap-4 rounded-lg border border-border bg-card p-4 hover:bg-muted transition-colors cursor-pointer"
        @click="openDetail(item)">
        <Icon name="lucide:folder-kanban" class="h-5 w-5 text-orange-400 shrink-0" />
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-0.5">
            <p class="font-medium truncate">{{ item.title }}</p>
            <span :class="['rounded-full px-1.5 py-0.5 text-[10px] font-medium shrink-0', categoryColors[(item as any).category] || 'bg-muted text-muted-foreground']">
              {{ (item as any).category }}
            </span>
            <span v-if="(item as any).priority" :class="['text-xs font-medium shrink-0', priorityColors[(item as any).priority] || 'text-muted-foreground']">
              {{ (item as any).priority }}
            </span>
          </div>
          <p v-if="item.description" class="text-sm text-muted-foreground truncate">{{ item.description }}</p>
        </div>
        <div class="shrink-0 flex items-center gap-3">
          <!-- Progress mini -->
          <div class="flex items-center gap-2 w-24">
            <div class="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
              <div class="h-full rounded-full bg-orange-400" :style="{ width: `${progressPercent(item)}%` }" />
            </div>
            <span class="text-xs text-muted-foreground w-8 text-right">{{ progressPercent(item) }}%</span>
          </div>
          <span v-if="(item as any).startDate" class="text-xs text-muted-foreground hidden md:block">
            {{ formatDate((item as any).startDate) }}
          </span>
        </div>
      </div>
      <div v-if="!filteredItems.length" class="flex flex-col items-center justify-center py-20 text-center">
        <Icon name="lucide:folder-kanban" class="h-12 w-12 text-muted-foreground/30 mb-4" />
        <h3 class="text-lg font-medium text-foreground mb-1">No projects yet</h3>
        <p class="text-sm text-muted-foreground max-w-sm">Create a project to organize related tasks, notes, and files together.</p>
      </div>
    </div>

    <!-- Results count -->
    <div class="text-xs text-muted-foreground mt-4 pt-4 border-t border-border pb-10">
      Showing {{ filteredItems.length }} {{ filteredItems.length === 1 ? 'project' : 'projects' }}
    </div>

    <!-- View/Edit Dialog -->
    <ProjectDialog
      v-model:open="viewOpen"
      mode="edit"
      :item="viewingItem"
      :can-navigate-prev="canPrev"
      :can-navigate-next="canNext"
      :owners="taskOwners"
      @navigate-prev="navPrev"
      @navigate-next="navNext"
      @save="handleUpdate"
      @delete="handleDelete"
      @close="viewOpen = false" />

    <!-- Create Dialog -->
    <ProjectDialog
      v-model:open="createOpen"
      mode="create"
      :item="null"
      :owners="taskOwners"
      @save="handleCreate"
      @close="createOpen = false" />
  </Page>
</template>
