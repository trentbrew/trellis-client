<script setup lang="ts">
  import type { PageStat } from '~/components/layout/Page.vue'
  import { useBrowsePage } from '~/composables/useBrowsePage'
  import EntityDialog from '~/components/dialogs/EntityDialog.vue'
  import type { BookmarkItem } from '~/types/entity'

  definePageMeta({ layout: 'default' })
  useHead({ title: 'Bookmarks | Personal' })

  // ---------------------------------------------------------------------------
  // Browse page (data + browse + dialog + CRUD)
  // ---------------------------------------------------------------------------

  const {
    items, filteredItems, browseState, viewMode,
    viewOpen, viewingItem, openDetail, handleNewItem,
    canPrev, canNext, navPrev, navNext,
    handleUpdate, handleDelete,
  } = useBrowsePage({
    entityType: 'bookmark',
    searchFields: ['title', 'url', 'description', 'siteName', 'excerpt'],
    defaultViewMode: 'moodboard',
    sortOptions: [
      { value: 'startDate', label: 'Date Added' },
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


  // ---------------------------------------------------------------------------
  // Stats (type-specific — stays in page)
  // ---------------------------------------------------------------------------

  const stats = computed<PageStat[]>(() => [
    { label: 'Bookmarks', value: items.value.length, icon: 'lucide:bookmark' },
    { label: 'Pinned', value: (items.value as BookmarkItem[]).filter((b) => b.pinned).length, icon: 'lucide:pin', color: 'text-amber-500' },
    { label: 'Work', value: (items.value as BookmarkItem[]).filter((b) => b.category === 'work').length, icon: 'lucide:briefcase', color: 'text-blue-500' },
    { label: 'Personal', value: (items.value as BookmarkItem[]).filter((b) => b.category === 'personal').length, icon: 'lucide:user', color: 'text-emerald-500' },
  ])

  // ---------------------------------------------------------------------------
  // UI helpers (type-specific — stays in page)
  // ---------------------------------------------------------------------------

  const _categoryColors: Record<string, string> = {
    work: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    personal: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    general: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  }

  const _formatDate = (d: string) => {
    try { return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) }
    catch { return d }
  }

  function getDomain(url: string): string {
    try {
      const u = new URL(url)
      return u.hostname.replace(/^www\./, '')
    } catch {
      return url
    }
  }

  function _openUrl(url: string) {
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const taskOwners = [{ id: 'you', name: 'You' }, { id: 'alex', name: 'Alex' }, { id: 'maya', name: 'Maya' }]
  const taskFolders = ['Work', 'Personal', 'Research']
</script>

<template>
  <Page
    variant="browse"
    title="Bookmarks"
    subtitle="Personal"
    data-source="bookmark"
    description="Saved links, articles, and references."
    icon="lucide:bookmark"
    icon-class="text-sky-300"
    search-placeholder="Search bookmarks..."
    :stats="stats"
    :show-view-switcher="true"
    :fill-height="true"
    :browse="browseState"
    :view-mode-options="[
      { mode: 'moodboard', label: 'Moodboard', icon: 'lucide:layout-dashboard' },
      { mode: 'grid', label: 'Grid', icon: 'lucide:grid-3x3' },
      { mode: 'list', label: 'List', icon: 'lucide:list' },
      { mode: 'table', label: 'Table', icon: 'lucide:table' },
    ]">

    <!-- Toolbar Actions -->
    <template #toolbarActions>
      <UiButton @click="handleNewItem()">
        <Icon name="lucide:plus" class="mr-2 h-4 w-4" />
        New Bookmark
      </UiButton>
    </template>

    <!-- ================= GRID VIEW ================= -->
    <div v-if="viewMode === 'grid' || !['grid', 'moodboard', 'list', 'table'].includes(viewMode)" class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      <EntityCard
        v-for="item in (filteredItems as BookmarkItem[])"
        :key="item.id"
        :item="item"
        layout="grid"
        @click="openDetail(item)" />
      <div v-if="!filteredItems.length" class="col-span-full flex items-center justify-center h-40 text-sm text-muted-foreground">
        No bookmarks found
      </div>
    </div>

    <!-- ================= MOODBOARD VIEW ================= -->
    <div v-else-if="viewMode === 'moodboard'" class="columns-2 sm:columns-3 lg:columns-4 xl:columns-5 gap-3">
      <EntityCard
        v-for="item in (filteredItems as BookmarkItem[])"
        :key="item.id"
        :item="item"
        layout="moodboard"
        @click="openDetail(item)" />
      <div v-if="!filteredItems.length" class="col-span-full flex items-center justify-center h-40 text-sm text-muted-foreground">
        No bookmarks found
      </div>
    </div>

    <!-- ================= LIST VIEW ================= -->
    <div v-else-if="viewMode === 'list'" class="flex flex-col gap-2">
      <EntityCard
        v-for="item in (filteredItems as BookmarkItem[])"
        :key="item.id"
        :item="item"
        layout="list"
        @click="openDetail(item)" />
      <div v-if="!filteredItems.length" class="flex items-center justify-center h-40 text-sm text-muted-foreground">
        No bookmarks found
      </div>
    </div>

    <!-- ================= TABLE VIEW ================= -->
    <div v-else-if="viewMode === 'table'" class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-border">
            <th class="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Title</th>
            <th class="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Domain</th>
            <th class="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Category</th>
            <th class="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Date</th>
            <th class="text-left py-2 px-3 text-xs font-medium text-muted-foreground w-8"></th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="item in (filteredItems as BookmarkItem[])"
            :key="item.id"
            class="border-b border-border/50 hover:bg-muted/30 cursor-pointer transition"
            @click="openDetail(item)">
            <td class="py-2 px-3">
              <div class="flex items-center gap-2">
                <Icon name="lucide:bookmark" class="h-4 w-4 shrink-0 text-muted-foreground" />
                <span class="font-medium truncate">{{ item.title || 'Untitled' }}</span>
              </div>
            </td>
            <td class="py-2 px-3 text-muted-foreground text-xs">{{ (item as any).url ? getDomain((item as any).url) : '—' }}</td>
            <td class="py-2 px-3 text-muted-foreground">{{ (item as any).category || '—' }}</td>
            <td class="py-2 px-3 text-muted-foreground">{{ item.startDate ? new Date(item.startDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—' }}</td>
            <td class="py-2 px-3">
              <Icon v-if="(item as any).pinned" name="lucide:pin" class="h-3 w-3 text-amber-500" />
            </td>
          </tr>
        </tbody>
      </table>
      <div v-if="!filteredItems.length" class="flex items-center justify-center h-40 text-sm text-muted-foreground">
        No bookmarks found
      </div>
    </div>

    <!-- Results count -->
    <div class="text-xs text-muted-foreground mt-4 pt-4 border-t border-border pb-10">
      Showing {{ filteredItems.length }} {{ filteredItems.length === 1 ? 'bookmark' : 'bookmarks' }}
    </div>

    <!-- View/Edit Dialog -->
    <EntityDialog
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

  </Page>
</template>
