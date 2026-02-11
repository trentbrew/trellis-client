<script setup lang="ts">
  import type { PageStat } from '~/components/layout/Page.vue'
  import { useBrowse, type BrowseViewMode } from '~/composables/useBrowse'
  import CalendarItemDialog from '~/components/dialogs/CalendarItemDialog.vue'
  import SlideDeckDialog from '~/components/dialogs/SlideDeckDialog.vue'
  import type { CalendarItem, SlideDeckItem } from '~/types/calendarItem'

  definePageMeta({ layout: 'default' })
  useHead({ title: 'Documents | Personal' })

  // ---------------------------------------------------------------------------
  // Live data from instant-local
  // ---------------------------------------------------------------------------

  const { items: allItems, create: createItem, update: updateItem, remove: removeItem } = useCalendarItems()

  // Document-type items: notes, files, pages, templates, slide decks
  const documentTypeSet = new Set(['note', 'file', 'page', 'template', 'slide_deck'])
  const items = computed(() => allItems.value.filter((i) => documentTypeSet.has(i.type)))

  // ---------------------------------------------------------------------------
  // Browse
  // ---------------------------------------------------------------------------

  const { browseState, filteredItems } = useBrowse({
    items: items as Ref<CalendarItem[]>,
    searchFields: ['title', 'content', 'description'] as (keyof CalendarItem)[],
    defaultViewMode: 'grid' as BrowseViewMode,
    sortOptions: [
      { value: 'startDate', label: 'Date' },
      { value: 'title', label: 'Title' },
      { value: 'type', label: 'Type' },
    ],
    filters: [
      {
        id: 'type',
        label: 'Type',
        icon: 'lucide:file-type',
        options: [
          { value: 'all', label: 'All' },
          { value: 'note', label: 'Notes' },
          { value: 'slide_deck', label: 'Slide Decks' },
          { value: 'file', label: 'Files' },
          { value: 'page', label: 'Pages' },
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

  const viewMode = computed(() => browseState.viewMode.value)

  // ---------------------------------------------------------------------------
  // Stats
  // ---------------------------------------------------------------------------

  const stats = computed<PageStat[]>(() => [
    { label: 'Documents', value: items.value.length, icon: 'lucide:file-text' },
    { label: 'Notes', value: items.value.filter((i) => i.type === 'note').length, icon: 'lucide:sticky-note', color: 'text-purple-500' },
    { label: 'Decks', value: items.value.filter((i) => i.type === 'slide_deck').length, icon: 'lucide:presentation', color: 'text-rose-500' },
    {
      label: 'Pinned',
      value: items.value.filter((i) => (i as any).pinned).length,
      icon: 'lucide:pin',
      color: 'text-amber-500',
    },
  ])

  // ---------------------------------------------------------------------------
  // UI helpers
  // ---------------------------------------------------------------------------

  const typeIcons: Record<string, string> = {
    note: 'lucide:sticky-note',
    slide_deck: 'lucide:presentation',
    file: 'lucide:paperclip',
    page: 'lucide:file-text',
    template: 'lucide:layout-template',
  }

  const typeColors: Record<string, string> = {
    note: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    slide_deck: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
    file: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
    page: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    template: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  }

  const categoryColors: Record<string, string> = {
    work: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    personal: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    general: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  }

  const formatDate = (d: string) => {
    try {
      return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    } catch {
      return d
    }
  }

  // ---------------------------------------------------------------------------
  // Dialog
  // ---------------------------------------------------------------------------

  const createDialogOpen = ref(false)
  const viewDialogOpen = ref(false)
  const slideDeckDialogOpen = ref(false)
  const viewingItem = ref<CalendarItem | null>(null)
  const viewingSlideDeck = ref<SlideDeckItem | null>(null)

  const taskOwners = [
    { id: 'you', name: 'You' },
    { id: 'alex', name: 'Alex' },
    { id: 'maya', name: 'Maya' },
    { id: 'jordan', name: 'Jordan' },
  ]
  const taskFolders = ['Work', 'Personal', 'Health', 'Finance', 'Projects']

  function openDetail(item: CalendarItem) {
    if (item.type === 'slide_deck') {
      viewingSlideDeck.value = item as SlideDeckItem
      slideDeckDialogOpen.value = true
    } else {
      viewingItem.value = item
      viewDialogOpen.value = true
    }
  }

  // Navigation within dialog
  const viewingIndex = computed(() =>
    viewingItem.value ? filteredItems.value.findIndex((i) => i.id === viewingItem.value?.id) : -1,
  )
  const canPrev = computed(() => viewingIndex.value > 0)
  const canNext = computed(() => viewingIndex.value < filteredItems.value.length - 1)
  function navPrev() {
    if (canPrev.value) viewingItem.value = filteredItems.value[viewingIndex.value - 1] as CalendarItem
  }
  function navNext() {
    if (canNext.value) viewingItem.value = filteredItems.value[viewingIndex.value + 1] as CalendarItem
  }

  async function handleCreate(item: CalendarItem) {
    await createItem(item)
    createDialogOpen.value = false
  }

  async function handleUpdate(item: CalendarItem) {
    await updateItem(item)
    viewDialogOpen.value = false
  }

  async function handleDelete(item: CalendarItem) {
    await removeItem(item.id)
    viewDialogOpen.value = false
  }

  async function handleSlideDeckUpdate(item: CalendarItem) {
    await updateItem(item)
    slideDeckDialogOpen.value = false
  }

  async function handleSlideDeckDelete(item: CalendarItem) {
    await removeItem(item.id)
    slideDeckDialogOpen.value = false
  }
</script>

<template>
  <Page
    variant="browse"
    title="Documents"
    subtitle="Personal"
    description="Notes, files, pages, and presentations."
    icon="lucide:file-text"
    icon-class="text-rose-300"
    :stats="stats">
    <!-- Toolbar action -->
    <template #toolbarActions>
      <UiButton variant="outline" size="sm" class="gap-2" @click="createDialogOpen = true">
        <Icon name="lucide:plus" class="h-4 w-4" />
        <span>New Document</span>
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
      <div v-else-if="viewMode === 'grid'" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <button
          v-for="item in filteredItems"
          :key="item.id"
          type="button"
          class="group relative flex flex-col rounded-xl border border-border bg-card p-4 text-left transition hover:shadow-md hover:border-primary/30"
          @click="openDetail(item as CalendarItem)">
          <!-- Type badge -->
          <div class="flex items-center gap-2 mb-3">
            <span :class="['inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium', typeColors[item.type] || 'bg-muted text-muted-foreground']">
              <Icon :name="typeIcons[item.type] || 'lucide:file'" class="h-3 w-3" />
              {{ item.type }}
            </span>
            <Icon v-if="(item as any).pinned" name="lucide:pin" class="h-3 w-3 text-amber-500 ml-auto" />
          </div>
          <!-- Title -->
          <h3 class="text-sm font-medium text-foreground line-clamp-2 mb-1">{{ item.title || 'Untitled' }}</h3>
          <!-- Description / Content preview -->
          <p v-if="(item as any).content || (item as any).description" class="text-xs text-muted-foreground line-clamp-3 mb-3 flex-1">
            {{ ((item as any).content || (item as any).description || '').replace(/<[^>]*>/g, '').slice(0, 200) }}
          </p>
          <div v-else class="flex-1" />
          <!-- Footer -->
          <div class="flex items-center gap-2 text-[10px] text-muted-foreground mt-auto pt-2 border-t border-border/50">
            <span v-if="item.startDate">{{ formatDate(item.startDate) }}</span>
            <span v-if="(item as any).category" :class="['px-1.5 py-0.5 rounded', categoryColors[(item as any).category] || 'bg-muted']">
              {{ (item as any).category }}
            </span>
          </div>
        </button>
      </div>

      <!-- List view -->
      <div v-else-if="viewMode === 'list'" class="flex flex-col divide-y divide-border">
        <button
          v-for="item in filteredItems"
          :key="item.id"
          type="button"
          class="flex items-center gap-3 px-3 py-3 text-left transition hover:bg-muted/50"
          @click="openDetail(item as CalendarItem)">
          <Icon :name="typeIcons[item.type] || 'lucide:file'" class="h-4 w-4 shrink-0 text-muted-foreground" />
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <span class="text-sm font-medium text-foreground truncate">{{ item.title || 'Untitled' }}</span>
              <Icon v-if="(item as any).pinned" name="lucide:pin" class="h-3 w-3 text-amber-500 shrink-0" />
            </div>
            <p v-if="(item as any).description" class="text-xs text-muted-foreground truncate mt-0.5">
              {{ (item as any).description }}
            </p>
          </div>
          <span :class="['inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium shrink-0', typeColors[item.type] || 'bg-muted text-muted-foreground']">
            {{ item.type }}
          </span>
          <span v-if="item.startDate" class="text-xs text-muted-foreground shrink-0">{{ formatDate(item.startDate) }}</span>
        </button>
      </div>

      <!-- Table view -->
      <div v-else class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-border">
              <th class="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Title</th>
              <th class="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Type</th>
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
              @click="openDetail(item as CalendarItem)">
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
              <td class="py-2 px-3 text-muted-foreground">{{ (item as any).category || '—' }}</td>
              <td class="py-2 px-3 text-muted-foreground">{{ item.startDate ? formatDate(item.startDate) : '—' }}</td>
              <td class="py-2 px-3">
                <Icon v-if="(item as any).pinned" name="lucide:pin" class="h-3 w-3 text-amber-500" />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    <!-- View/Edit Dialog -->
    <CalendarItemDialog
      v-model:open="viewDialogOpen"
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
      @close="viewDialogOpen = false" />

    <!-- Create Dialog -->
    <CalendarItemDialog
      v-model:open="createDialogOpen"
      mode="create"
      item-type="note"
      :item="null"
      :owners="taskOwners"
      :folders="taskFolders"
      @save="handleCreate"
      @close="createDialogOpen = false" />

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
