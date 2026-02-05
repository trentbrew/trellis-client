<script setup lang="ts">
  const permits = [
    {
      id: '1',
      name: 'Air Quality Operating Permit',
      facility: 'Texas Steel Mill',
      type: 'Title V',
      conditionsCount: 45,
      indexed: 42,
      lastUpdated: '2024-12-01',
    },
    {
      id: '2',
      name: 'NPDES Discharge Permit',
      facility: 'Indiana Bar Mill',
      type: 'Water',
      conditionsCount: 28,
      indexed: 28,
      lastUpdated: '2024-11-28',
    },
    {
      id: '3',
      name: 'Hazardous Waste Permit',
      facility: 'Arkansas Sheet Mill',
      type: 'RCRA',
      conditionsCount: 32,
      indexed: 15,
      lastUpdated: '2024-12-05',
    },
    {
      id: '4',
      name: 'Stormwater Permit',
      facility: 'Utah Plate Mill',
      type: 'Water',
      conditionsCount: 18,
      indexed: 18,
      lastUpdated: '2024-11-20',
    },
    {
      id: '5',
      name: 'Title V Operating Permit',
      facility: 'Carolina Rebar',
      type: 'Title V',
      conditionsCount: 56,
      indexed: 30,
      lastUpdated: '2024-12-03',
    },
  ]

  function getProgressPercent(indexed: number, total: number): number {
    return Math.round((indexed / total) * 100)
  }

  function getProgressColor(percent: number): string {
    if (percent === 100) return 'bg-green-500'
    if (percent >= 75) return 'bg-blue-500'
    if (percent >= 50) return 'bg-amber-500'
    return 'bg-rose-500'
  }
</script>

<template>
  <Page variant="canvas" :fill-height="true">
    <div class="p-6 space-y-6 overflow-y-auto">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold">Permit Indexing</h1>
          <p class="text-muted-foreground">Review permits and annotate conditions</p>
        </div>
        <div class="flex items-center gap-2">
          <UiButton variant="outline">
            <Icon name="lucide:filter" class="mr-2 size-4" />
            Filter
          </UiButton>
          <UiButton>
            <Icon name="lucide:upload" class="mr-2 size-4" />
            Upload Permit
          </UiButton>
        </div>
      </div>

      <UiCard>
        <UiCardContent class="p-0">
          <div class="divide-y divide-border">
            <div
              v-for="permit in permits"
              :key="permit.id"
              class="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors cursor-pointer">
              <div class="flex size-12 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-900/30">
                <Icon name="lucide:file-text" class="size-6 text-violet-600 dark:text-violet-400" />
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-1">
                  <h3 class="font-medium">{{ permit.name }}</h3>
                  <UiBadge variant="outline" class="text-xs">{{ permit.type }}</UiBadge>
                </div>
                <p class="text-sm text-muted-foreground">{{ permit.facility }} · Updated {{ permit.lastUpdated }}</p>
              </div>
              <div class="flex items-center gap-4">
                <div class="text-right">
                  <p class="text-sm font-medium">{{ permit.indexed }}/{{ permit.conditionsCount }}</p>
                  <p class="text-xs text-muted-foreground">conditions indexed</p>
                </div>
                <div class="w-24">
                  <div class="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      :class="getProgressColor(getProgressPercent(permit.indexed, permit.conditionsCount))"
                      class="h-full transition-all"
                      :style="{ width: `${getProgressPercent(permit.indexed, permit.conditionsCount)}%` }" />
                  </div>
                  <p class="text-xs text-muted-foreground text-center mt-1">
                    {{ getProgressPercent(permit.indexed, permit.conditionsCount) }}%
                  </p>
                </div>
                <UiButton variant="ghost" size="sm">
                  <Icon name="lucide:arrow-right" class="size-4" />
                </UiButton>
              </div>
            </div>
          </div>
        </UiCardContent>
      </UiCard>
    </div>
  </Page>
</template>
