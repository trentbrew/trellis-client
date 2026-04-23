<script setup lang="ts">
  /**
   * /ontologies/activity — graph mutation log.
   * Tracks all TQL kernel mutations (createNode, updateNode, link, etc.).
   * Ported from /database/activity.
   */
  import { useBrowse } from '~/composables/useBrowse'

  definePageMeta({
    title: 'Activity Log',
    icon: 'lucide:scroll-text',
    middleware: ['auth'],
  })

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

  /**
   * Scope filter:
   * - `schema`: only ontology mutations and changes to `trellis:schema/*` entities.
   * - `all`: every entry returned by `/api/graph/log`.
   *
   * Defaults to `schema` since this page lives under /ontologies; callers that
   * want a wider view can flip the toggle.
   */
  type ActivityScope = 'schema' | 'all'
  const scope = ref<ActivityScope>('schema')

  const SCHEMA_ACTION_SUFFIX = 'Ontology'
  const SCHEMA_ENTITY_PREFIX = 'trellis:schema/'

  function isSchemaEntry(entry: LogEntry): boolean {
    if (typeof entry.action === 'string' && entry.action.endsWith(SCHEMA_ACTION_SUFFIX)) return true
    if (typeof entry.entityId === 'string' && entry.entityId.startsWith(SCHEMA_ENTITY_PREFIX)) return true
    if (entry.type === 'ontology') return true
    return false
  }

  const scopedEntries = computed(() => {
    if (scope.value === 'all') return entries.value
    return entries.value.filter(isSchemaEntry)
  })

  const schemaCount = computed(() => entries.value.filter(isSchemaEntry).length)

  const { browseState } = useBrowse<LogEntry>({
    items: scopedEntries,
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
      console.error('[ontologies/activity] fetch error:', err)
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
    :subtitle="scope === 'schema' ? 'Ontologies · Schema changes' : 'Ontologies · All graph activity'"
    :description="
      scope === 'schema'
        ? 'Recent schema mutations (ontology create/update/delete).'
        : 'Recent graph mutations tracked by the TQL engine.'
    "
    icon="lucide:scroll-text"
    :browse="browseState"
    :total-count="scopedEntries.length"
    :filtered-count="browseState.filteredItems.value.length"
    count-label="entries"
    :show-view-switcher="false"
    :is-loading="loading"
    :empty-title="scope === 'schema' ? 'No schema activity yet' : 'No activity yet'"
    :empty-description="
      scope === 'schema'
        ? 'Create or edit a custom type to see mutations here.'
        : 'Mutations made through the graph API will appear here.'
    "
    empty-icon="lucide:scroll-text">
    <template #toolbarActions>
      <!-- Scope toggle -->
      <div class="flex items-center gap-0.5 rounded-md border border-border bg-background p-0.5">
        <button
          type="button"
          class="flex items-center gap-1.5 px-2 py-1 text-[11px] rounded transition-colors"
          :class="scope === 'schema' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'"
          @click="scope = 'schema'">
          <Icon name="lucide:shapes" class="h-3 w-3" />
          Schema only
          <span class="text-[10px] text-muted-foreground/70">{{ schemaCount }}</span>
        </button>
        <button
          type="button"
          class="flex items-center gap-1.5 px-2 py-1 text-[11px] rounded transition-colors"
          :class="scope === 'all' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'"
          @click="scope = 'all'">
          <Icon name="lucide:layers" class="h-3 w-3" />
          All graph activity
          <span class="text-[10px] text-muted-foreground/70">{{ entries.length }}</span>
        </button>
      </div>

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
          <div
            v-for="(entry, i) in browseState.filteredItems.value"
            :key="i"
            class="flex items-start gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
            <div class="mt-0.5">
              <Icon :name="actionStyle(entry.action).icon" class="size-4" :class="actionStyle(entry.action).color" />
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <span class="text-sm font-medium" :class="actionStyle(entry.action).color">{{ entry.action }}</span>
                <span v-if="entry.entityId" class="font-mono text-[10px] text-muted-foreground truncate">
                  {{ entry.entityId }}
                </span>
              </div>
              <div v-if="entry.type" class="mt-0.5">
                <span
                  class="inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] text-muted-foreground">
                  {{ entry.type }}
                </span>
              </div>
              <details v-if="entry.data && Object.keys(entry.data).length > 0" class="mt-1">
                <summary class="text-[10px] text-muted-foreground cursor-pointer">data</summary>
                <pre
                  class="mt-1 text-[10px] font-mono text-muted-foreground bg-muted/50 rounded p-2 overflow-x-auto max-h-[200px] overflow-y-auto"
                  >{{ JSON.stringify(entry.data, null, 2) }}</pre
                >
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
