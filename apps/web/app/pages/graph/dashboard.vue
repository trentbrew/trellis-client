<script setup lang="ts">
  import { entityQuery } from '~/lib/tql-namespace'

  const graph = useTrellisGraph()

  const health = ref<{ status: string; factCount: number; linkCount: number } | null>(null)
  const entityBreakdown = ref<{ type: string; count: number }[]>([])
  const ontologies = ref<Record<string, any>>({})
  const projections = ref<{ name: string; query: string; type: string }[]>([])
  const loading = ref(true)

  const navLinks = [
    { to: '/graph/explorer', icon: 'lucide:search', label: 'Explorer' },
    { to: '/graph/query', icon: 'lucide:terminal', label: 'Query Console' },
    { to: '/graph/ontology', icon: 'lucide:blocks', label: 'Ontology' },
    { to: '/graph/activity', icon: 'lucide:scroll-text', label: 'Activity Log' },
  ]

  const healthStats = computed(() => {
    if (!health.value) return []
    const h = health.value
    return [
      {
        label: 'Status',
        value: h.status === 'ok' ? 'Ok' : h.status || '—',
        icon: h.status === 'ok' ? 'lucide:check-circle' : 'lucide:alert-circle',
        color: h.status === 'ok' ? 'text-emerald-500' : 'text-destructive',
      },
      {
        label: 'Facts',
        value: h.factCount?.toLocaleString() ?? '0',
        icon: 'lucide:database',
        color: 'text-cyan-500',
      },
      {
        label: 'Links',
        value: h.linkCount?.toLocaleString() ?? '0',
        icon: 'lucide:link',
        color: 'text-violet-500',
      },
    ]
  })

  const fetchDashboard = async () => {
    loading.value = true
    try {
      const [healthData, ontData, projData] = await Promise.all([
        graph.health(),
        $fetch<{ ontologies: Record<string, any> }>('/api/graph/ontologies'),
        $fetch<{ projections: any[] }>('/api/graph/projections'),
      ])

      health.value = healthData
      ontologies.value = ontData.ontologies || {}
      projections.value = (projData.projections || []).map((p: any) => ({
        name: p.name || p['@id'] || String(p),
        query: p.query || '',
        type: p.type || '',
      }))

      // Get entity type breakdown by fetching all entities and counting types
      const result = await graph.queryOnce(entityQuery('?e'))
      const ids = result.data.map((row) => String((row as any)['?e']))
      if (ids.length > 0) {
        const nodes = await graph.fetchNodes(ids)
        const typeCounts = new Map<string, number>()
        for (const node of nodes) {
          const t = String(node['@type'] || node.type || 'unknown')
          typeCounts.set(t, (typeCounts.get(t) || 0) + 1)
        }
        entityBreakdown.value = Array.from(typeCounts.entries())
          .map(([type, count]) => ({ type, count }))
          .sort((a, b) => b.count - a.count)
      }
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
    icon="lucide:gauge"
    :stats="healthStats"
    :is-loading="loading"
    count-label="data">
    <div class="space-y-4">
      <!-- Navigation -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
        <NuxtLink
          v-for="link in navLinks"
          :key="link.to"
          :to="link.to"
          class="flex items-center justify-center gap-2 py-6 px-4 rounded-lg border border-border bg-card hover:bg-accent hover:border-primary/50 transition-all group">
          <Icon :name="link.icon" class="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
          <span class="text-sm font-medium">{{ link.label }}</span>
          <Icon name="lucide:arrow-up-right" class="size-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
        </NuxtLink>
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
              <div v-for="proj in projections" :key="proj.name" class="flex items-center gap-2 text-sm">
                <Icon name="lucide:terminal" class="size-3.5 text-violet-500" />
                <span class="font-mono text-xs">{{ proj.name }}</span>
              </div>
            </div>
          </UiCardContent>
        </UiCard>
      </div>

    </div>
  </Page>
</template>
