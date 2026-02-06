<script setup lang="ts">
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

  const actionColor = (action: string) => {
    switch (action) {
      case 'createNode': return 'text-emerald-500'
      case 'updateNode': return 'text-blue-500'
      case 'deleteNode': return 'text-destructive'
      case 'link': return 'text-violet-500'
      default: return 'text-muted-foreground'
    }
  }

  const actionIcon = (action: string) => {
    switch (action) {
      case 'createNode': return 'lucide:plus-circle'
      case 'updateNode': return 'lucide:pencil'
      case 'deleteNode': return 'lucide:trash-2'
      case 'link': return 'lucide:link'
      default: return 'lucide:circle'
    }
  }

  const formatTime = (iso: string) => {
    try {
      const d = new Date(iso)
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    } catch {
      return iso
    }
  }

  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso)
      return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
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
    variant="settings"
    title="Activity Log"
    subtitle="Developer"
    description="Recent graph mutations tracked by the TQL engine."
    icon="lucide:scroll-text">
    <div class="space-y-4">
      <!-- Toolbar -->
      <div class="flex items-center justify-between">
        <p class="text-xs text-muted-foreground">
          {{ entries.length }} entries in memory
        </p>
        <div class="flex items-center gap-3">
          <label class="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
            <input v-model="autoRefresh" type="checkbox" class="rounded border-input" />
            Auto-refresh (3s)
          </label>
          <UiButton variant="outline" size="sm" @click="fetchLog">
            <Icon name="lucide:refresh-cw" class="mr-1.5 size-3.5" />
            Refresh
          </UiButton>
        </div>
      </div>

      <div v-if="loading" class="flex items-center justify-center py-20">
        <Icon name="lucide:loader-2" class="h-6 w-6 animate-spin text-muted-foreground" />
      </div>

      <!-- Empty State -->
      <div v-else-if="entries.length === 0" class="text-center py-16">
        <Icon name="lucide:scroll-text" class="mx-auto h-12 w-12 text-muted-foreground mb-3" />
        <h3 class="text-sm font-medium mb-1">No activity yet</h3>
        <p class="text-xs text-muted-foreground">Mutations made through the graph API will appear here.</p>
      </div>

      <!-- Log Entries -->
      <UiCard v-else>
        <UiCardContent class="p-0">
          <div class="divide-y divide-border max-h-[700px] overflow-y-auto">
            <div v-for="(entry, i) in entries" :key="i" class="flex items-start gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
              <div class="mt-0.5">
                <Icon :name="actionIcon(entry.action)" class="size-4" :class="actionColor(entry.action)" />
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                  <span class="text-sm font-medium" :class="actionColor(entry.action)">{{ entry.action }}</span>
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
    </div>
  </Page>
</template>
