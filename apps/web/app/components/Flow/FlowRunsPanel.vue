<script setup lang="ts">
  import type { WorkflowRun } from '~/composables/useWorkflowRuns'

  const props = defineProps<{
    runs: WorkflowRun[]
    isLoading: boolean
    activeRunId: string | null
  }>()

  const emit = defineEmits<{
    select: [run: WorkflowRun]
    remove: [runId: string]
    refresh: []
  }>()

  // ── Formatting helpers ─────────────────────────────────────────────────────
  function formatMs(ms: number | undefined): string {
    if (!ms || ms < 0) return '—'
    return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`
  }

  function formatRelative(iso: string | undefined): string {
    if (!iso) return ''
    const t = new Date(iso).getTime()
    if (!t) return ''
    const diff = Date.now() - t
    const sec = Math.floor(diff / 1000)
    if (sec < 10) return 'just now'
    if (sec < 60) return `${sec}s ago`
    const min = Math.floor(sec / 60)
    if (min < 60) return `${min}m ago`
    const hr = Math.floor(min / 60)
    if (hr < 24) return `${hr}h ago`
    const d = Math.floor(hr / 24)
    if (d < 7) return `${d}d ago`
    return new Date(iso).toLocaleDateString()
  }

  function formatAbsolute(iso: string | undefined): string {
    if (!iso) return ''
    return new Date(iso).toLocaleString()
  }

  const statusMeta: Record<WorkflowRun['status'], { icon: string; color: string; label: string }> = {
    running:   { icon: 'lucide:loader-circle',  color: 'text-primary',            label: 'Running' },
    completed: { icon: 'lucide:check-circle-2', color: 'text-green-500',          label: 'Completed' },
    failed:    { icon: 'lucide:alert-circle',   color: 'text-destructive',        label: 'Failed' },
    cancelled: { icon: 'lucide:ban',            color: 'text-muted-foreground',   label: 'Cancelled' },
  }
</script>

<template>
  <div class="flex h-full flex-col overflow-hidden">
    <!-- Header -->
    <div class="flex h-9 shrink-0 items-center gap-2 border-b border-border px-3">
      <span class="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Runs</span>
      <span v-if="runs.length > 0" class="text-[10px] text-muted-foreground">· {{ runs.length }}</span>
      <div class="flex-1" />
      <button
        type="button"
        class="flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        :disabled="props.isLoading"
        @click="emit('refresh')">
        <Icon
          :name="props.isLoading ? 'lucide:loader-circle' : 'lucide:refresh-cw'"
          :class="['h-3.5 w-3.5', props.isLoading && 'animate-spin']" />
      </button>
    </div>

    <!-- Loading state -->
    <div
      v-if="props.isLoading && runs.length === 0"
      class="flex flex-1 items-center justify-center p-4 text-[11px] text-muted-foreground">
      <Icon name="lucide:loader-circle" class="mr-2 h-3.5 w-3.5 animate-spin" />
      Loading runs…
    </div>

    <!-- Empty state -->
    <div
      v-else-if="runs.length === 0"
      class="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center text-[11px] text-muted-foreground">
      <Icon name="lucide:history" class="h-5 w-5 opacity-50" />
      <p>No runs yet.</p>
      <p class="text-[10px] opacity-60">Click <strong>Run</strong> to execute this workflow — the history will appear here.</p>
    </div>

    <!-- List -->
    <div v-else class="flex-1 overflow-y-auto">
      <button
        v-for="run in runs"
        :key="run.id"
        type="button"
        :class="[
          'group flex w-full items-center gap-2 border-b border-border/50 px-3 py-2 text-left transition-colors hover:bg-muted/50',
          props.activeRunId === run.id ? 'bg-muted' : '',
        ]"
        @click="emit('select', run)">
        <Icon
          :name="statusMeta[run.status].icon"
          :class="[
            'h-3.5 w-3.5 shrink-0',
            statusMeta[run.status].color,
            run.status === 'running' && 'animate-spin',
          ]" />

        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-1.5 text-xs">
            <span class="font-medium text-foreground/90">{{ statusMeta[run.status].label }}</span>
            <span class="text-muted-foreground">·</span>
            <span class="truncate text-muted-foreground">{{ formatRelative(run.startedAt) }}</span>
          </div>
          <div class="mt-0.5 flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <span class="tabular-nums">{{ formatMs(run.durationMs) }}</span>
            <span>·</span>
            <span>{{ run.stepCount ?? 0 }} steps</span>
            <span v-if="run.agentId">·</span>
            <span v-if="run.agentId" class="truncate">{{ run.agentId }}</span>
          </div>
          <div v-if="run.error" class="mt-0.5 truncate text-[10px] text-destructive">{{ run.error }}</div>
        </div>

        <UiTooltip>
          <UiTooltipTrigger as-child>
            <button
              type="button"
              class="hidden h-6 w-6 items-center justify-center rounded text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:flex group-hover:opacity-100"
              @click.stop="emit('remove', run.id)">
              <Icon name="lucide:trash-2" class="h-3 w-3" />
            </button>
          </UiTooltipTrigger>
          <UiTooltipContent side="left">Delete run</UiTooltipContent>
        </UiTooltip>

        <UiTooltip>
          <UiTooltipTrigger as-child>
            <span class="shrink-0 text-[10px] tabular-nums text-muted-foreground/70">
              {{ formatAbsolute(run.startedAt).split(',')[1]?.trim() || '' }}
            </span>
          </UiTooltipTrigger>
          <UiTooltipContent side="left">{{ formatAbsolute(run.startedAt) }}</UiTooltipContent>
        </UiTooltip>
      </button>
    </div>
  </div>
</template>
