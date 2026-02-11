<script setup lang="ts">
  import type { PageStat } from '~/components/layout/Page.vue'
  import { useBrowse, type BrowseViewMode } from '~/composables/useBrowse'
  import type { CalendarItem } from '~/types/calendarItem'

  definePageMeta({ layout: 'default' })
  useHead({ title: 'Organizations | Personal' })

  // ---------------------------------------------------------------------------
  // Live data
  // ---------------------------------------------------------------------------

  const { items: allItems, create: createItem, update: updateItem, remove: removeItem } = useCalendarItems()

  const items = computed(() => allItems.value.filter((i: any) => i.type === 'organization'))

  // ---------------------------------------------------------------------------
  // Browse
  // ---------------------------------------------------------------------------

  const { browseState, filteredItems } = useBrowse({
    items: items as Ref<CalendarItem[]>,
    searchFields: ['title', 'description', 'website', 'industry'] as (keyof CalendarItem)[],
    defaultViewMode: 'grid' as BrowseViewMode,
    sortOptions: [
      { value: 'title', label: 'Name' },
      { value: 'startDate', label: 'Date Added' },
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
        id: 'industry', label: 'Industry', icon: 'lucide:factory',
        options: [
          { value: 'all', label: 'All' },
          { value: 'technology', label: 'Technology' },
          { value: 'media', label: 'Media' },
          { value: 'education', label: 'Education' },
          { value: 'finance', label: 'Finance' },
        ],
        fn: (item: any, val: string) => item.industry === val,
      },
    ],
  })

  const viewMode = computed(() => browseState.viewMode.value)

  // ---------------------------------------------------------------------------
  // Stats
  // ---------------------------------------------------------------------------

  const stats = computed<PageStat[]>(() => [
    { label: 'Organizations', value: items.value.length, icon: 'lucide:building-2' },
    { label: 'Work', value: items.value.filter((o: any) => o.category === 'work').length, icon: 'lucide:briefcase', color: 'text-blue-500' },
    { label: 'Personal', value: items.value.filter((o: any) => o.category === 'personal').length, icon: 'lucide:user', color: 'text-emerald-500' },
  ])

  // ---------------------------------------------------------------------------
  // UI helpers
  // ---------------------------------------------------------------------------

  const categoryColors: Record<string, string> = {
    work: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    personal: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  }

  function getInitials(name: string): string {
    return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
  }

  function getDomain(url?: string): string {
    if (!url) return ''
    try {
      return new URL(url.startsWith('http') ? url : `https://${url}`).hostname.replace(/^www\./, '')
    } catch {
      return url
    }
  }

  // ---------------------------------------------------------------------------
  // References
  // ---------------------------------------------------------------------------

  function getRefCount(item: any): number {
    return (item.references || []).filter((r: any) => r.kind === 'entity').length
  }

  // ---------------------------------------------------------------------------
  // Dialog
  // ---------------------------------------------------------------------------

  const createOpen = ref(false)
  const viewOpen = ref(false)
  const viewingItem = ref<CalendarItem | null>(null)

  const taskOwners = [{ id: 'you', name: 'You' }, { id: 'alex', name: 'Alex' }, { id: 'maya', name: 'Maya' }]

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
    await createItem({ ...item, type: 'organization' as any } as any)
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
    title="Organizations"
    subtitle="Personal"
    description="Companies, teams, and groups you work with."
    icon="lucide:building-2"
    icon-class="text-zinc-300"
    search-placeholder="Search organizations..."
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
        Add Organization
      </UiButton>
    </template>

    <!-- ================= GRID VIEW ================= -->
    <div v-if="viewMode === 'grid'" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      <UiCard
        v-for="item in filteredItems"
        :key="item.id"
        class="relative overflow-hidden hover:bg-muted transition-colors cursor-pointer group"
        @click="openDetail(item)">
        <UiCardHeader class="pb-2">
          <div class="flex items-start gap-3">
            <div class="h-10 w-10 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-400 text-sm font-semibold shrink-0">
              <img v-if="(item as any).logo" :src="(item as any).logo" class="h-10 w-10 rounded-lg object-cover" :alt="item.title" @error="($event.target as HTMLImageElement).style.display = 'none'" />
              <template v-else>{{ getInitials(item.title) }}</template>
            </div>
            <div class="min-w-0 flex-1">
              <UiCardTitle class="text-base line-clamp-1">{{ item.title }}</UiCardTitle>
              <p v-if="(item as any).industry" class="text-xs text-muted-foreground truncate capitalize">{{ (item as any).industry }}</p>
              <p v-if="(item as any).website" class="text-xs text-muted-foreground/70 truncate">{{ getDomain((item as any).website) }}</p>
            </div>
          </div>
        </UiCardHeader>
        <UiCardContent class="pt-0 space-y-2">
          <p v-if="item.description" class="text-sm text-muted-foreground line-clamp-2">{{ item.description }}</p>
          <div class="flex items-center justify-between text-xs text-muted-foreground border-t border-border pt-2">
            <span :class="['rounded-full px-1.5 py-0.5 text-[10px] font-medium', categoryColors[(item as any).category] || 'bg-muted text-muted-foreground']">
              {{ (item as any).category }}
            </span>
            <div class="flex items-center gap-2">
              <span v-if="getRefCount(item)" class="flex items-center gap-0.5 text-[10px] text-muted-foreground/70">
                <Icon name="lucide:link" class="h-3 w-3" />
                {{ getRefCount(item) }}
              </span>
              <span v-for="tag in (item.tags || []).slice(0, 2)" :key="tag" class="bg-muted px-1.5 py-0.5 rounded text-[10px]">#{{ tag }}</span>
            </div>
          </div>
        </UiCardContent>
      </UiCard>
      <div v-if="!filteredItems.length" class="col-span-full flex flex-col items-center justify-center py-20 text-center">
        <Icon name="lucide:building-2" class="h-12 w-12 text-muted-foreground/30 mb-4" />
        <h3 class="text-lg font-medium text-foreground mb-1">No organizations yet</h3>
        <p class="text-sm text-muted-foreground max-w-sm">Add companies, teams, and groups you work with. Organizations can also be suggested from bookmarked pages.</p>
      </div>
    </div>

    <!-- ================= LIST VIEW ================= -->
    <div v-if="viewMode === 'list'" class="space-y-2">
      <div
        v-for="item in filteredItems"
        :key="item.id"
        class="flex items-center gap-4 rounded-lg border border-border bg-card p-4 hover:bg-muted transition-colors cursor-pointer"
        @click="openDetail(item)">
        <div class="h-10 w-10 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-400 text-sm font-semibold shrink-0">
          {{ getInitials(item.title) }}
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-0.5">
            <p class="font-medium truncate">{{ item.title }}</p>
            <span :class="['rounded-full px-1.5 py-0.5 text-[10px] font-medium shrink-0', categoryColors[(item as any).category] || 'bg-muted text-muted-foreground']">
              {{ (item as any).category }}
            </span>
          </div>
          <p v-if="(item as any).industry || (item as any).website" class="text-sm text-muted-foreground truncate">
            {{ [(item as any).industry, getDomain((item as any).website)].filter(Boolean).join(' · ') }}
          </p>
        </div>
        <div class="shrink-0 text-right text-xs text-muted-foreground hidden sm:block">
          <p v-if="getRefCount(item)" class="flex items-center gap-1">
            <Icon name="lucide:link" class="h-3 w-3" />
            {{ getRefCount(item) }} {{ getRefCount(item) === 1 ? 'reference' : 'references' }}
          </p>
          <p v-if="(item as any).memberCount">{{ (item as any).memberCount }} members</p>
        </div>
      </div>
      <div v-if="!filteredItems.length" class="flex flex-col items-center justify-center py-20 text-center">
        <Icon name="lucide:building-2" class="h-12 w-12 text-muted-foreground/30 mb-4" />
        <h3 class="text-lg font-medium text-foreground mb-1">No organizations yet</h3>
        <p class="text-sm text-muted-foreground max-w-sm">Add companies, teams, and groups you work with.</p>
      </div>
    </div>

    <!-- ================= TABLE VIEW ================= -->
    <div v-if="viewMode === 'table'" class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-border text-left">
            <th class="pb-2 pr-4 font-medium text-muted-foreground">Name</th>
            <th class="pb-2 pr-4 font-medium text-muted-foreground">Industry</th>
            <th class="pb-2 pr-4 font-medium text-muted-foreground">Website</th>
            <th class="pb-2 pr-4 font-medium text-muted-foreground">Category</th>
            <th class="pb-2 pr-4 font-medium text-muted-foreground">Refs</th>
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
                <div class="h-7 w-7 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-400 text-[10px] font-semibold shrink-0">
                  {{ getInitials(item.title) }}
                </div>
                <span class="font-medium truncate">{{ item.title }}</span>
              </div>
            </td>
            <td class="py-2.5 pr-4 text-muted-foreground truncate max-w-[150px] capitalize">{{ (item as any).industry || '—' }}</td>
            <td class="py-2.5 pr-4 text-muted-foreground truncate max-w-[200px]">{{ getDomain((item as any).website) || '—' }}</td>
            <td class="py-2.5 pr-4">
              <span :class="['rounded-full px-1.5 py-0.5 text-[10px] font-medium', categoryColors[(item as any).category] || 'bg-muted text-muted-foreground']">
                {{ (item as any).category }}
              </span>
            </td>
            <td class="py-2.5 pr-4 text-muted-foreground">{{ getRefCount(item) || '—' }}</td>
          </tr>
        </tbody>
      </table>
      <div v-if="!filteredItems.length" class="flex flex-col items-center justify-center py-20 text-center">
        <Icon name="lucide:building-2" class="h-12 w-12 text-muted-foreground/30 mb-4" />
        <h3 class="text-lg font-medium text-foreground mb-1">No organizations yet</h3>
        <p class="text-sm text-muted-foreground max-w-sm">Add companies, teams, and groups you work with.</p>
      </div>
    </div>

    <!-- Results count -->
    <div class="text-xs text-muted-foreground mt-4 pt-4 border-t border-border pb-10">
      Showing {{ filteredItems.length }} {{ filteredItems.length === 1 ? 'organization' : 'organizations' }}
    </div>

    <!-- View/Edit Dialog -->
    <OrganizationDialog
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
    <OrganizationDialog
      v-model:open="createOpen"
      mode="create"
      :item="null"
      :owners="taskOwners"
      @save="handleCreate"
      @close="createOpen = false" />
  </Page>
</template>
