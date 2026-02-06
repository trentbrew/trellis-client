<script setup lang="ts">
  const graph = useTrellisGraph()

  const queryText = ref('FIND calendaritem AS ?e')
  const results = ref<Record<string, unknown>[]>([])
  const meta = ref<{ executionTime?: number; plan?: string; trace?: unknown[] } | null>(null)
  const error = ref<string | null>(null)
  const isRunning = ref(false)
  const projectionsList = ref<string[]>([])

  const presets = [
    { label: 'All entities', query: 'FIND calendaritem AS ?e' },
    { label: 'Tasks only', query: 'FIND calendaritem AS ?t WHERE ?t.type = "task"' },
    { label: 'Events only', query: 'FIND calendaritem AS ?t WHERE ?t.type = "event"' },
    { label: 'Notes only', query: 'FIND calendaritem AS ?t WHERE ?t.type = "note"' },
    { label: 'Payments only', query: 'FIND calendaritem AS ?t WHERE ?t.type = "payment"' },
    { label: 'High priority', query: 'FIND calendaritem AS ?t WHERE ?t.priority = "high"' },
  ]

  const executeQuery = async () => {
    isRunning.value = true
    error.value = null
    meta.value = null
    results.value = []

    try {
      const result = await graph.queryOnce(queryText.value.trim())
      results.value = result.data
      meta.value = result.meta || null
    } catch (err: any) {
      error.value = err?.data?.message || err?.message || 'Query execution failed'
    } finally {
      isRunning.value = false
    }
  }

  const executeProjection = async (projId: string) => {
    isRunning.value = true
    error.value = null
    meta.value = null
    results.value = []
    queryText.value = `-- projection: ${projId}`

    try {
      const result = await $fetch<{ data: Record<string, unknown>[]; meta?: any }>('/api/graph/query', {
        method: 'POST',
        body: { projection: projId },
      })
      results.value = result.data
      meta.value = result.meta || null
    } catch (err: any) {
      error.value = err?.data?.message || err?.message || 'Projection execution failed'
    } finally {
      isRunning.value = false
    }
  }

  const resultColumns = computed(() => {
    if (results.value.length === 0) return []
    const keys = new Set<string>()
    for (const row of results.value) {
      for (const key of Object.keys(row)) keys.add(key)
    }
    return Array.from(keys)
  })

  onMounted(async () => {
    try {
      const data = await $fetch<{ projections: string[] }>('/api/graph/projections')
      projectionsList.value = data.projections || []
    } catch {
      // ignore
    }
  })
</script>

<template>
  <Page
    variant="settings"
    title="Query Console"
    subtitle="Developer"
    description="Execute EQL-S queries against the TQL graph engine."
    icon="lucide:terminal">
    <div class="space-y-4">
      <!-- Query Input -->
      <UiCard>
        <UiCardContent class="p-4 space-y-3">
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-semibold">EQL-S Query</h3>
            <div class="flex items-center gap-2">
              <select
                class="h-8 rounded-md border border-input bg-background px-2 text-xs ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                @change="(e: Event) => { const v = (e.target as HTMLSelectElement).value; if (v) { queryText = v; (e.target as HTMLSelectElement).selectedIndex = 0 } }">
                <option value="">Presets...</option>
                <option v-for="p in presets" :key="p.label" :value="p.query">{{ p.label }}</option>
              </select>
            </div>
          </div>
          <textarea
            v-model="queryText"
            rows="3"
            class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-y"
            placeholder="FIND calendaritem AS ?e"
            @keydown.meta.enter="executeQuery"
            @keydown.ctrl.enter="executeQuery" />
          <div class="flex items-center justify-between">
            <p class="text-[10px] text-muted-foreground">Press <kbd class="rounded border px-1 py-0.5 text-[10px]">Cmd+Enter</kbd> to run</p>
            <UiButton size="sm" :disabled="isRunning || !queryText.trim()" @click="executeQuery">
              <Icon v-if="isRunning" name="lucide:loader-2" class="mr-1.5 size-3.5 animate-spin" />
              <Icon v-else name="lucide:play" class="mr-1.5 size-3.5" />
              {{ isRunning ? 'Running...' : 'Execute' }}
            </UiButton>
          </div>
        </UiCardContent>
      </UiCard>

      <!-- Named Projections -->
      <UiCard v-if="projectionsList.length > 0">
        <UiCardContent class="p-4">
          <h3 class="text-sm font-semibold mb-2">Named Projections</h3>
          <div class="flex flex-wrap gap-2">
            <UiButton
              v-for="proj in projectionsList"
              :key="proj"
              variant="outline"
              size="sm"
              :disabled="isRunning"
              @click="executeProjection(proj)">
              <Icon name="lucide:zap" class="mr-1 size-3" />
              {{ proj }}
            </UiButton>
          </div>
        </UiCardContent>
      </UiCard>

      <!-- Error -->
      <UiCard v-if="error" class="border-destructive">
        <UiCardContent class="p-4">
          <div class="flex items-start gap-2">
            <Icon name="lucide:alert-circle" class="size-4 text-destructive mt-0.5 shrink-0" />
            <div>
              <p class="text-sm font-medium text-destructive">Query Error</p>
              <p class="text-sm text-muted-foreground font-mono mt-1">{{ error }}</p>
            </div>
          </div>
        </UiCardContent>
      </UiCard>

      <!-- Results -->
      <UiCard v-if="results.length > 0 || meta">
        <UiCardContent class="p-0">
          <!-- Meta bar -->
          <div v-if="meta" class="border-b border-border px-4 py-2 flex items-center gap-4 text-[10px] text-muted-foreground font-mono">
            <span>{{ results.length }} rows</span>
            <span v-if="meta.executionTime">{{ meta.executionTime.toFixed(2) }}ms</span>
            <span v-if="meta.plan" class="truncate">{{ meta.plan }}</span>
          </div>

          <!-- Data table -->
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-border">
                  <th v-for="col in resultColumns" :key="col" class="px-4 py-2 text-left text-xs font-medium text-muted-foreground">
                    {{ col }}
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-border">
                <tr v-for="(row, i) in results" :key="i" class="hover:bg-muted/50">
                  <td v-for="col in resultColumns" :key="col" class="px-4 py-2 font-mono text-xs">
                    {{ row[col] ?? '' }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Trace -->
          <div v-if="meta?.trace && (meta.trace as any[]).length > 0" class="border-t border-border px-4 py-3">
            <details>
              <summary class="text-xs font-medium text-muted-foreground cursor-pointer">Execution Trace ({{ (meta.trace as any[]).length }} steps)</summary>
              <div class="mt-2 space-y-1">
                <div v-for="(step, i) in (meta.trace as any[])" :key="i" class="text-[10px] font-mono text-muted-foreground">
                  {{ step.goal }} — {{ step.bindingsCount }} bindings ({{ step.durationMs?.toFixed(2) }}ms)
                </div>
              </div>
            </details>
          </div>
        </UiCardContent>
      </UiCard>
    </div>
  </Page>
</template>
