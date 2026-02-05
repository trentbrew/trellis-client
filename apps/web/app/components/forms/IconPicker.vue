<script setup lang="ts">
  interface Icon {
    name: string
    tags: string[]
    categories?: string[]
  }

  interface Category {
    name: string
    icons: Icon[]
  }

  interface IconData {
    icons: Icon[]
    categories: Category[]
    totalCount: number
  }

  // Lazy load icon data
  const lucideIcons = ref<IconData>({ icons: [], categories: [], totalCount: 0 })

  onMounted(async () => {
    try {
      const data = await import('~/data/lucide-icons.json')
      lucideIcons.value = (data.default || data) as IconData
    } catch (error) {
      console.warn('Failed to load lucide-icons.json. Run: tsx scripts/generate-lucide-icons.ts', error)
    }
  })

  interface Props {
    modelValue?: string
    open?: boolean
  }

  const props = withDefaults(defineProps<Props>(), {
    modelValue: '',
    open: false,
  })

  const emit = defineEmits<{
    'update:modelValue': [value: string]
    'update:open': [open: boolean]
  }>()

  const { getRecentlyUsed, addRecentlyUsed } = useRecentlyUsedIcons()
  const { getFavorites, toggleFavorite, isFavorite } = useFavoriteIcons()

  const searchQuery = ref('')
  const debouncedSearchQuery = ref('')
  const selectedCategories = ref<string[]>([])
  const activeTab = ref<'icons' | 'emoji' | 'upload'>('icons')

  // Debounce search for performance (200ms delay)
  const debouncedSearch = useDebounceFn((value: string) => {
    debouncedSearchQuery.value = value
  }, 200)

  watch(searchQuery, (newValue) => {
    debouncedSearch(newValue)
  })

  // Lazy loading: only show a batch of icons at a time
  const initialBatchSize = 200
  const batchSize = 100
  const visibleIconCount = ref(initialBatchSize)
  const scrollContainer = ref<HTMLElement | null>(null)

  const isOpen = computed({
    get: () => props.open,
    set: (value) => emit('update:open', value),
  })

  const allIcons = computed(() => lucideIcons.value.icons)
  const categories = computed(() => lucideIcons.value.categories)
  const recentlyUsed = computed(() => getRecentlyUsed())

  const favorites = computed(() => getFavorites())

  const filteredIcons = computed(() => {
    let icons = allIcons.value

    // Filter by categories (multiple selection)
    if (selectedCategories.value.length > 0) {
      const categoryIcons = new Set<string>()
      selectedCategories.value.forEach((categoryName) => {
        const category = categories.value.find((c) => c.name === categoryName)
        if (category) {
          category.icons.forEach((icon) => categoryIcons.add(icon.name))
        }
      })
      icons = icons.filter((icon) => categoryIcons.has(icon.name))
    }

    // Filter by search query (use debounced version)
    if (debouncedSearchQuery.value.trim()) {
      const query = debouncedSearchQuery.value.toLowerCase().trim()
      icons = icons.filter((icon) => {
        const name = icon.name.toLowerCase().replace('lucide:', '')
        const matchesName = name.includes(query)
        const matchesTags = icon.tags.some((tag) => tag.toLowerCase().includes(query))
        return matchesName || matchesTags
      })
    }

    return icons
  })

  // Group filtered icons by category for display
  const iconsByCategory = computed(() => {
    // If search is active, show all icons in one "Results" section
    if (debouncedSearchQuery.value.trim()) {
      return [
        {
          name: 'Results',
          icons: filteredIcons.value.slice().sort((a, b) => a.name.localeCompare(b.name)),
        },
      ]
    }

    // If categories are selected, group by those categories
    if (selectedCategories.value.length > 0) {
      const grouped = new Map<string, Icon[]>()

      selectedCategories.value.forEach((categoryName) => {
        const category = categories.value.find((c) => c.name === categoryName)
        if (category) {
          grouped.set(categoryName, category.icons)
        }
      })

      return Array.from(grouped.entries())
        .map(([name, icons]) => ({
          name,
          icons: icons.slice().sort((a, b) => a.name.localeCompare(b.name)),
        }))
        .sort((a, b) => a.name.localeCompare(b.name))
    }

    // Otherwise, show all categories with their icons
    return categories.value.map((category) => ({
      name: category.name,
      icons: category.icons.slice().sort((a, b) => a.name.localeCompare(b.name)),
    }))
  })

  // Visible icons for lazy loading (now per category)
  const visibleIconsByCategory = computed(() => {
    return iconsByCategory.value.map((category) => ({
      ...category,
      visibleIcons: category.icons.slice(0, visibleIconCount.value),
      hasMore: category.icons.length > visibleIconCount.value,
      totalCount: category.icons.length,
    }))
  })

  const hasMoreIcons = computed(() => {
    return visibleIconsByCategory.value.some((cat) => cat.hasMore)
  })

  // Reset visible count when filters change
  watch([filteredIcons, selectedCategories, debouncedSearchQuery], () => {
    visibleIconCount.value = initialBatchSize
    // Scroll to top when filters change
    nextTick(() => {
      if (scrollContainer.value) {
        scrollContainer.value.scrollTop = 0
      }
    })
  })

  // Load more icons on scroll
  const handleScroll = () => {
    if (!scrollContainer.value || !hasMoreIcons.value) return

    const { scrollTop, scrollHeight, clientHeight } = scrollContainer.value
    const threshold = 300 // Load more when 300px from bottom

    if (scrollHeight - scrollTop - clientHeight < threshold) {
      visibleIconCount.value = Math.min(visibleIconCount.value + batchSize, filteredIcons.value.length)
    }
  }

  // Setup scroll listener when container becomes available
  watch(scrollContainer, (container) => {
    if (container && isOpen.value) {
      container.addEventListener('scroll', handleScroll, { passive: true })
    }
  })

  const selectIcon = (icon: string) => {
    addRecentlyUsed(icon)
    emit('update:modelValue', icon)
    emit('update:open', false)
    searchQuery.value = ''
    selectedCategories.value = []
  }

  const toggleCategory = (categoryName: string) => {
    const index = selectedCategories.value.indexOf(categoryName)
    if (index > -1) {
      selectedCategories.value.splice(index, 1)
    } else {
      selectedCategories.value.push(categoryName)
    }
  }

  const removeIcon = () => {
    emit('update:modelValue', '')
    emit('update:open', false)
  }

  const clearSearch = () => {
    searchQuery.value = ''
    debouncedSearchQuery.value = ''
  }

  watch(isOpen, (open) => {
    if (open) {
      searchQuery.value = ''
      debouncedSearchQuery.value = ''
      selectedCategories.value = []
      visibleIconCount.value = initialBatchSize
      activeTab.value = 'icons'
      // Re-attach scroll listener when dialog opens
      nextTick(() => {
        if (scrollContainer.value) {
          scrollContainer.value.addEventListener('scroll', handleScroll, { passive: true })
        }
      })
    } else {
      // Clean up scroll listener when dialog closes
      if (scrollContainer.value) {
        scrollContainer.value.removeEventListener('scroll', handleScroll)
      }
    }
  })
</script>

<template>
  <UiDialog :open="isOpen" @update:open="isOpen = $event">
    <UiDialogContent class="max-w-7xl max-h-[85vh] flex flex-col p-0 overflow-hidden">
      <!-- Header with Tabs -->
      <div class="flex items-center justify-between border-b border-border px-4 py-2 shrink-0 pr-12">
        <div class="flex items-center gap-1">
          <button
            :class="[
              'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
              activeTab === 'icons'
                ? 'bg-background text-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
            ]"
            @click="activeTab = 'icons'">
            Icons
          </button>
          <!-- Emoji and Upload tabs can be added later -->
        </div>
        <UiButton
          v-if="modelValue"
          variant="ghost"
          size="sm"
          class="h-7 text-xs text-muted-foreground hover:text-foreground"
          @click.stop="removeIcon">
          Remove
        </UiButton>
      </div>

      <div class="flex flex-col gap-4 min-h-0 flex-1 p-4 overflow-hidden">
        <!-- Search -->
        <div class="relative shrink-0">
          <Icon name="lucide:search" class="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
          <UiInput v-model="searchQuery" placeholder="Filter..." class="pl-9 pr-9 h-9" autofocus />
          <button
            v-if="searchQuery"
            type="button"
            class="text-muted-foreground hover:text-foreground absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2"
            @click="clearSearch">
            <Icon name="lucide:x" class="h-4 w-4" />
          </button>
        </div>

        <!-- Category Filter Pills -->
        <div v-if="!debouncedSearchQuery.trim() && activeTab === 'icons'" class="flex flex-wrap gap-1.5 shrink-0">
          <button
            :class="[
              'px-3 py-1 text-xs font-medium rounded-full transition-colors',
              selectedCategories.length === 0
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80',
            ]"
            @click="selectedCategories = []">
            All
          </button>
          <button
            v-for="category in categories"
            :key="category.name"
            :class="[
              'px-3 py-1 text-xs font-medium rounded-full transition-colors',
              selectedCategories.includes(category.name)
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80',
            ]"
            @click="toggleCategory(category.name)">
            {{ category.name }}
          </button>
        </div>

        <!-- Favorites -->
        <div
          v-if="
            favorites.length > 0 &&
            !debouncedSearchQuery.trim() &&
            selectedCategories.length === 0 &&
            activeTab === 'icons'
          "
          class="space-y-3 shrink-0">
          <div class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Favorites</div>
          <div class="grid grid-cols-10 gap-1">
            <div
              v-for="icon in favorites"
              :key="icon"
              role="button"
              tabindex="0"
              class="group relative hover:bg-muted flex h-9 w-9 items-center justify-center rounded transition-colors cursor-pointer"
              :class="{ 'bg-muted ring-2 ring-primary': modelValue === icon }"
              @click="selectIcon(icon)"
              @keydown.enter="selectIcon(icon)"
              @keydown.space.prevent="selectIcon(icon)">
              <Icon :name="icon" class="h-4 w-4" />
              <button
                type="button"
                class="absolute -right-1 -top-1 hidden h-4 w-4 items-center justify-center rounded-full bg-background border border-border hover:bg-destructive hover:text-destructive-foreground group-hover:flex"
                @click.stop="toggleFavorite(icon)">
                <Icon name="lucide:star" class="h-2.5 w-2.5 fill-yellow-500 text-yellow-500" />
              </button>
            </div>
          </div>
        </div>

        <!-- Recently Used -->
        <div
          v-if="
            recentlyUsed.length > 0 &&
            !debouncedSearchQuery.trim() &&
            selectedCategories.length === 0 &&
            activeTab === 'icons'
          "
          class="space-y-3 shrink-0">
          <div class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Recent</div>
          <div class="grid grid-cols-10 gap-1">
            <div
              v-for="icon in recentlyUsed"
              :key="icon"
              role="button"
              tabindex="0"
              class="group relative hover:bg-muted flex h-9 w-9 items-center justify-center rounded transition-colors cursor-pointer"
              :class="{ 'bg-muted ring-2 ring-primary': modelValue === icon }"
              @click="selectIcon(icon)"
              @keydown.enter="selectIcon(icon)"
              @keydown.space.prevent="selectIcon(icon)">
              <Icon :name="icon" class="h-4 w-4" />
              <button
                type="button"
                :class="[
                  'absolute -right-1 -top-1 h-4 w-4 items-center justify-center rounded-full bg-background border border-border transition-colors',
                  isFavorite(icon)
                    ? 'flex hover:bg-destructive hover:text-destructive-foreground'
                    : 'hidden group-hover:flex hover:bg-muted',
                ]"
                @click.stop="toggleFavorite(icon)">
                <Icon
                  :name="isFavorite(icon) ? 'lucide:star' : 'lucide:star'"
                  :class="[
                    'h-2.5 w-2.5',
                    isFavorite(icon) ? 'fill-yellow-500 text-yellow-500' : 'text-muted-foreground',
                  ]" />
              </button>
            </div>
          </div>
        </div>

        <!-- Icon Grid by Category -->
        <div v-if="activeTab === 'icons'" ref="scrollContainer" class="flex-1 overflow-auto min-h-0">
          <template v-if="visibleIconsByCategory.length > 0">
            <div v-for="category in visibleIconsByCategory" :key="category.name" class="space-y-3 mb-6">
              <div
                class="text-xs font-semibold uppercase tracking-wide text-muted-foreground sticky top-0 bg-background py-2 z-10">
                {{ category.name }}
              </div>
              <div class="grid grid-cols-10 gap-1">
                <div
                  v-for="icon in category.visibleIcons"
                  :key="icon.name"
                  role="button"
                  tabindex="0"
                  class="group relative hover:bg-muted flex h-9 w-9 items-center justify-center rounded transition-colors cursor-pointer"
                  :class="{ 'bg-muted ring-2 ring-primary': modelValue === icon.name }"
                  :title="icon.name.replace('lucide:', '')"
                  @click="selectIcon(icon.name)"
                  @keydown.enter="selectIcon(icon.name)"
                  @keydown.space.prevent="selectIcon(icon.name)">
                  <Icon :name="icon.name" class="h-4 w-4" />
                  <button
                    type="button"
                    :class="[
                      'absolute -right-1 -top-1 h-4 w-4 items-center justify-center rounded-full bg-background border border-border transition-colors',
                      isFavorite(icon.name)
                        ? 'flex hover:bg-destructive hover:text-destructive-foreground'
                        : 'hidden group-hover:flex hover:bg-muted',
                    ]"
                    @click.stop="toggleFavorite(icon.name)">
                    <Icon
                      :name="'lucide:star'"
                      :class="[
                        'h-2.5 w-2.5',
                        isFavorite(icon.name) ? 'fill-yellow-500 text-yellow-500' : 'text-muted-foreground',
                      ]" />
                  </button>
                </div>
              </div>
              <div v-if="category.hasMore" class="py-2 text-center text-xs text-muted-foreground">
                Showing {{ category.visibleIcons.length }} of {{ category.totalCount }} icons
              </div>
            </div>
          </template>
          <div v-else class="py-12 text-center text-muted-foreground">
            <div v-if="allIcons.length === 0" class="space-y-2">
              <p class="text-sm">No icons loaded.</p>
              <p class="text-xs">
                Run
                <code class="bg-muted px-1 py-0.5 rounded">npm run generate:icons</code>
                to generate the icon list.
              </p>
            </div>
            <div v-else>No icons found matching "{{ debouncedSearchQuery }}"</div>
          </div>
        </div>
      </div>
    </UiDialogContent>
  </UiDialog>
</template>
