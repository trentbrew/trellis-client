<script setup lang="ts">
  import type { PageStat } from '~/components/layout/Page.vue'
  import { useBrowse, type BrowseViewMode } from '~/composables/useBrowse'
  import CalendarItemDialog from '~/components/dialogs/CalendarItemDialog.vue'
  import type { CalendarItem } from '~/types/calendarItem'

  definePageMeta({ layout: 'default' })
  useHead({ title: 'Files | Personal' })

  // ---------------------------------------------------------------------------
  // Live data
  // ---------------------------------------------------------------------------

  const { items: allItems, create: createItem, update: updateItem, remove: removeItem } = useCalendarItems()

  const items = computed(() => allItems.value.filter((i: any) => i.type === 'file'))

  // ---------------------------------------------------------------------------
  // Browse
  // ---------------------------------------------------------------------------

  const { browseState, filteredItems } = useBrowse({
    items: items as Ref<CalendarItem[]>,
    searchFields: ['title', 'description', 'mimeType', 'storagePath'] as (keyof CalendarItem)[],
    defaultViewMode: 'list' as BrowseViewMode,
    sortOptions: [
      { value: 'startDate', label: 'Date Added' },
      { value: 'title', label: 'Name' },
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

  const viewMode = computed(() => browseState.viewMode.value)

  // ---------------------------------------------------------------------------
  // Stats
  // ---------------------------------------------------------------------------

  const stats = computed<PageStat[]>(() => [
    { label: 'Files', value: items.value.length, icon: 'lucide:paperclip' },
    { label: 'Pinned', value: items.value.filter((f: any) => f.pinned).length, icon: 'lucide:pin', color: 'text-amber-500' },
    { label: 'PDFs', value: items.value.filter((f: any) => (f as any).mimeType?.includes('pdf')).length, icon: 'lucide:file-text', color: 'text-red-500' },
    { label: 'Images', value: items.value.filter((f: any) => (f as any).mimeType?.startsWith('image/')).length, icon: 'lucide:image', color: 'text-blue-500' },
  ])

  // ---------------------------------------------------------------------------
  // UI helpers
  // ---------------------------------------------------------------------------

  const categoryColors: Record<string, string> = {
    work: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    personal: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  }

  function mimeIcon(mime: string): string {
    if (!mime) return 'lucide:file'
    if (mime.includes('pdf')) return 'lucide:file-text'
    if (mime.startsWith('image/')) return 'lucide:image'
    if (mime.includes('spreadsheet') || mime.includes('excel')) return 'lucide:file-spreadsheet'
    if (mime.startsWith('video/')) return 'lucide:film'
    if (mime.includes('svg')) return 'lucide:pen-tool'
    return 'lucide:file'
  }

  function mimeColor(mime: string): string {
    if (!mime) return 'text-muted-foreground'
    if (mime.includes('pdf')) return 'text-red-500'
    if (mime.startsWith('image/')) return 'text-blue-500'
    if (mime.includes('spreadsheet') || mime.includes('excel')) return 'text-green-500'
    if (mime.startsWith('video/')) return 'text-purple-500'
    if (mime.includes('svg')) return 'text-orange-500'
    return 'text-cyan-500'
  }

  function formatBytes(bytes?: number): string {
    if (!bytes) return '—'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const formatDate = (d: string) => {
    try { return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) }
    catch { return d }
  }

  // ---------------------------------------------------------------------------
  // Dialog
  // ---------------------------------------------------------------------------

  const createOpen = ref(false)
  const viewOpen = ref(false)
  const viewingItem = ref<CalendarItem | null>(null)

  const taskOwners = [{ id: 'you', name: 'You' }, { id: 'alex', name: 'Alex' }, { id: 'maya', name: 'Maya' }]
  const taskFolders = ['Work', 'Personal', 'Finance', 'Engineering']

  function openDetail(item: any) {
    viewingItem.value = item
    viewOpen.value = true
  }

  const viewingIndex = computed(() => viewingItem.value ? filteredItems.value.findIndex((i) => (i as CalendarItem).id === viewingItem.value?.id) : -1)
  const canPrev = computed(() => viewingIndex.value > 0)
  const canNext = computed(() => viewingIndex.value < filteredItems.value.length - 1)
  function navPrev() { if (canPrev.value) viewingItem.value = filteredItems.value[viewingIndex.value - 1] as CalendarItem }
  function navNext() { if (canNext.value) viewingItem.value = filteredItems.value[viewingIndex.value + 1] as CalendarItem }

  async function handleCreate(item: CalendarItem) {
    await createItem({ ...item, type: 'file' as any } as any)
    createOpen.value = false
  }

  async function handleUpdate(item: CalendarItem) {
    await updateItem(item)
    viewOpen.value = false
  }

  async function handleDelete(item: CalendarItem) {
    await removeItem(item.id)
    viewOpen.value = false
  }
</script>

<template>
  <Page
    variant="browse"
    title="Files"
    subtitle="Personal"
    description="Attached files and documents."
    icon="lucide:paperclip"
    icon-class="text-cyan-300"
    search-placeholder="Search files..."
    :stats="stats"
    :show-view-switcher="true"
    :fill-height="true"
    :browse="browseState">

    <!-- View Switcher -->
    <template #viewSwitcher>
      <div class="flex items-center gap-1">
        <button
          v-for="mode in (['grid', 'list', 'table'] as BrowseViewMode[])"
          :key="mode"
          type="button"
          class="flex h-8 items-center gap-2 rounded-md px-3 text-sm font-medium transition-colors"
          :class="viewMode === mode ? 'bg-foreground/10 text-foreground' : 'text-muted-foreground hover:bg-foreground/5 hover:text-foreground'"
          @click="browseState.setViewMode(mode)">
          <Icon :name="mode === 'grid' ? 'lucide:grid-3x3' : mode === 'list' ? 'lucide:list' : 'lucide:table'" class="h-4 w-4" />
        </button>
      </div>
    </template>

    <!-- Toolbar Actions -->
    <template #toolbarActions>
      <UiButton @click="createOpen = true">
        <Icon name="lucide:plus" class="mr-2 h-4 w-4" />
        Upload File
      </UiButton>
    </template>

    <!-- ================= GRID VIEW ================= -->
    <div v-if="viewMode === 'grid'" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      <UiCard
        v-for="item in filteredItems"
        :key="item.id"
        class="relative overflow-hidden hover:bg-muted transition-colors cursor-pointer group"
        @click="openDetail(item)">
        <div v-if="(item as any).pinned" class="absolute top-0 right-0 p-2 z-10">
          <Icon name="lucide:pin" class="h-3.5 w-3.5 text-amber-500" />
        </div>
        <div class="h-24 bg-muted/50 flex items-center justify-center border-b border-border">
          <Icon :name="mimeIcon((item as any).mimeType)" :class="['h-10 w-10', mimeColor((item as any).mimeType)]" />
        </div>
        <UiCardHeader class="pb-2">
          <UiCardTitle class="text-sm line-clamp-2">{{ item.title }}</UiCardTitle>
        </UiCardHeader>
        <UiCardContent class="pt-0 space-y-2">
          <p v-if="item.description" class="text-xs text-muted-foreground line-clamp-2">{{ item.description }}</p>
          <div class="flex items-center justify-between text-xs text-muted-foreground border-t border-border pt-2">
            <span>{{ formatBytes((item as any).sizeBytes) }}</span>
            <span>{{ formatDate((item as any).startDate) }}</span>
          </div>
        </UiCardContent>
      </UiCard>
      <div v-if="!filteredItems.length" class="col-span-full flex flex-col items-center justify-center py-20 text-center">
        <Icon name="lucide:paperclip" class="h-12 w-12 text-muted-foreground/30 mb-4" />
        <h3 class="text-lg font-medium text-foreground mb-1">No files yet</h3>
        <p class="text-sm text-muted-foreground max-w-sm">Upload or attach files to keep your documents organized.</p>
      </div>
    </div>

    <!-- ================= LIST VIEW ================= -->
    <div v-if="viewMode === 'list'" class="space-y-1">
      <div
        v-for="item in filteredItems"
        :key="item.id"
        class="flex items-center gap-4 rounded-lg border border-border bg-card px-4 py-3 hover:bg-muted transition-colors cursor-pointer"
        @click="openDetail(item)">
        <Icon :name="mimeIcon((item as any).mimeType)" :class="['h-5 w-5 shrink-0', mimeColor((item as any).mimeType)]" />
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <p class="font-medium truncate text-sm">{{ item.title }}</p>
            <Icon v-if="(item as any).pinned" name="lucide:pin" class="h-3 w-3 text-amber-500 shrink-0" />
          </div>
          <p v-if="item.description" class="text-xs text-muted-foreground truncate">{{ item.description }}</p>
        </div>
        <span class="text-xs text-muted-foreground shrink-0 hidden sm:block">{{ formatBytes((item as any).sizeBytes) }}</span>
        <span :class="['rounded-full px-1.5 py-0.5 text-[10px] font-medium shrink-0', categoryColors[(item as any).category] || 'bg-muted text-muted-foreground']">
          {{ (item as any).category }}
        </span>
        <span class="text-xs text-muted-foreground shrink-0 hidden md:block">{{ formatDate((item as any).startDate) }}</span>
      </div>
      <div v-if="!filteredItems.length" class="flex flex-col items-center justify-center py-20 text-center">
        <Icon name="lucide:paperclip" class="h-12 w-12 text-muted-foreground/30 mb-4" />
        <h3 class="text-lg font-medium text-foreground mb-1">No files yet</h3>
        <p class="text-sm text-muted-foreground max-w-sm">Upload or attach files to keep your documents organized.</p>
      </div>
    </div>

    <!-- ================= TABLE VIEW ================= -->
    <div v-if="viewMode === 'table'" class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-border text-left">
            <th class="pb-2 pr-4 font-medium text-muted-foreground">Name</th>
            <th class="pb-2 pr-4 font-medium text-muted-foreground">Type</th>
            <th class="pb-2 pr-4 font-medium text-muted-foreground">Size</th>
            <th class="pb-2 pr-4 font-medium text-muted-foreground">Category</th>
            <th class="pb-2 pr-4 font-medium text-muted-foreground">Date</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="item in filteredItems"
            :key="item.id"
            class="border-b border-border/50 hover:bg-muted/50 transition-colors cursor-pointer"
            @click="openDetail(item)">
            <td class="py-2.5 pr-4">
              <div class="flex items-center gap-2">
                <Icon :name="mimeIcon((item as any).mimeType)" :class="['h-4 w-4 shrink-0', mimeColor((item as any).mimeType)]" />
                <span class="font-medium truncate">{{ item.title }}</span>
                <Icon v-if="(item as any).pinned" name="lucide:pin" class="h-3 w-3 text-amber-500 shrink-0" />
              </div>
            </td>
            <td class="py-2.5 pr-4 text-muted-foreground text-xs font-mono truncate max-w-[150px]">{{ (item as any).mimeType || '—' }}</td>
            <td class="py-2.5 pr-4 text-muted-foreground">{{ formatBytes((item as any).sizeBytes) }}</td>
            <td class="py-2.5 pr-4">
              <span :class="['rounded-full px-1.5 py-0.5 text-[10px] font-medium', categoryColors[(item as any).category] || 'bg-muted text-muted-foreground']">
                {{ (item as any).category }}
              </span>
            </td>
            <td class="py-2.5 pr-4 text-muted-foreground">{{ formatDate((item as any).startDate) }}</td>
          </tr>
        </tbody>
      </table>
      <div v-if="!filteredItems.length" class="flex flex-col items-center justify-center py-20 text-center">
        <Icon name="lucide:paperclip" class="h-12 w-12 text-muted-foreground/30 mb-4" />
        <h3 class="text-lg font-medium text-foreground mb-1">No files yet</h3>
        <p class="text-sm text-muted-foreground max-w-sm">Upload or attach files to keep your documents organized.</p>
      </div>
    </div>

    <!-- Results count -->
    <div class="text-xs text-muted-foreground mt-4 pt-4 border-t border-border pb-10">
      Showing {{ filteredItems.length }} {{ filteredItems.length === 1 ? 'file' : 'files' }}
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
      item-type="file"
      :item="null"
      :owners="taskOwners"
      :folders="taskFolders"
      @save="handleCreate"
      @close="createOpen = false" />
  </Page>
</template>
