<script setup lang="ts">
  /**
   * /agent — Lab op-log projection (Campus Substrate, slice 0.6).
   *
   * The founder's personal "what's happening in my workspace" feed.
   * Replaces the old agent-workspace stub with a live projection of
   * MutationEvents filtered by zone.
   *
   * Data flow:
   *   1. onMount -> GET /api/graph/log for the last 200 mutations
   *   2. SSE subscribe -> prepend incoming events in realtime
   *   3. Client-side filter by zone (tabs)
   */
  import { useSSESubscribe } from '~/composables/useTrellisSSE'

  definePageMeta({
    title: 'Lab',
    icon: 'lucide:flask-conical',
  })

  // ── Types ─────────────────────────────────────────────────────────
  interface LogEntry {
    id?: number
    timestamp: string
    action: string
    entityId?: string
    type?: string
    agentId?: string
    zoneId?: string
    facilityId?: string
    data?: Record<string, any>
  }

  // ── Zone model (mirrors tql-events.ts) ────────────────────────────
  const ZONES = [
    { id: 'all', label: 'All', icon: 'lucide:layers', color: 'text-foreground' },
    { id: 'entity:founder-facility-lab', label: 'Lab', icon: 'lucide:flask-conical', color: 'text-indigo-500' },
    { id: 'entity:founder-facility-lobby', label: 'Lobby', icon: 'lucide:door-open', color: 'text-amber-500' },
    { id: 'entity:founder-facility-workshop', label: 'Workshop', icon: 'lucide:hammer', color: 'text-emerald-500' },
    { id: 'entity:founder-facility-showroom', label: 'Showroom', icon: 'lucide:sparkles', color: 'text-violet-500' },
    { id: 'entity:founder-facility-vault', label: 'Vault', icon: 'lucide:lock', color: 'text-rose-500' },
  ] as const

  type ZoneId = (typeof ZONES)[number]['id']

  const selectedZone = ref<ZoneId>('entity:founder-facility-lab')
  const entries = ref<LogEntry[]>([])
  const loading = ref(true)

  // ── Filtered entries (by selected zone) ───────────────────────────
  const filteredEntries = computed(() => {
    if (selectedZone.value === 'all') return entries.value
    return entries.value.filter((e) => e.zoneId === selectedZone.value)
  })

  const zoneCounts = computed(() => {
    const counts: Record<string, number> = { all: entries.value.length }
    for (const e of entries.value) {
      if (e.zoneId) counts[e.zoneId] = (counts[e.zoneId] || 0) + 1
    }
    return counts
  })

  // ── Initial fetch ─────────────────────────────────────────────────
  const fetchLog = async () => {
    try {
      const result = await $fetch<{ entries: LogEntry[] }>('/api/graph/log')
      entries.value = result.entries || []
    } catch (err) {
      console.error('[lab] fetch error:', err)
    } finally {
      loading.value = false
    }
  }

  // ── Live SSE subscription ─────────────────────────────────────────
  const unsubscribe = ref<(() => void) | null>(null)

  onMounted(() => {
    fetchLog()
    unsubscribe.value = useSSESubscribe('mutation', (evt) => {
      try {
        const payload = JSON.parse(evt.data) as LogEntry
        // Prepend newest
        entries.value = [payload, ...entries.value].slice(0, 400)
      } catch (err) {
        console.warn('[lab] bad SSE payload:', err)
      }
    })
  })

  onUnmounted(() => {
    unsubscribe.value?.()
  })

  // ── Styling + formatting helpers ──────────────────────────────────
  const ACTION_STYLES: Record<string, { color: string; icon: string }> = {
    createNode: { color: 'text-emerald-500', icon: 'lucide:plus-circle' },
    updateNode: { color: 'text-blue-500', icon: 'lucide:pencil' },
    deleteNode: { color: 'text-destructive', icon: 'lucide:trash-2' },
    link: { color: 'text-violet-500', icon: 'lucide:link' },
    unlink: { color: 'text-muted-foreground', icon: 'lucide:unlink' },
    createOntology: { color: 'text-cyan-500', icon: 'lucide:shapes' },
    updateOntology: { color: 'text-cyan-500', icon: 'lucide:shapes' },
    deleteOntology: { color: 'text-cyan-500', icon: 'lucide:shapes' },
  }

  const DEFAULT_ACTION_STYLE = { color: 'text-muted-foreground', icon: 'lucide:circle' }

  const actionStyle = (action: string) => ACTION_STYLES[action] ?? DEFAULT_ACTION_STYLE

  const zoneConfig = (zoneId?: string) => {
    return ZONES.find((z) => z.id === zoneId)
  }

  const formatTime = (iso: string): string => {
    try {
      return new Date(iso).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    } catch {
      return iso
    }
  }

  const relativeTime = (iso: string): string => {
    try {
      const now = Date.now()
      const ts = new Date(iso).getTime()
      const diff = Math.max(0, now - ts)
      if (diff < 5_000) return 'just now'
      if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`
      if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
      if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
      return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric' })
    } catch {
      return iso
    }
  }
</script>

<template>
  <Page
    variant="default"
    title="Lab"
    subtitle="Founder · Campus Substrate"
    description="Live op-log of your private workspace — every mutation, tagged by zone."
    icon="lucide:flask-conical"
    :hide-sidebar="true">
    <div class="flex flex-col gap-4 p-6 max-w-5xl mx-auto w-full">
      <LabSubNav active="op-log" />

      <!-- Facility header -->
      <UiCard class="border-primary/20 bg-primary/5">
        <UiCardContent class="p-4 flex items-center gap-4">
          <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Icon name="lucide:building-2" class="h-5 w-5 text-primary" />
          </div>
          <div class="flex-1 min-w-0">
            <div class="text-sm font-semibold">Founder Facility</div>
            <div class="text-[11px] font-mono text-muted-foreground truncate">entity:founder-facility</div>
          </div>
          <div class="flex items-center gap-2 text-xs text-muted-foreground">
            <Icon name="lucide:bot" class="h-3.5 w-3.5" />
            <span>1 agent</span>
            <span class="opacity-40">·</span>
            <Icon name="lucide:layout-panel-left" class="h-3.5 w-3.5" />
            <span>5 zones</span>
          </div>
          <NuxtLink
            to="/agent/studio"
            class="ml-2 flex items-center gap-1.5 rounded border border-border bg-background/60 px-2.5 py-1 text-xs hover:bg-background transition-colors"
            title="Workshop → Showroom artifact publish demo">
            <Icon name="lucide:hammer" class="h-3.5 w-3.5 text-emerald-500" />
            <span>Studio</span>
          </NuxtLink>
        </UiCardContent>
      </UiCard>

      <!-- Zone filter tabs -->
      <div class="flex items-center gap-0.5 rounded-lg border border-border bg-background p-1 overflow-x-auto">
        <button
          v-for="zone in ZONES"
          :key="zone.id"
          type="button"
          class="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md transition-colors shrink-0"
          :class="selectedZone === zone.id ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'"
          @click="selectedZone = zone.id">
          <Icon :name="zone.icon" class="h-3.5 w-3.5" :class="selectedZone === zone.id ? zone.color : ''" />
          <span>{{ zone.label }}</span>
          <span class="text-[10px] text-muted-foreground/70 tabular-nums">{{ zoneCounts[zone.id] ?? 0 }}</span>
        </button>
      </div>

      <!-- Op-log -->
      <UiCard>
        <UiCardContent class="p-0">
          <div v-if="loading" class="flex items-center justify-center py-12 text-muted-foreground text-sm">
            <Icon name="lucide:loader-2" class="h-4 w-4 animate-spin mr-2" />
            Loading op-log…
          </div>
          <div
            v-else-if="filteredEntries.length === 0"
            class="flex flex-col items-center justify-center py-16 text-muted-foreground text-sm gap-2">
            <Icon name="lucide:scroll-text" class="h-8 w-8 opacity-40" />
            <span>No activity in this zone yet.</span>
          </div>
          <div v-else class="divide-y divide-border max-h-[70vh] overflow-y-auto">
            <div
              v-for="(entry, i) in filteredEntries"
              :key="entry.id ?? `${entry.timestamp}-${i}`"
              class="flex items-start gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
              <div class="mt-0.5">
                <Icon :name="actionStyle(entry.action).icon" class="h-4 w-4" :class="actionStyle(entry.action).color" />
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="text-sm font-medium" :class="actionStyle(entry.action).color">
                    {{ entry.action }}
                  </span>
                  <span v-if="entry.entityId" class="font-mono text-[10px] text-muted-foreground truncate">
                    {{ entry.entityId }}
                  </span>
                  <span
                    v-if="entry.type"
                    class="inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] text-muted-foreground">
                    {{ entry.type }}
                  </span>
                </div>
                <div class="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground flex-wrap">
                  <span v-if="entry.agentId" class="flex items-center gap-1">
                    <Icon name="lucide:user" class="h-3 w-3" />
                    <span class="font-mono">{{ entry.agentId }}</span>
                  </span>
                  <span
                    v-if="entry.zoneId"
                    class="inline-flex items-center gap-1 rounded px-1.5 py-0.5 bg-muted/60"
                    :class="zoneConfig(entry.zoneId)?.color">
                    <Icon :name="zoneConfig(entry.zoneId)?.icon ?? 'lucide:layout-panel-left'" class="h-3 w-3" />
                    <span>{{ zoneConfig(entry.zoneId)?.label ?? entry.zoneId }}</span>
                  </span>
                </div>
              </div>
              <div class="text-right shrink-0">
                <p class="text-[11px] font-mono text-muted-foreground">{{ formatTime(entry.timestamp) }}</p>
                <p class="text-[10px] text-muted-foreground">{{ relativeTime(entry.timestamp) }}</p>
              </div>
            </div>
          </div>
        </UiCardContent>
      </UiCard>
    </div>
  </Page>
</template>
