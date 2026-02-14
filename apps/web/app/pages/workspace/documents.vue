<script setup lang="ts">
  import type { PageStat } from '~/components/layout/Page.vue'
  import { useBrowsePage } from '~/composables/useBrowsePage'
  import EntityDialog from '~/components/dialogs/EntityDialog.vue'
  import SlideDeckDialog from '~/components/dialogs/SlideDeckDialog.vue'
  import type { Entity, SlideDeckItem } from '~/types/entity'

  definePageMeta({ layout: 'default' })
  useHead({ title: 'Documents | Personal' })

  // ---------------------------------------------------------------------------
  // Browse page (multi-type: note, file, page, template, slide_deck)
  // ---------------------------------------------------------------------------

  const {
    items, filteredItems, browseState, viewMode,
    viewOpen, viewingItem, openDetail: browseOpenDetail, handleNewItem,
    canPrev, canNext, navPrev, navNext,
    handleUpdate, handleDelete,
  } = useBrowsePage({
    entityType: ['file', 'page', 'template', 'slide_deck'],
    searchFields: ['title', 'content', 'description'],
    defaultViewMode: 'grid',
    sortOptions: [
      { value: 'startDate', label: 'Date' },
      { value: 'title', label: 'Title' },
      { value: 'type', label: 'Type' },
    ],
    itemFilter: (item) => {
      if (item.type === 'file' && !(item as any).mimeType) return false
      return true
    },
    filters: [
      {
        id: 'type',
        label: 'Type',
        icon: 'lucide:file-type',
        options: [
          { value: 'all', label: 'All' },
          { value: 'file', label: 'Files' },
          { value: 'page', label: 'Pages' },
          { value: 'slide_deck', label: 'Slide Decks' },
          { value: 'template', label: 'Templates' },
        ],
        fn: (item: any, val: string) => item.type === val,
      },
      {
        id: 'category',
        label: 'Category',
        icon: 'lucide:tag',
        options: [
          { value: 'all', label: 'All' },
          { value: 'work', label: 'Work' },
          { value: 'personal', label: 'Personal' },
        ],
        fn: (item: any, val: string) => item.category === val,
      },
      {
        id: 'pinned',
        label: 'Pinned',
        icon: 'lucide:pin',
        options: [
          { value: 'all', label: 'All' },
          { value: 'true', label: 'Pinned Only' },
        ],
        fn: (item: any, val: string) => (val === 'true' ? item.pinned === true : true),
      },
    ],
  })

  // ---------------------------------------------------------------------------
  // Stats (type-specific — stays in page)
  // ---------------------------------------------------------------------------

  const stats = computed<PageStat[]>(() => [
    { label: 'All', value: items.value.length, icon: 'lucide:file-text' },
    { label: 'Pages', value: items.value.filter((i) => i.type === 'page').length, icon: 'lucide:file-text', color: 'text-blue-500' },
    { label: 'Files', value: items.value.filter((i) => i.type === 'file').length, icon: 'lucide:paperclip', color: 'text-cyan-500' },
    { label: 'Decks', value: items.value.filter((i) => i.type === 'slide_deck').length, icon: 'lucide:presentation', color: 'text-rose-500' },
  ])

  // ---------------------------------------------------------------------------
  // UI helpers (type-specific — stays in page)
  // ---------------------------------------------------------------------------

  const typeIcons: Record<string, string> = {
    slide_deck: 'lucide:presentation',
    file: 'lucide:paperclip',
    page: 'lucide:file-text',
    template: 'lucide:layout-template',
  }

  const typeColors: Record<string, string> = {
    slide_deck: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
    file: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
    page: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    template: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  }

  const _formatDate = (d: string) => {
    try { return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) }
    catch { return d }
  }

  function formatBytes(bytes?: number): string {
    if (!bytes) return '—'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  // ---------------------------------------------------------------------------
  // Slide deck dialog (page-specific branching)
  // ---------------------------------------------------------------------------

  const slideDeckDialogOpen = ref(false)
  const viewingSlideDeck = ref<SlideDeckItem | null>(null)

  function openDetail(item: Entity) {
    if (item.type === 'slide_deck') {
      viewingSlideDeck.value = item as SlideDeckItem
      slideDeckDialogOpen.value = true
    } else {
      browseOpenDetail(item)
    }
  }

  const { update: updateItem, remove: removeItem } = useEntities()

  async function handleSlideDeckUpdate(item: Entity) {
    await updateItem(item)
    slideDeckDialogOpen.value = false
  }

  async function handleSlideDeckDelete(item: Entity) {
    await removeItem(item.id)
    slideDeckDialogOpen.value = false
  }

  const taskOwners = [{ id: 'you', name: 'You' }, { id: 'alex', name: 'Alex' }, { id: 'maya', name: 'Maya' }]
  const taskFolders = ['Work', 'Personal', 'Health', 'Finance', 'Projects']
</script>

<template>
  <Page
    variant="browse"
    title="Documents"
    subtitle="Personal"
    :data-source="['note', 'file', 'page', 'template', 'slide_deck']"
    description="Notes, files, pages, and presentations."
    search-placeholder="Search documents..."
    icon="lucide:file-text"
    icon-class="text-rose-300"
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
      <UiButton @click="handleNewItem('page')">
        <Icon name="lucide:plus" class="mr-2 h-4 w-4" />
        New Document
      </UiButton>
    </template>

    <!-- Browse views -->
      <div v-if="filteredItems.length === 0" class="flex flex-col items-center justify-center py-20 text-center">
        <Icon name="lucide:file-text" class="h-12 w-12 text-muted-foreground/30 mb-4" />
        <h3 class="text-lg font-medium text-foreground mb-1">No documents yet</h3>
        <p class="text-sm text-muted-foreground max-w-sm">
          Create notes, upload files, or build pages to populate your document library.
        </p>
      </div>

      <!-- Grid view -->
      <div v-else-if="viewMode === 'grid' || !['grid', 'moodboard', 'list', 'table'].includes(viewMode)" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        <EntityCard
          v-for="item in filteredItems"
          :key="item.id"
          :item="item"
          layout="grid"
          @click="openDetail(item as Entity)" />
      </div>

      <!-- Moodboard view -->
      <div v-else-if="viewMode === 'moodboard'" class="columns-2 sm:columns-3 lg:columns-4 xl:columns-5 gap-3">
        <EntityCard
          v-for="item in filteredItems"
          :key="item.id"
          :item="item"
          layout="moodboard"
          @click="openDetail(item as Entity)" />
      </div>

      <!-- List view -->
      <div v-else-if="viewMode === 'list'" class="flex flex-col gap-2">
        <EntityCard
          v-for="item in filteredItems"
          :key="item.id"
          :item="item"
          layout="list"
          @click="openDetail(item as Entity)" />
      </div>

      <!-- Table view -->
      <div v-else class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-border">
              <th class="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Title</th>
              <th class="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Type</th>
              <th class="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Size</th>
              <th class="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Category</th>
              <th class="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Date</th>
              <th class="text-left py-2 px-3 text-xs font-medium text-muted-foreground w-8"></th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="item in filteredItems"
              :key="item.id"
              class="border-b border-border/50 hover:bg-muted/30 cursor-pointer transition"
              @click="openDetail(item as Entity)">
              <td class="py-2 px-3">
                <div class="flex items-center gap-2">
                  <Icon :name="typeIcons[item.type] || 'lucide:file'" class="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span class="font-medium truncate">{{ item.title || 'Untitled' }}</span>
                </div>
              </td>
              <td class="py-2 px-3">
                <span :class="['inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium', typeColors[item.type] || 'bg-muted text-muted-foreground']">
                  {{ item.type }}
                </span>
              </td>
              <td class="py-2 px-3 text-muted-foreground text-xs">{{ item.type === 'file' ? formatBytes((item as any).sizeBytes) : '—' }}</td>
              <td class="py-2 px-3 text-muted-foreground">{{ (item as any).category || '—' }}</td>
              <td class="py-2 px-3 text-muted-foreground">{{ item.startDate ? new Date(item.startDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—' }}</td>
              <td class="py-2 px-3">
                <Icon v-if="(item as any).pinned" name="lucide:pin" class="h-3 w-3 text-amber-500" />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    <!-- Results count -->
    <div class="text-xs text-muted-foreground mt-4 pt-4 border-t border-border pb-10">
      Showing {{ filteredItems.length }} {{ filteredItems.length === 1 ? 'document' : 'documents' }}
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


    <!-- Slide Deck Dialog -->
    <SlideDeckDialog
      v-model:open="slideDeckDialogOpen"
      mode="edit"
      :item="viewingSlideDeck"
      @save="handleSlideDeckUpdate"
      @delete="handleSlideDeckDelete"
      @close="slideDeckDialogOpen = false" />
  </Page>
</template>
