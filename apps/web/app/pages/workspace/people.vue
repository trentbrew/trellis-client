<script setup lang="ts">
  import type { PageStat } from '~/components/layout/Page.vue'
  import type { BrowseViewMode } from '~/composables/useBrowse'
  import { useBrowsePage } from '~/composables/useBrowsePage'

  definePageMeta({ layout: 'default' })
  useHead({ title: 'People | Personal' })

  // ---------------------------------------------------------------------------
  // Browse page (data + browse + dialog + CRUD)
  // ---------------------------------------------------------------------------

  const {
    items, filteredItems, browseState, viewMode,
    createOpen, viewOpen, viewingItem, openDetail,
    canPrev, canNext, navPrev, navNext,
    handleCreate, handleUpdate, handleDelete,
  } = useBrowsePage({
    entityType: 'person',
    searchFields: ['title', 'description', 'email', 'organization', 'jobTitle'],
    defaultViewMode: 'grid',
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
          { value: 'health', label: 'Health' },
        ],
        fn: (item: any, val: string) => item.category === val,
      },
    ],
  })

  // ---------------------------------------------------------------------------
  // Stats (type-specific — stays in page)
  // ---------------------------------------------------------------------------

  const stats = computed<PageStat[]>(() => [
    { label: 'People', value: items.value.length, icon: 'lucide:users' },
    { label: 'Work', value: items.value.filter((p: any) => p.category === 'work').length, icon: 'lucide:briefcase', color: 'text-blue-500' },
    { label: 'Personal', value: items.value.filter((p: any) => p.category === 'personal').length, icon: 'lucide:user', color: 'text-emerald-500' },
  ])

  // ---------------------------------------------------------------------------
  // UI helpers (type-specific — stays in page)
  // ---------------------------------------------------------------------------

  const categoryColors: Record<string, string> = {
    work: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    personal: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    health: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
  }

  function getInitials(name: string): string {
    return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
  }

  const taskOwners = [{ id: 'you', name: 'You' }, { id: 'alex', name: 'Alex' }, { id: 'maya', name: 'Maya' }]
</script>

<template>
  <Page
    variant="browse"
    title="People"
    subtitle="Personal"
    description="Contacts and collaborators."
    icon="lucide:users"
    icon-class="text-pink-300"
    search-placeholder="Search people..."
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
        Add Person
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
            <div class="h-10 w-10 rounded-full bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center text-pink-600 dark:text-pink-400 text-sm font-semibold shrink-0">
              {{ getInitials(item.title) }}
            </div>
            <div class="min-w-0 flex-1">
              <UiCardTitle class="text-base line-clamp-1">{{ item.title }}</UiCardTitle>
              <p v-if="(item as any).jobTitle" class="text-xs text-muted-foreground truncate">{{ (item as any).jobTitle }}</p>
              <p v-if="(item as any).organization" class="text-xs text-muted-foreground/70 truncate">{{ (item as any).organization }}</p>
            </div>
          </div>
        </UiCardHeader>
        <UiCardContent class="pt-0 space-y-2">
          <p v-if="item.description" class="text-sm text-muted-foreground line-clamp-2">{{ item.description }}</p>
          <div class="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
            <span v-if="(item as any).email" class="flex items-center gap-1 truncate">
              <Icon name="lucide:mail" class="h-3 w-3 shrink-0" />
              {{ (item as any).email }}
            </span>
          </div>
          <div class="flex items-center justify-between text-xs text-muted-foreground border-t border-border pt-2">
            <span :class="['rounded-full px-1.5 py-0.5 text-[10px] font-medium', categoryColors[(item as any).category] || 'bg-muted text-muted-foreground']">
              {{ (item as any).category }}
            </span>
            <div class="flex items-center gap-1">
              <span v-for="tag in (item.tags || []).slice(0, 2)" :key="tag" class="bg-muted px-1.5 py-0.5 rounded text-[10px]">#{{ tag }}</span>
            </div>
          </div>
        </UiCardContent>
      </UiCard>
      <div v-if="!filteredItems.length" class="col-span-full flex flex-col items-center justify-center py-20 text-center">
        <Icon name="lucide:users" class="h-12 w-12 text-muted-foreground/30 mb-4" />
        <h3 class="text-lg font-medium text-foreground mb-1">No people yet</h3>
        <p class="text-sm text-muted-foreground max-w-sm">Add contacts and collaborators to keep track of who you work with.</p>
      </div>
    </div>

    <!-- ================= LIST VIEW ================= -->
    <div v-if="viewMode === 'list'" class="space-y-2">
      <div
        v-for="item in filteredItems"
        :key="item.id"
        class="flex items-center gap-4 rounded-lg border border-border bg-card p-4 hover:bg-muted transition-colors cursor-pointer"
        @click="openDetail(item)">
        <div class="h-10 w-10 rounded-full bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center text-pink-600 dark:text-pink-400 text-sm font-semibold shrink-0">
          {{ getInitials(item.title) }}
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-0.5">
            <p class="font-medium truncate">{{ item.title }}</p>
            <span :class="['rounded-full px-1.5 py-0.5 text-[10px] font-medium shrink-0', categoryColors[(item as any).category] || 'bg-muted text-muted-foreground']">
              {{ (item as any).category }}
            </span>
          </div>
          <p v-if="(item as any).jobTitle || (item as any).organization" class="text-sm text-muted-foreground truncate">
            {{ [(item as any).jobTitle, (item as any).organization].filter(Boolean).join(' · ') }}
          </p>
        </div>
        <div class="shrink-0 text-right text-xs text-muted-foreground hidden sm:block">
          <p v-if="(item as any).email" class="truncate max-w-[180px]">{{ (item as any).email }}</p>
          <p v-if="(item as any).phone">{{ (item as any).phone }}</p>
        </div>
      </div>
      <div v-if="!filteredItems.length" class="flex flex-col items-center justify-center py-20 text-center">
        <Icon name="lucide:users" class="h-12 w-12 text-muted-foreground/30 mb-4" />
        <h3 class="text-lg font-medium text-foreground mb-1">No people yet</h3>
        <p class="text-sm text-muted-foreground max-w-sm">Add contacts and collaborators to keep track of who you work with.</p>
      </div>
    </div>

    <!-- ================= TABLE VIEW ================= -->
    <div v-if="viewMode === 'table'" class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-border text-left">
            <th class="pb-2 pr-4 font-medium text-muted-foreground">Name</th>
            <th class="pb-2 pr-4 font-medium text-muted-foreground">Title</th>
            <th class="pb-2 pr-4 font-medium text-muted-foreground">Organization</th>
            <th class="pb-2 pr-4 font-medium text-muted-foreground">Email</th>
            <th class="pb-2 pr-4 font-medium text-muted-foreground">Category</th>
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
                <div class="h-7 w-7 rounded-full bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center text-pink-600 dark:text-pink-400 text-[10px] font-semibold shrink-0">
                  {{ getInitials(item.title) }}
                </div>
                <span class="font-medium truncate">{{ item.title }}</span>
              </div>
            </td>
            <td class="py-2.5 pr-4 text-muted-foreground truncate max-w-[150px]">{{ (item as any).jobTitle || '—' }}</td>
            <td class="py-2.5 pr-4 text-muted-foreground truncate max-w-[150px]">{{ (item as any).organization || '—' }}</td>
            <td class="py-2.5 pr-4 text-muted-foreground truncate max-w-[200px]">{{ (item as any).email || '—' }}</td>
            <td class="py-2.5 pr-4">
              <span :class="['rounded-full px-1.5 py-0.5 text-[10px] font-medium', categoryColors[(item as any).category] || 'bg-muted text-muted-foreground']">
                {{ (item as any).category }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-if="!filteredItems.length" class="flex flex-col items-center justify-center py-20 text-center">
        <Icon name="lucide:users" class="h-12 w-12 text-muted-foreground/30 mb-4" />
        <h3 class="text-lg font-medium text-foreground mb-1">No people yet</h3>
        <p class="text-sm text-muted-foreground max-w-sm">Add contacts and collaborators to keep track of who you work with.</p>
      </div>
    </div>

    <!-- Results count -->
    <div class="text-xs text-muted-foreground mt-4 pt-4 border-t border-border pb-10">
      Showing {{ filteredItems.length }} {{ filteredItems.length === 1 ? 'person' : 'people' }}
    </div>

    <!-- View/Edit Dialog -->
    <PersonDialog
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
    <PersonDialog
      v-model:open="createOpen"
      mode="create"
      :item="null"
      :owners="taskOwners"
      @save="handleCreate"
      @close="createOpen = false" />
  </Page>
</template>
