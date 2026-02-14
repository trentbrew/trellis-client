<script setup lang="ts">
  import type { PageStat } from '~/components/layout/Page.vue'
  import { useBrowsePage } from '~/composables/useBrowsePage'

  definePageMeta({ layout: 'default' })
  useHead({ title: 'People | Personal' })

  // ---------------------------------------------------------------------------
  // Browse page (data + browse + dialog + CRUD)
  // ---------------------------------------------------------------------------

  const {
    items, filteredItems, browseState, viewMode,
    viewOpen, viewingItem, openDetail, handleNewItem,
    canPrev, canNext, navPrev, navNext,
    handleUpdate, handleDelete,
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
    data-source="person"
    description="Contacts and collaborators."
    icon="lucide:users"
    icon-class="text-pink-300"
    search-placeholder="Search people..."
    :stats="stats"
    :show-view-switcher="true"
    :fill-height="true"
    :browse="browseState"
    :view-mode-options="[
      { mode: 'grid', label: 'Grid', icon: 'lucide:grid-3x3' },
      { mode: 'list', label: 'List', icon: 'lucide:list' },
      { mode: 'table', label: 'Table', icon: 'lucide:table' },
    ]">

    <!-- Toolbar Actions -->
    <template #toolbarActions>
      <UiButton @click="handleNewItem()">
        <Icon name="lucide:plus" class="mr-2 h-4 w-4" />
        Add Person
      </UiButton>
    </template>

    <!-- ================= GRID VIEW ================= -->
    <div v-if="viewMode === 'grid' || !['grid', 'list', 'table'].includes(viewMode)" class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      <EntityCard
        v-for="item in filteredItems"
        :key="item.id"
        :item="item"
        layout="grid"
        @click="openDetail(item)" />
      <div v-if="!filteredItems.length" class="col-span-full flex flex-col items-center justify-center py-20 text-center">
        <Icon name="lucide:users" class="h-12 w-12 text-muted-foreground/30 mb-4" />
        <h3 class="text-lg font-medium text-foreground mb-1">No people yet</h3>
        <p class="text-sm text-muted-foreground max-w-sm">Add contacts and collaborators to keep track of who you work with.</p>
      </div>
    </div>

    <!-- ================= LIST VIEW ================= -->
    <div v-else-if="viewMode === 'list'" class="flex flex-col gap-2">
      <EntityCard
        v-for="item in filteredItems"
        :key="item.id"
        :item="item"
        layout="list"
        @click="openDetail(item)" />
      <div v-if="!filteredItems.length" class="flex flex-col items-center justify-center py-20 text-center">
        <Icon name="lucide:users" class="h-12 w-12 text-muted-foreground/30 mb-4" />
        <h3 class="text-lg font-medium text-foreground mb-1">No people yet</h3>
        <p class="text-sm text-muted-foreground max-w-sm">Add contacts and collaborators to keep track of who you work with.</p>
      </div>
    </div>

    <!-- ================= TABLE VIEW ================= -->
    <div v-else-if="viewMode === 'table'" class="overflow-x-auto">
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

  </Page>
</template>
