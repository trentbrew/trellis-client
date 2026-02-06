<script setup lang="ts">
  const graph = useTrellisGraph()

  const health = ref<{ status: string; factCount: number; linkCount: number } | null>(null)
  const entityBreakdown = ref<{ type: string; count: number }[]>([])
  const ontologies = ref<Record<string, any>>({})
  const projections = ref<string[]>([])
  const loading = ref(true)

  const fetchDashboard = async () => {
    loading.value = true
    try {
      const [healthData, ontData, projData] = await Promise.all([
        graph.health(),
        $fetch<{ ontologies: Record<string, any> }>('/api/graph/ontologies'),
        $fetch<{ projections: string[] }>('/api/graph/projections'),
      ])

      health.value = healthData
      ontologies.value = ontData.ontologies || {}
      projections.value = projData.projections || []

      // Get entity type breakdown
      const result = await graph.queryOnce('FIND ?type AS ?t')
      const typeCounts = new Map<string, number>()
      for (const row of result.data) {
        const t = String((row as any)['?t'] || 'unknown')
        typeCounts.set(t, (typeCounts.get(t) || 0) + 1)
      }
      entityBreakdown.value = Array.from(typeCounts.entries())
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count)
    } catch (err) {
      console.error('[graph/dashboard] fetch error:', err)
    } finally {
      loading.value = false
    }
  }

  onMounted(fetchDashboard)
</script>

<template>
  <Page
    variant="settings"
    title="Graph Dashboard"
    subtitle="Developer"
    description="TQL graph engine health, entity counts, and ontology summary."
    icon="lucide:gauge">
    <div v-if="loading" class="flex items-center justify-center py-20">
      <Icon name="lucide:loader-2" class="h-6 w-6 animate-spin text-muted-foreground" />
    </div>

    <div v-else class="space-y-6">
      <!-- Health -->
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <UiCard>
          <UiCardContent class="p-4">
            <div class="flex items-center gap-3">
              <div class="flex size-10 items-center justify-center rounded-lg" :class="health?.status === 'ok' ? 'bg-emerald-500/10' : 'bg-destructive/10'">
                <Icon :name="health?.status === 'ok' ? 'lucide:check-circle' : 'lucide:alert-circle'" class="size-5" :class="health?.status === 'ok' ? 'text-emerald-500' : 'text-destructive'" />
              </div>
              <div>
                <p class="text-sm font-medium text-muted-foreground">Status</p>
                <p class="text-2xl font-bold capitalize">{{ health?.status || '—' }}</p>
              </div>
            </div>
          </UiCardContent>
        </UiCard>

        <UiCard>
          <UiCardContent class="p-4">
            <div class="flex items-center gap-3">
              <div class="bg-cyan-500/10 flex size-10 items-center justify-center rounded-lg">
                <Icon name="lucide:database" class="size-5 text-cyan-500" />
              </div>
              <div>
                <p class="text-sm font-medium text-muted-foreground">Facts</p>
                <p class="text-2xl font-bold">{{ health?.factCount?.toLocaleString() || '0' }}</p>
              </div>
            </div>
          </UiCardContent>
        </UiCard>

        <UiCard>
          <UiCardContent class="p-4">
            <div class="flex items-center gap-3">
              <div class="bg-violet-500/10 flex size-10 items-center justify-center rounded-lg">
                <Icon name="lucide:link" class="size-5 text-violet-500" />
              </div>
              <div>
                <p class="text-sm font-medium text-muted-foreground">Links</p>
                <p class="text-2xl font-bold">{{ health?.linkCount?.toLocaleString() || '0' }}</p>
              </div>
            </div>
          </UiCardContent>
        </UiCard>
      </div>

      <!-- Entity Breakdown -->
      <UiCard>
        <UiCardContent class="p-0">
          <div class="border-b border-border px-4 py-3">
            <h3 class="text-sm font-semibold">Entity Breakdown</h3>
            <p class="text-xs text-muted-foreground">Count of entities by type in the graph</p>
          </div>
          <div v-if="entityBreakdown.length === 0" class="px-4 py-8 text-center text-sm text-muted-foreground">
            No entities found
          </div>
          <div v-else class="divide-y divide-border">
            <div v-for="item in entityBreakdown" :key="item.type" class="flex items-center justify-between px-4 py-2.5">
              <div class="flex items-center gap-2">
                <span class="inline-flex size-2 rounded-full bg-cyan-500" />
                <span class="text-sm font-medium">{{ item.type }}</span>
              </div>
              <span class="text-sm font-mono text-muted-foreground">{{ item.count }}</span>
            </div>
          </div>
        </UiCardContent>
      </UiCard>

      <!-- Quick Links -->
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <UiCard>
          <UiCardContent class="p-4">
            <div class="border-b border-border pb-3 mb-3">
              <h3 class="text-sm font-semibold">Ontologies</h3>
              <p class="text-xs text-muted-foreground">{{ Object.keys(ontologies).length }} registered</p>
            </div>
            <div v-if="Object.keys(ontologies).length === 0" class="text-sm text-muted-foreground">None registered</div>
            <div v-else class="space-y-1">
              <div v-for="(schema, name) in ontologies" :key="String(name)" class="flex items-center gap-2 text-sm">
                <Icon name="lucide:blocks" class="size-3.5 text-amber-500" />
                <span class="font-mono text-xs">{{ name }}</span>
              </div>
            </div>
          </UiCardContent>
        </UiCard>

        <UiCard>
          <UiCardContent class="p-4">
            <div class="border-b border-border pb-3 mb-3">
              <h3 class="text-sm font-semibold">Projections</h3>
              <p class="text-xs text-muted-foreground">{{ projections.length }} named projections</p>
            </div>
            <div v-if="projections.length === 0" class="text-sm text-muted-foreground">None registered</div>
            <div v-else class="space-y-1">
              <div v-for="proj in projections" :key="proj" class="flex items-center gap-2 text-sm">
                <Icon name="lucide:terminal" class="size-3.5 text-violet-500" />
                <span class="font-mono text-xs">{{ proj }}</span>
              </div>
            </div>
          </UiCardContent>
        </UiCard>
      </div>

      <!-- Navigation -->
      <div class="flex flex-wrap gap-2">
        <UiButton variant="outline" size="sm" as-child>
          <NuxtLink to="/graph/explorer">
            <Icon name="lucide:search" class="mr-1.5 size-3.5" />
            Explorer
          </NuxtLink>
        </UiButton>
        <UiButton variant="outline" size="sm" as-child>
          <NuxtLink to="/graph/query">
            <Icon name="lucide:terminal" class="mr-1.5 size-3.5" />
            Query Console
          </NuxtLink>
        </UiButton>
        <UiButton variant="outline" size="sm" as-child>
          <NuxtLink to="/graph/ontology">
            <Icon name="lucide:blocks" class="mr-1.5 size-3.5" />
            Ontology
          </NuxtLink>
        </UiButton>
        <UiButton variant="outline" size="sm" as-child>
          <NuxtLink to="/graph/activity">
            <Icon name="lucide:scroll-text" class="mr-1.5 size-3.5" />
            Activity Log
          </NuxtLink>
        </UiButton>
      </div>
    </div>
  </Page>
</template>
