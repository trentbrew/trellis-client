<script setup lang="ts">
  import { useBrowse } from '~/composables/useBrowse'

  interface LogEntry {
    timestamp: string
    action: string
    entityId?: string
    type?: string
    data?: Record<string, any>
  }

  const entries = ref<LogEntry[]>([])
  const loading = ref(true)
  const autoRefresh = ref(false)
  let interval: ReturnType<typeof setInterval> | null = null

  const { browseState } = useBrowse<LogEntry>({
    items: entries,
    searchFields: ['action', 'entityId', 'type'],
    defaultViewMode: 'list',
    sortOptions: [
      { value: 'timestamp', label: 'Time' },
      { value: 'action', label: 'Action' },
      { value: 'entityId', label: 'Entity' },
    ],
  })

  const fetchLog = async () => {
    try {
      const result = await $fetch<{ entries: LogEntry[] }>('/api/graph/log')
      entries.value = result.entries || []
    } catch (err) {
      console.error('[graph/activity] fetch error:', err)
    } finally {
      loading.value = false
    }
  }

  const ACTION_STYLES: Record<string, { color: string; icon: string }> = {
    createNode: { color: 'text-emerald-500', icon: 'lucide:plus-circle' },
    updateNode: { color: 'text-blue-500', icon: 'lucide:pencil' },
    deleteNode: { color: 'text-destructive', icon: 'lucide:trash-2' },
    link: { color: 'text-violet-500', icon: 'lucide:link' },
  }

  const DEFAULT_ACTION_STYLE = { color: 'text-muted-foreground', icon: 'lucide:circle' }

  const actionStyle = (action: string) => ACTION_STYLES[action] ?? DEFAULT_ACTION_STYLE

  const formatTime = (iso: string): string => {
    try {
      return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    } catch {
      return iso
    }
  }

  const formatDate = (iso: string): string => {
    try {
      return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric' })
    } catch {
      return ''
    }
  }

  watch(autoRefresh, (val) => {
    if (val) {
      interval = setInterval(fetchLog, 3000)
    } else if (interval) {
      clearInterval(interval)
      interval = null
    }
  })

  onUnmounted(() => {
    if (interval) clearInterval(interval)
  })

  onMounted(fetchLog)
</script>

<template>
  <Page
    variant="browse"
    title="Activity Log"
    subtitle="Developer"
    description="Recent graph mutations tracked by the TQL engine."
    icon="lucide:scroll-text"
    :browse="browseState"
    :total-count="entries.length"
    :filtered-count="browseState.filteredItems.value.length"
    count-label="entries"
    :show-view-switcher="false"
    :is-loading="loading"
    empty-title="No activity yet"
    empty-description="Mutations made through the graph API will appear here."
    empty-icon="lucide:scroll-text">
    <template #toolbarActions>
      <label class="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
        <input v-model="autoRefresh" type="checkbox" class="rounded border-input" />
        Auto-refresh (3s)
      </label>
      <UiButton variant="outline" size="sm" class="gap-2" @click="fetchLog">
        <Icon name="lucide:refresh-cw" class="h-4 w-4" />
        <span>Refresh</span>
      </UiButton>
    </template>

    <UiCard v-if="browseState.filteredItems.value.length > 0">
      <UiCardContent class="p-0">
        <div class="divide-y divide-border max-h-[700px] overflow-y-auto">
          <div v-for="(entry, i) in browseState.filteredItems.value" :key="i" class="flex items-start gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
            <div class="mt-0.5">
              <Icon :name="actionStyle(entry.action).icon" class="size-4" :class="actionStyle(entry.action).color" />
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <span class="text-sm font-medium" :class="actionStyle(entry.action).color">{{ entry.action }}</span>
                <span v-if="entry.entityId" class="font-mono text-[10px] text-muted-foreground truncate">{{ entry.entityId }}</span>
              </div>
              <div v-if="entry.type" class="mt-0.5">
                <span class="inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] text-muted-foreground">
                  {{ entry.type }}
                </span>
              </div>
              <details v-if="entry.data && Object.keys(entry.data).length > 0" class="mt-1">
                <summary class="text-[10px] text-muted-foreground cursor-pointer">data</summary>
                <pre class="mt-1 text-[10px] font-mono text-muted-foreground bg-muted/50 rounded p-2 overflow-x-auto max-h-[200px] overflow-y-auto">{{ JSON.stringify(entry.data, null, 2) }}</pre>
              </details>
            </div>
            <div class="text-right shrink-0">
              <p class="text-[10px] font-mono text-muted-foreground">{{ formatTime(entry.timestamp) }}</p>
              <p class="text-[10px] text-muted-foreground">{{ formatDate(entry.timestamp) }}</p>
            </div>
          </div>
        </div>
      </UiCardContent>
    </UiCard>
  </Page>
</template>
