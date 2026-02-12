<script setup lang="ts">
  import type { PageStat } from '~/components/layout/Page.vue'
  import type { BrowseViewMode } from '~/composables/useBrowse'
  import { useBrowsePage } from '~/composables/useBrowsePage'
  import CalendarItemDialog from '~/components/dialogs/CalendarItemDialog.vue'
  import type { NoteItem } from '~/types/calendarItem'

  definePageMeta({ layout: 'default' })
  useHead({ title: 'Notes | Personal' })

  // ---------------------------------------------------------------------------
  // Browse page (data + browse + dialog + CRUD)
  // ---------------------------------------------------------------------------

  const {
    items, filteredItems, browseState, viewMode,
    createOpen, viewOpen, viewingItem, openDetail,
    canPrev, canNext, navPrev, navNext,
    handleCreate, handleUpdate, handleDelete,
  } = useBrowsePage({
    entityType: 'note',
    searchFields: ['title', 'content', 'description'],
    defaultViewMode: 'grid',
    sortOptions: [
      { value: 'startDate', label: 'Date' },
      { value: 'title', label: 'Title' },
    ],
    filters: [
      {
        id: 'category', label: 'Category', icon: 'lucide:tag',
        options: [
          { value: 'all', label: 'All' },
          { value: 'work', label: 'Work' },
          { value: 'personal', label: 'Personal' },
        ],
        fn: (item: any, val: string) => item.category === val,
      },
      {
        id: 'pinned', label: 'Pinned', icon: 'lucide:pin',
        options: [
          { value: 'all', label: 'All' },
          { value: 'true', label: 'Pinned Only' },
        ],
        fn: (item: any, val: string) => val === 'true' ? item.pinned === true : true,
      },
    ],
  })

  const viewModeIcons: Record<string, string> = {
    grid: 'lucide:grid-3x3',
    list: 'lucide:list',
  }

  // ---------------------------------------------------------------------------
  // Stats (type-specific — stays in page)
  // ---------------------------------------------------------------------------

  const stats = computed<PageStat[]>(() => [
    { label: 'Notes', value: items.value.length, icon: 'lucide:sticky-note' },
    { label: 'Pinned', value: (items.value as NoteItem[]).filter((n) => n.pinned).length, icon: 'lucide:pin', color: 'text-amber-500' },
    { label: 'Work', value: (items.value as NoteItem[]).filter((n) => n.category === 'work').length, icon: 'lucide:briefcase', color: 'text-blue-500' },
    { label: 'Personal', value: (items.value as NoteItem[]).filter((n) => n.category === 'personal').length, icon: 'lucide:user', color: 'text-emerald-500' },
  ])

  // ---------------------------------------------------------------------------
  // UI helpers (type-specific — stays in page)
  // ---------------------------------------------------------------------------

  const categoryColors: Record<string, string> = {
    work: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    personal: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    general: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  }

  const formatDate = (d: string) => {
    try { return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) }
    catch { return d }
  }

  const taskOwners = [{ id: 'you', name: 'You' }, { id: 'alex', name: 'Alex' }, { id: 'maya', name: 'Maya' }]
  const taskFolders = ['Work', 'Personal', 'Journal', 'Research']
</script>

<template>
  <Page
    variant="browse"
    title="Notes"
    subtitle="Personal"
    description="Ideas, journal entries, and bookmarks."
    icon="lucide:sticky-note"
    icon-class="text-purple-300"
    search-placeholder="Search notes..."
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
          <Icon :name="viewModeIcons[mode] || 'lucide:list'" class="h-4 w-4" />
          {{ mode.charAt(0).toUpperCase() + mode.slice(1) }}
        </button>
      </div>
    </template>

    <!-- Toolbar Actions -->
    <template #toolbarActions>
      <UiButton @click="createOpen = true">
        <Icon name="lucide:plus" class="mr-2 h-4 w-4" />
        New Note
      </UiButton>
    </template>

    <!-- ================= GRID VIEW ================= -->
    <div v-if="viewMode === 'grid'" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <UiCard
        v-for="item in (filteredItems as NoteItem[])"
        :key="item.id"
        class="relative overflow-hidden hover:bg-muted transition-colors cursor-pointer group"
        @click="openDetail(item)">
        <div v-if="item.pinned" class="absolute top-0 right-0 p-2">
          <Icon name="lucide:pin" class="h-3.5 w-3.5 text-amber-500" />
        </div>
        <UiCardHeader class="pb-2">
          <div class="flex items-start justify-between">
            <Icon name="lucide:sticky-note" class="h-4 w-4 text-muted-foreground" />
            <span :class="['rounded-full px-1.5 py-0.5 text-[10px] font-medium', categoryColors[item.category] || 'bg-muted text-muted-foreground']">
              {{ item.category }}
            </span>
          </div>
          <UiCardTitle class="text-base mt-2 line-clamp-1">{{ item.title }}</UiCardTitle>
        </UiCardHeader>
        <UiCardContent class="pt-0 space-y-2">
          <p v-if="item.description" class="text-sm text-muted-foreground line-clamp-2">{{ item.description }}</p>
          <p v-if="item.content" class="text-muted-foreground/80 line-clamp-4 whitespace-pre-line font-mono text-xs leading-relaxed bg-muted/30 rounded-md p-2">{{ item.content }}</p>
          <div class="flex items-center justify-between text-xs text-muted-foreground border-t border-border pt-2">
            <span>{{ formatDate(item.startDate) }}</span>
            <div class="flex items-center gap-1">
              <span v-for="tag in item.tags.slice(0, 2)" :key="tag" class="bg-muted px-1.5 py-0.5 rounded text-[10px]">#{{ tag }}</span>
              <span v-if="item.tags.length > 2" class="text-[10px] text-muted-foreground">+{{ item.tags.length - 2 }}</span>
            </div>
          </div>
        </UiCardContent>
      </UiCard>
      <div v-if="!filteredItems.length" class="col-span-full flex items-center justify-center h-40 text-sm text-muted-foreground">
        No notes found
      </div>
    </div>

    <!-- ================= LIST VIEW ================= -->
    <div v-if="viewMode === 'list'" class="space-y-2">
      <div
        v-for="item in (filteredItems as NoteItem[])"
        :key="item.id"
        class="flex items-start gap-4 rounded-lg border border-border bg-card p-4 hover:bg-muted transition-colors cursor-pointer"
        @click="openDetail(item)">
        <Icon name="lucide:sticky-note" class="h-5 w-5 shrink-0 mt-0.5 text-purple-500" />
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-1">
            <p class="font-medium truncate">{{ item.title }}</p>
            <Icon v-if="item.pinned" name="lucide:pin" class="h-3.5 w-3.5 text-amber-500 shrink-0" />
          </div>
          <p v-if="item.description" class="text-sm text-muted-foreground line-clamp-1 mb-1">{{ item.description }}</p>
          <div class="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
            <span :class="['rounded-full px-1.5 py-0.5 text-[10px] font-medium', categoryColors[item.category] || 'bg-muted text-muted-foreground']">
              {{ item.category }}
            </span>
            <span>{{ formatDate(item.startDate) }}</span>
            <span v-if="item.tags.length" class="flex items-center gap-1">
              <Icon name="lucide:hash" class="h-3 w-3" />
              {{ item.tags.slice(0, 3).join(', ') }}
            </span>
          </div>
        </div>
      </div>
      <div v-if="!filteredItems.length" class="flex items-center justify-center h-40 text-sm text-muted-foreground">
        No notes found
      </div>
    </div>

    <!-- Results count -->
    <div class="text-xs text-muted-foreground mt-4 pt-4 border-t border-border pb-10">
      Showing {{ filteredItems.length }} {{ filteredItems.length === 1 ? 'note' : 'notes' }}
    </div>

    <!-- View/Edit Dialog -->
    <CalendarItemDialog
      v-model:open="viewOpen"
      mode="edit"
      :item="viewingItem"
      :can-navigate-prev="canPrev"
      :can-navigate-next="canNext"
      :owners="taskOwners"
      :folders="taskFolders"
      @navigate-prev="navPrev"
      @navigate-next="navNext"
      @save="handleUpdate"
      @delete="handleDelete"
      @close="viewOpen = false" />

    <!-- Create Dialog -->
    <CalendarItemDialog
      v-model:open="createOpen"
      mode="create"
      item-type="note"
      :item="null"
      :owners="taskOwners"
      :folders="taskFolders"
      @save="handleCreate"
      @close="createOpen = false" />
  </Page>
</template>
