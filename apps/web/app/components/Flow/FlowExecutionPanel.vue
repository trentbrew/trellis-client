<script setup lang="ts">
  import type { Trace, ExecutionStatus, StepOutput, NodeExecutionState } from '~/composables/useWorkflowExecution'
  import type { WorkflowNodeKind } from '~/types/database'

  const props = defineProps<{
    status: ExecutionStatus
    error: string | null
    traces: Trace[]
    stepOutputs: Record<string, StepOutput>
    nodeStates: Record<string, NodeExecutionState>
    activeNodeId: string | null
    totalDurationMs: number
    nodeMap: Record<string, { label: string; kind: WorkflowNodeKind }>
    canRun: boolean
  }>()

  const emit = defineEmits<{ run: [] }>()

  // ── Panel expand/collapse ──────────────────────────────────────────────────
  const isExpanded = ref(false)

  // Auto-expand when execution starts, collapse when idle
  watch(() => props.status, (s) => {
    if (s === 'running') isExpanded.value = true
  })

  // ── Step inspector ─────────────────────────────────────────────────────────
  const selectedTraceIndex = ref<number | null>(null)

  const selectedTrace = computed<Trace | null>(() =>
    selectedTraceIndex.value !== null ? (props.traces[selectedTraceIndex.value] ?? null) : null,
  )

  const selectedOutput = computed<unknown>(() =>
    selectedTrace.value ? props.stepOutputs[selectedTrace.value.nodeId]?.output : undefined,
  )

  watch(() => props.traces.length, (len) => {
    // Auto-select the latest step
    if (len > 0) selectedTraceIndex.value = len - 1
  })

  // ── Helpers ────────────────────────────────────────────────────────────────
  const KIND_META: Record<string, { icon: string; color: string }> = {
    Agent:       { icon: 'lucide:sparkles',      color: 'text-purple-400' },
    Tool:        { icon: 'lucide:wrench',         color: 'text-blue-400' },
    Router:      { icon: 'lucide:git-branch',     color: 'text-amber-400' },
    Guard:       { icon: 'lucide:shield',         color: 'text-rose-400' },
    MemoryRead:  { icon: 'lucide:database',       color: 'text-teal-400' },
    MemoryWrite: { icon: 'lucide:database-zap',   color: 'text-teal-400' },
    End:         { icon: 'lucide:flag',           color: 'text-muted-foreground' },
  }

  function kindMeta(kind: string) {
    return KIND_META[kind] ?? { icon: 'lucide:box', color: 'text-muted-foreground' }
  }

  function nodeLabel(nodeId: string): string {
    return props.nodeMap[nodeId]?.label ?? nodeId
  }

  function formatMs(ms: number): string {
    return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`
  }

  function formatJson(value: unknown): string {
    if (value === null || value === undefined) return '(none)'
    try { return JSON.stringify(value, null, 2) } catch { return String(value) }
  }

  const statusSummary = computed<string>(() => {
    switch (props.status) {
      case 'running':
        return `Running… (${props.traces.length} step${props.traces.length !== 1 ? 's' : ''})`
      case 'completed':
        return `Done — ${props.traces.length} steps in ${formatMs(props.totalDurationMs)}`
      case 'error':
        return `Error: ${props.error ?? 'unknown'}`
      default:
        return 'Ready'
    }
  })
</script>

<template>
  <div class="execution-panel shrink-0 border-t border-border bg-background">
    <!-- ── Collapsed bar ──────────────────────────────────────────────────── -->
    <div class="flex h-9 items-center gap-2 px-3">
      <!-- Status icon -->
      <div class="shrink-0">
        <Icon
          v-if="status === 'running'"
          name="lucide:loader-circle"
          class="h-3.5 w-3.5 animate-spin text-primary" />
        <Icon
          v-else-if="status === 'completed'"
          name="lucide:check-circle-2"
          class="h-3.5 w-3.5 text-green-500" />
        <Icon
          v-else-if="status === 'error'"
          name="lucide:alert-circle"
          class="h-3.5 w-3.5 text-destructive" />
        <Icon
          v-else
          name="lucide:circle-dashed"
          class="h-3.5 w-3.5 text-muted-foreground" />
      </div>

      <!-- Summary text -->
      <span class="flex-1 truncate text-xs text-muted-foreground">{{ statusSummary }}</span>

      <!-- Run button -->
      <button
        type="button"
        :disabled="!canRun || status === 'running'"
        class="flex h-6 items-center gap-1 rounded-md bg-green-500 px-2.5 text-[11px] font-semibold text-white transition-all hover:bg-green-400 disabled:cursor-not-allowed disabled:opacity-40"
        @click="emit('run')">
        <Icon name="lucide:play" class="h-3 w-3" />
        <span>{{ status === 'running' ? 'Running' : 'Run' }}</span>
      </button>

      <!-- Expand toggle -->
      <button
        v-if="traces.length > 0 || status !== 'idle'"
        type="button"
        class="flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        @click="isExpanded = !isExpanded">
        <Icon :name="isExpanded ? 'lucide:chevron-down' : 'lucide:chevron-up'" class="h-3.5 w-3.5" />
      </button>
    </div>

    <!-- ── Expanded section ───────────────────────────────────────────────── -->
    <Transition name="panel-expand">
      <div v-if="isExpanded" class="flex h-64 border-t border-border">
        <!-- Timeline -->
        <div class="flex w-56 shrink-0 flex-col overflow-y-auto border-r border-border">
          <div class="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Steps
          </div>

          <div v-if="traces.length === 0" class="flex flex-1 items-center justify-center p-4 text-center text-[11px] text-muted-foreground">
            {{ status === 'running' ? 'Waiting for first step…' : 'No steps yet.' }}
          </div>

          <button
            v-for="(trace, idx) in traces"
            :key="trace.nodeId + idx"
            type="button"
            :class="[
              'flex items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors hover:bg-muted/50',
              selectedTraceIndex === idx ? 'bg-muted' : '',
            ]"
            @click="selectedTraceIndex = idx">
            <!-- Kind icon -->
            <Icon
              :name="kindMeta(trace.kind).icon"
              :class="['h-3.5 w-3.5 shrink-0', kindMeta(trace.kind).color]" />
            <!-- Label -->
            <span class="flex-1 truncate font-medium text-foreground/90">{{ nodeLabel(trace.nodeId) }}</span>
            <!-- Duration / status -->
            <span class="shrink-0 tabular-nums text-muted-foreground text-[10px]">
              {{ trace.error ? '✗' : formatMs(trace.tEnd - trace.tStart) }}
            </span>
          </button>

          <!-- Active node (running, not yet in traces) -->
          <div
            v-if="status === 'running' && activeNodeId && !traces.some(t => t.nodeId === activeNodeId)"
            class="flex items-center gap-2 px-3 py-1.5 text-xs">
            <Icon name="lucide:loader-circle" class="h-3.5 w-3.5 shrink-0 animate-spin text-primary" />
            <span class="flex-1 truncate font-medium text-foreground/90">{{ nodeLabel(activeNodeId) }}</span>
            <span class="shrink-0 text-[10px] text-muted-foreground">…</span>
          </div>
        </div>

        <!-- Inspector -->
        <div class="flex flex-1 flex-col overflow-hidden">
          <div v-if="!selectedTrace" class="flex flex-1 items-center justify-center text-[11px] text-muted-foreground">
            Select a step to inspect
          </div>

          <template v-else>
            <!-- Step header -->
            <div class="flex items-center gap-2 border-b border-border px-4 py-2">
              <Icon
                :name="kindMeta(selectedTrace.kind).icon"
                :class="['h-4 w-4', kindMeta(selectedTrace.kind).color]" />
              <span class="text-sm font-semibold">{{ nodeLabel(selectedTrace.nodeId) }}</span>
              <span class="text-xs text-muted-foreground">{{ selectedTrace.kind }}</span>
              <div class="flex-1" />
              <span v-if="selectedTrace.error" class="text-[11px] font-medium text-destructive">Error</span>
              <span v-else class="text-[11px] font-medium text-green-500">{{ formatMs(selectedTrace.tEnd - selectedTrace.tStart) }}</span>
              <span v-if="selectedTrace.next" class="text-[10px] text-muted-foreground">→ {{ selectedTrace.next }}</span>
            </div>

            <!-- Error message -->
            <div v-if="selectedTrace.error" class="mx-4 mt-3 rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {{ selectedTrace.error }}
            </div>

            <!-- Output -->
            <div class="flex-1 overflow-y-auto px-4 py-3">
              <p class="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Output</p>
              <pre class="rounded-md bg-muted/50 p-3 text-[11px] leading-relaxed text-foreground/80 whitespace-pre-wrap break-all">{{ formatJson(selectedOutput) }}</pre>
            </div>
          </template>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
  .panel-expand-enter-active,
  .panel-expand-leave-active {
    transition: height 0.2s ease;
    overflow: hidden;
  }

  .panel-expand-enter-from,
  .panel-expand-leave-to {
    height: 0 !important;
  }

  .panel-expand-enter-to,
  .panel-expand-leave-from {
    height: 256px;
  }
</style>
