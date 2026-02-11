<script setup lang="ts">
  import type { PageStat } from '~/components/layout/Page.vue'
  import { useBrowse, type BrowseViewMode } from '~/composables/useBrowse'
  import CalendarItemDialog from '~/components/dialogs/CalendarItemDialog.vue'
  import type { CalendarItem, BookmarkItem } from '~/types/calendarItem'

  definePageMeta({ layout: 'default' })
  useHead({ title: 'Bookmarks | Personal' })

  // ---------------------------------------------------------------------------
  // Live data from instant-local
  // ---------------------------------------------------------------------------

  const { items: allItems, create: createItem, update: updateItem, remove: removeItem } = useCalendarItems()

  const items = computed(() => allItems.value.filter((i): i is BookmarkItem => i.type === 'bookmark'))

  // ---------------------------------------------------------------------------
  // Browse
  // ---------------------------------------------------------------------------

  const { browseState, filteredItems } = useBrowse({
    items: items as Ref<CalendarItem[]>,
    searchFields: ['title', 'url', 'description', 'siteName', 'excerpt'] as (keyof CalendarItem)[],
    defaultViewMode: 'moodboard' as BrowseViewMode,
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

  const viewMode = computed(() => browseState.viewMode.value)

  const viewModeIcons: Record<string, string> = {
    moodboard: 'lucide:layout-dashboard',
    grid: 'lucide:grid-3x3',
    list: 'lucide:list',
  }

  // ---------------------------------------------------------------------------
  // Stats
  // ---------------------------------------------------------------------------

  const stats = computed<PageStat[]>(() => [
    { label: 'Bookmarks', value: items.value.length, icon: 'lucide:bookmark' },
    { label: 'Pinned', value: items.value.filter((b) => b.pinned).length, icon: 'lucide:pin', color: 'text-amber-500' },
    { label: 'Work', value: items.value.filter((b) => b.category === 'work').length, icon: 'lucide:briefcase', color: 'text-blue-500' },
    { label: 'Personal', value: items.value.filter((b) => b.category === 'personal').length, icon: 'lucide:user', color: 'text-emerald-500' },
  ])

  // ---------------------------------------------------------------------------
  // UI helpers
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

  function getDomain(url: string): string {
    try {
      const u = new URL(url)
      return u.hostname.replace(/^www\./, '')
    } catch {
      return url
    }
  }

  function openUrl(url: string) {
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  // ---------------------------------------------------------------------------
  // Dialog
  // ---------------------------------------------------------------------------

  const createOpen = ref(false)
  const viewOpen = ref(false)
  const viewingItem = ref<CalendarItem | null>(null)

  const taskOwners = [{ id: 'you', name: 'You' }, { id: 'alex', name: 'Alex' }, { id: 'maya', name: 'Maya' }]
  const taskFolders = ['Work', 'Personal', 'Research']

  function openDetail(item: BookmarkItem) {
    viewingItem.value = item
    viewOpen.value = true
  }

  const viewingIndex = computed(() => viewingItem.value ? filteredItems.value.findIndex((i) => (i as CalendarItem).id === viewingItem.value?.id) : -1)
  const canPrev = computed(() => viewingIndex.value > 0)
  const canNext = computed(() => viewingIndex.value < filteredItems.value.length - 1)
  function navPrev() { if (canPrev.value) viewingItem.value = filteredItems.value[viewingIndex.value - 1] as CalendarItem }
  function navNext() { if (canNext.value) viewingItem.value = filteredItems.value[viewingIndex.value + 1] as CalendarItem }

  async function handleCreate(item: CalendarItem) {
    await createItem({ ...item, type: 'bookmark' } as BookmarkItem)
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
    title="Bookmarks"
    subtitle="Personal"
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
    ]">

    <!-- View Switcher -->
    <template #viewSwitcher>
      <div class="flex items-center gap-1">
        <button
          v-for="mode in (['moodboard', 'grid', 'list'] as BrowseViewMode[])"
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
        New Bookmark
      </UiButton>
    </template>

    <!-- ================= GRID VIEW ================= -->
    <div v-if="viewMode === 'grid'" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <UiCard
        v-for="item in (filteredItems as BookmarkItem[])"
        :key="item.id"
        class="relative overflow-hidden hover:bg-muted transition-colors cursor-pointer group"
        @click="openDetail(item)">
        <div v-if="item.pinned" class="absolute top-0 right-0 p-2 z-10">
          <Icon name="lucide:pin" class="h-3.5 w-3.5 text-amber-500" />
        </div>

        <!-- Thumbnail area -->
        <div class="h-32 bg-muted/50 flex items-center justify-center border-b border-border overflow-hidden">
          <img
            v-if="item.thumbnail"
            :src="item.thumbnail"
            :alt="item.title"
            class="w-full h-full object-cover" />
          <div v-else class="flex flex-col items-center gap-2 text-muted-foreground/50">
            <Icon name="lucide:globe" class="h-8 w-8" />
            <span class="text-xs font-mono">{{ getDomain(item.url) }}</span>
          </div>
        </div>

        <UiCardHeader class="pb-2">
          <div class="flex items-start justify-between gap-2">
            <div class="flex items-center gap-2 min-w-0">
              <img
                v-if="item.favicon"
                :src="item.favicon"
                :alt="item.siteName || ''"
                class="h-4 w-4 shrink-0 rounded-sm"
                @error="($event.target as HTMLImageElement).style.display = 'none'" />
              <Icon v-else name="lucide:bookmark" class="h-4 w-4 shrink-0 text-muted-foreground" />
              <span v-if="item.siteName" class="text-xs text-muted-foreground truncate">{{ item.siteName }}</span>
              <span v-else class="text-xs text-muted-foreground truncate font-mono">{{ getDomain(item.url) }}</span>
            </div>
            <span :class="['rounded-full px-1.5 py-0.5 text-[10px] font-medium shrink-0', categoryColors[item.category] || 'bg-muted text-muted-foreground']">
              {{ item.category }}
            </span>
          </div>
          <UiCardTitle class="text-base mt-2 line-clamp-2">{{ item.title }}</UiCardTitle>
        </UiCardHeader>
        <UiCardContent class="pt-0 space-y-2">
          <p v-if="item.excerpt || item.description" class="text-sm text-muted-foreground line-clamp-2">
            {{ item.excerpt || item.description }}
          </p>
          <div class="flex items-center justify-between text-xs text-muted-foreground border-t border-border pt-2">
            <span>{{ formatDate(item.startDate) }}</span>
            <div class="flex items-center gap-1">
              <span v-for="tag in item.tags.slice(0, 2)" :key="tag" class="bg-muted px-1.5 py-0.5 rounded text-[10px]">#{{ tag }}</span>
              <span v-if="item.tags.length > 2" class="text-[10px] text-muted-foreground">+{{ item.tags.length - 2 }}</span>
            </div>
          </div>

          <!-- Open URL button (visible on hover) -->
          <div class="opacity-0 group-hover:opacity-100 transition-opacity pt-1">
            <button
              type="button"
              class="flex items-center gap-1.5 text-xs text-primary hover:underline"
              @click.stop="openUrl(item.url)">
              <Icon name="lucide:external-link" class="h-3 w-3" />
              Open link
            </button>
          </div>
        </UiCardContent>
      </UiCard>
      <div v-if="!filteredItems.length" class="col-span-full flex items-center justify-center h-40 text-sm text-muted-foreground">
        No bookmarks found
      </div>
    </div>

    <!-- ================= MOODBOARD VIEW ================= -->
    <div v-if="viewMode === 'moodboard'" class="columns-2 sm:columns-3 lg:columns-4 xl:columns-5 gap-3">
      <div
        v-for="item in (filteredItems as BookmarkItem[])"
        :key="item.id"
        class="mb-3 break-inside-avoid rounded-lg border border-border bg-card overflow-hidden cursor-pointer group hover:ring-1 hover:ring-primary/30 transition-all"
        @click="openDetail(item)">

        <!-- Thumbnail -->
        <div v-if="item.thumbnail" class="relative overflow-hidden">
          <img
            :src="item.thumbnail"
            :alt="item.title"
            class="w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            loading="lazy"
            @error="($event.target as HTMLImageElement).parentElement!.style.display = 'none'" />
          <div v-if="item.pinned" class="absolute top-2 right-2">
            <Icon name="lucide:pin" class="h-3.5 w-3.5 text-amber-500 drop-shadow" />
          </div>
          <!-- Hover overlay with external link -->
          <div class="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-end justify-end p-2">
            <button
              type="button"
              class="opacity-0 group-hover:opacity-100 transition-opacity rounded-full bg-black/60 p-1.5 hover:bg-black/80"
              title="Open link"
              @click.stop="openUrl(item.url)">
              <Icon name="lucide:external-link" class="h-3.5 w-3.5 text-white" />
            </button>
          </div>
        </div>

        <!-- Content -->
        <div class="p-3 space-y-1.5">
          <div class="flex items-center gap-1.5 min-w-0">
            <img
              v-if="item.favicon"
              :src="item.favicon"
              :alt="item.siteName || ''"
              class="h-3.5 w-3.5 shrink-0 rounded-sm"
              @error="($event.target as HTMLImageElement).style.display = 'none'" />
            <Icon v-else name="lucide:globe" class="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
            <span class="text-[11px] text-muted-foreground truncate font-mono">{{ getDomain(item.url) }}</span>
            <Icon v-if="item.pinned && !item.thumbnail" name="lucide:pin" class="h-3 w-3 text-amber-500 shrink-0 ml-auto" />
          </div>
          <p class="text-sm font-medium leading-snug line-clamp-2">{{ item.title }}</p>
          <p v-if="!item.thumbnail && (item.excerpt || item.description)" class="text-xs text-muted-foreground leading-relaxed line-clamp-3">
            {{ item.excerpt || item.description }}
          </p>
        </div>
      </div>
      <div v-if="!filteredItems.length" class="col-span-full flex items-center justify-center h-40 text-sm text-muted-foreground">
        No bookmarks found
      </div>
    </div>

    <!-- ================= LIST VIEW ================= -->
    <div v-if="viewMode === 'list'" class="space-y-2">
      <div
        v-for="item in (filteredItems as BookmarkItem[])"
        :key="item.id"
        class="flex items-start gap-4 rounded-lg border border-border bg-card p-4 hover:bg-muted transition-colors cursor-pointer group"
        @click="openDetail(item)">
        <div class="shrink-0 mt-0.5">
          <img
            v-if="item.favicon"
            :src="item.favicon"
            :alt="item.siteName || ''"
            class="h-5 w-5 rounded-sm"
            @error="($event.target as HTMLImageElement).style.display = 'none'" />
          <Icon v-else name="lucide:bookmark" class="h-5 w-5 text-sky-500" />
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-1">
            <p class="font-medium truncate">{{ item.title }}</p>
            <Icon v-if="item.pinned" name="lucide:pin" class="h-3.5 w-3.5 text-amber-500 shrink-0" />
          </div>
          <p class="text-xs text-muted-foreground/70 font-mono truncate mb-1">{{ getDomain(item.url) }}</p>
          <p v-if="item.excerpt || item.description" class="text-sm text-muted-foreground line-clamp-1 mb-1">
            {{ item.excerpt || item.description }}
          </p>
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
        <button
          type="button"
          class="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-md hover:bg-muted"
          title="Open link"
          @click.stop="openUrl(item.url)">
          <Icon name="lucide:external-link" class="h-4 w-4 text-muted-foreground" />
        </button>
      </div>
      <div v-if="!filteredItems.length" class="flex items-center justify-center h-40 text-sm text-muted-foreground">
        No bookmarks found
      </div>
    </div>

    <!-- Results count -->
    <div class="text-xs text-muted-foreground mt-4 pt-4 border-t border-border pb-10">
      Showing {{ filteredItems.length }} {{ filteredItems.length === 1 ? 'bookmark' : 'bookmarks' }}
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
      item-type="bookmark"
      :item="null"
      :owners="taskOwners"
      :folders="taskFolders"
      @save="handleCreate"
      @close="createOpen = false" />
  </Page>
</template>
