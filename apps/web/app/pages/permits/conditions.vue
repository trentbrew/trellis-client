<script setup lang="ts">
  const conditions = [
    {
      id: '1',
      code: 'AQ-001',
      title: 'Emission Monitoring Requirements',
      category: 'Air Quality',
      permits: 12,
      status: 'active',
    },
    {
      id: '2',
      code: 'WQ-003',
      title: 'Discharge Limit Compliance',
      category: 'Water Quality',
      permits: 8,
      status: 'active',
    },
    { id: '3', code: 'HW-012', title: 'Hazardous Waste Manifesting', category: 'Waste', permits: 5, status: 'active' },
    {
      id: '4',
      code: 'AQ-015',
      title: 'Stack Testing Protocol',
      category: 'Air Quality',
      permits: 10,
      status: 'active',
    },
    {
      id: '5',
      code: 'SW-002',
      title: 'Stormwater BMP Maintenance',
      category: 'Water Quality',
      permits: 6,
      status: 'under_review',
    },
    {
      id: '6',
      code: 'RP-008',
      title: 'Recordkeeping Requirements',
      category: 'General',
      permits: 18,
      status: 'active',
    },
  ]

  const categories = ['All', 'Air Quality', 'Water Quality', 'Waste', 'General']
  const selectedCategory = ref('All')

  const filteredConditions = computed(() => {
    if (selectedCategory.value === 'All') return conditions
    return conditions.filter((c) => c.category === selectedCategory.value)
  })

  function getCategoryColor(category: string): string {
    const colors: Record<string, string> = {
      'Air Quality': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      'Water Quality': 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
      Waste: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
      General: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
    }
    return colors[category] ?? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
  }
</script>

<template>
  <Page variant="canvas" :fill-height="true">
    <div class="p-6 space-y-6 overflow-y-auto">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold">Conditions Library</h1>
          <p class="text-muted-foreground">Manage permit conditions and requirements</p>
        </div>
        <UiButton>
          <Icon name="lucide:plus" class="mr-2 size-4" />
          Add Condition
        </UiButton>
      </div>

      <!-- Category Filter -->
      <div class="flex items-center gap-2">
        <UiButton
          v-for="cat in categories"
          :key="cat"
          :variant="selectedCategory === cat ? 'default' : 'outline'"
          size="sm"
          @click="selectedCategory = cat">
          {{ cat }}
        </UiButton>
      </div>

      <UiCard>
        <UiCardContent class="p-0">
          <div class="divide-y divide-border">
            <div
              v-for="condition in filteredConditions"
              :key="condition.id"
              class="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors cursor-pointer">
              <div class="flex size-12 items-center justify-center rounded-lg bg-muted">
                <Icon name="lucide:list-tree" class="size-6 text-muted-foreground" />
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-1">
                  <code class="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">{{ condition.code }}</code>
                  <h3 class="font-medium">{{ condition.title }}</h3>
                </div>
                <div class="flex items-center gap-3 mt-1">
                  <span :class="['text-xs px-2 py-0.5 rounded-full', getCategoryColor(condition.category)]">
                    {{ condition.category }}
                  </span>
                  <span class="text-sm text-muted-foreground">Used in {{ condition.permits }} permits</span>
                </div>
              </div>
              <UiBadge :variant="condition.status === 'active' ? 'default' : 'secondary'" class="capitalize">
                {{ condition.status.replace('_', ' ') }}
              </UiBadge>
              <UiButton variant="ghost" size="sm">
                <Icon name="lucide:arrow-right" class="size-4" />
              </UiButton>
            </div>
          </div>
        </UiCardContent>
      </UiCard>
    </div>
  </Page>
</template>
