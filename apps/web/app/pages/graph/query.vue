<script setup lang="ts">
  const graph = useTrellisGraph()

  const queryText = ref('FIND calendaritem AS ?e')
  const results = ref<Record<string, unknown>[]>([])
  const meta = ref<{ executionTime?: number; plan?: string; trace?: unknown[] } | null>(null)
  const error = ref<string | null>(null)
  const isRunning = ref(false)
  const projectionsList = ref<{ id: string; name: string; query: string }[]>([])

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

  const executeProjection = async (proj: { id: string; name: string; query: string }) => {
    isRunning.value = true
    error.value = null
    meta.value = null
    results.value = []
    queryText.value = proj.query || `-- projection: ${proj.name}`

    try {
      const result = await $fetch<{ data: Record<string, unknown>[]; meta?: any }>('/api/graph/query', {
        method: 'POST',
        body: { projection: proj.id },
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
      const data = await $fetch<{ projections: any[] }>('/api/graph/projections')
      projectionsList.value = (data.projections || []).map((p: any) => ({
        id: p['@id'] || String(p),
        name: p.name || p['@id'] || String(p),
        query: p.query || '',
      }))
    } catch {
      // ignore
    }
  })
</script>

<template>
  <Page variant="canvas" fill-height>
    <div class="flex h-full flex-col">
      <!-- Compact Toolbar -->
      <div class="shrink-0 flex items-center justify-between border-b border-border bg-card px-4 py-2">
        <div class="flex items-center gap-3">
          <Icon name="lucide:terminal" class="size-4 text-muted-foreground" />
          <h1 class="text-sm font-semibold">Query Console</h1>
          <span class="text-xs text-muted-foreground">EQL-S</span>
        </div>
        <div class="flex items-center gap-2">
          <!-- Named Projections -->
          <template v-if="projectionsList.length > 0">
            <UiButton
              v-for="proj in projectionsList"
              :key="proj.id"
              variant="ghost"
              size="sm"
              :disabled="isRunning"
              class="text-xs"
              @click="executeProjection(proj)">
              <Icon name="lucide:zap" class="mr-1 size-3" />
              {{ proj.name }}
            </UiButton>
          </template>
          <div class="w-px h-5 bg-border" />
          <select
            class="h-7 rounded-md border border-input bg-background px-2 text-xs ring-offset-background focus:outline-none focus:ring-1 focus:ring-ring"
            @change="(e: Event) => { const v = (e.target as HTMLSelectElement).value; if (v) { queryText = v; (e.target as HTMLSelectElement).selectedIndex = 0 } }">
            <option value="">Presets...</option>
            <option v-for="p in presets" :key="p.label" :value="p.query">{{ p.label }}</option>
          </select>
          <UiButton size="sm" :disabled="isRunning || !queryText.trim()" @click="executeQuery">
            <Icon v-if="isRunning" name="lucide:loader-2" class="mr-1.5 size-3.5 animate-spin" />
            <Icon v-else name="lucide:play" class="mr-1.5 size-3.5" />
            {{ isRunning ? 'Running...' : 'Execute' }}
          </UiButton>
        </div>
      </div>

      <!-- Query Input -->
      <div class="shrink-0 border-b border-border">
        <textarea
          v-model="queryText"
          rows="3"
          class="w-full bg-muted/30 px-4 py-3 text-sm font-mono placeholder:text-muted-foreground focus:outline-none resize-y"
          placeholder="FIND calendaritem AS ?e"
          @keydown.meta.enter="executeQuery"
          @keydown.ctrl.enter="executeQuery" />
        <div class="flex items-center justify-between px-4 py-1.5 bg-muted/10 text-[10px] text-muted-foreground">
          <span>Press <kbd class="rounded border px-1 py-0.5">Cmd+Enter</kbd> to run</span>
          <span v-if="meta">{{ results.length }} rows · {{ meta.executionTime?.toFixed(2) ?? '—' }}ms</span>
        </div>
      </div>

      <!-- Error -->
      <div v-if="error" class="shrink-0 flex items-start gap-2 border-b border-destructive/30 bg-destructive/5 px-4 py-3">
        <Icon name="lucide:alert-circle" class="size-4 text-destructive mt-0.5 shrink-0" />
        <div>
          <p class="text-sm font-medium text-destructive">Query Error</p>
          <p class="text-sm text-muted-foreground font-mono mt-1">{{ error }}</p>
        </div>
      </div>

      <!-- Results -->
      <div class="flex-1 min-h-0 overflow-auto">
        <table v-if="results.length > 0" class="w-full text-sm">
          <thead class="sticky top-0 bg-card z-10">
            <tr class="border-b border-border">
              <th v-for="col in resultColumns" :key="col" class="px-4 py-2 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">
                {{ col }}
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border">
            <tr v-for="(row, i) in results" :key="i" class="hover:bg-muted/50">
              <td v-for="col in resultColumns" :key="col" class="px-4 py-2 font-mono text-xs whitespace-nowrap">
                {{ row[col] ?? '' }}
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Empty state when no results and no error -->
        <div v-else-if="!error && !isRunning" class="flex flex-col items-center justify-center h-full text-muted-foreground">
          <Icon name="lucide:terminal" class="size-10 mb-3 opacity-30" />
          <p class="text-sm">Run a query to see results</p>
        </div>
      </div>

      <!-- Trace Footer -->
      <div v-if="meta?.trace && (meta.trace as any[]).length > 0" class="shrink-0 border-t border-border bg-muted/20 px-4 py-2">
        <details>
          <summary class="text-xs font-medium text-muted-foreground cursor-pointer">Execution Trace ({{ (meta.trace as any[]).length }} steps)</summary>
          <div class="mt-2 space-y-1">
            <div v-for="(step, i) in (meta.trace as any[])" :key="i" class="text-[10px] font-mono text-muted-foreground">
              {{ step.goal }} — {{ step.bindingsCount }} bindings ({{ step.durationMs?.toFixed(2) }}ms)
            </div>
          </div>
        </details>
      </div>
    </div>
  </Page>
</template>
