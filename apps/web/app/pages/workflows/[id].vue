<script setup lang="ts">
  import FlowEditor from '~/components/Flow/FlowEditor.vue'
  import FlowExecutionPanel from '~/components/Flow/FlowExecutionPanel.vue'
  import FlowRunsPanel from '~/components/Flow/FlowRunsPanel.vue'
  import FlowTriggersPanel from '~/components/Flow/FlowTriggersPanel.vue'
  import type { WorkflowNodeKind, WorkflowGraph } from '~/types/database'
  import type { WorkflowRun } from '~/composables/useWorkflowRuns'
  import {
    useWorkflowTriggers,
    type WorkflowTrigger,
    type TriggerKind,
    type EntityChangeAction,
  } from '~/composables/useWorkflowTriggers'

  definePageMeta({
    title: 'Workflow',
    middleware: ['auth'],
  })

  const route = useRoute()
  const router = useRouter()
  const { wp } = useWorkspacePath()
  const workflowId = computed(() => String(route.params.id || ''))

  const { currentApp, workflows, updateWorkflow, deleteWorkflow } = useInstantData()

  const workflow = computed(() => {
    const id = workflowId.value
    if (!id) return null
    return (workflows.value || []).find((w) => w.id === id) || null
  })

  const isLoading = computed(() => !currentApp.value)

  // ── Inline title editing ───────────────────────────────────────────────────
  const isEditingTitle = ref(false)
  const editTitle = ref('')

  function startEditTitle() {
    editTitle.value = workflow.value?.name || ''
    isEditingTitle.value = true
    nextTick(() => {
      const input = document.querySelector('.workflow-title-input') as HTMLInputElement
      input?.focus()
      input?.select()
    })
  }

  async function commitTitle() {
    isEditingTitle.value = false
    if (!workflow.value || !editTitle.value.trim()) return
    if (editTitle.value.trim() !== workflow.value.name) {
      await updateWorkflow(workflow.value.id, { name: editTitle.value.trim() })
    }
  }

  // ── Active toggle ──────────────────────────────────────────────────────────
  async function toggleActive() {
    if (!workflow.value) return
    await updateWorkflow(workflow.value.id, { active: !workflow.value.active })
  }

  // ── Delete ─────────────────────────────────────────────────────────────────
  async function handleDelete() {
    if (!workflow.value) return
    await deleteWorkflow(workflow.value.id)
    await router.push(wp('/workflows'))
  }

  // ── Execution ──────────────────────────────────────────────────────────────
  const execution = useWorkflowExecution()
  const runs = useWorkflowRuns(workflowId)
  const triggers = useWorkflowTriggers(workflowId)
  const activeRunId = ref<string | null>(null)

  // ── Sidebar tab ────────────────────────────────────────────────────────────
  const sidebarTab = ref<'runs' | 'triggers'>('runs')

  const hasStartNode = computed<boolean>(() => (workflow.value?.graph?.nodes ?? []).some((n) => n.kind === 'start'))

  const canRun = computed<boolean>(() => hasStartNode.value && execution.status.value !== 'running')

  /** Map nodeId → { label, kind } for the execution panel's display. */
  const nodeMap = computed(() => {
    const map: Record<string, { label: string; kind: WorkflowNodeKind }> = {}
    for (const n of workflow.value?.graph?.nodes ?? []) {
      map[n.id] = { label: n.label, kind: n.kind }
    }
    return map
  })

  async function handleRun() {
    if (!workflow.value?.graph || !canRun.value) return
    activeRunId.value = null
    const input = {}
    const finalState = await execution.run(workflow.value.graph, input)

    // Persist the run so it shows up in the history panel and in /graph
    const startedAt = execution.startedAt.value || new Date().toISOString()
    const finishedAt = new Date().toISOString()
    const durationMs = new Date(finishedAt).getTime() - new Date(startedAt).getTime()
    const stepOutputs: Record<string, unknown> = {}
    for (const [nodeId, out] of Object.entries(execution.stepOutputs.value)) {
      stepOutputs[nodeId] = (out as { output: unknown })?.output ?? null
    }

    const saved = await runs.record({
      workflowId: workflowId.value,
      workflowName: workflow.value?.name,
      agentId: 'workflow-ui',
      status: execution.status.value === 'error' ? 'failed' : 'completed',
      startedAt,
      completedAt: finishedAt,
      durationMs,
      stepCount: execution.traces.value.length,
      input,
      output: finalState?.output ?? null,
      error: execution.error.value ?? undefined,
      traces: execution.traces.value,
      stepOutputs,
    })
    if (saved) activeRunId.value = saved.id
  }

  async function handleRunSelect(run: WorkflowRun) {
    activeRunId.value = run.id
    // The list query only returns summary fields — fetch the full run entity
    // (traces, stepOutputs, error, input/output) on demand.
    const full = (await runs.get(run.id)) || run
    execution.loadRun({
      status: full.status,
      traces: full.traces,
      stepOutputs: full.stepOutputs,
      startedAt: full.startedAt,
      error: full.error,
    })
  }

  async function handleRunRemove(runId: string) {
    await runs.remove(runId)
    if (activeRunId.value === runId) {
      activeRunId.value = null
      execution.resetState()
    }
  }

  // ── Trigger handlers ──────────────────────────────────────────────────────
  async function handleTriggerCreate(payload: {
    title: string
    kind: TriggerKind
    cron?: string
    watchType?: string
    watchAction?: EntityChangeAction
    watchAttribute?: string
  }) {
    const graph = workflow.value?.graph as WorkflowGraph | undefined
    if (!graph || !workflow.value) return
    await triggers.create({
      title: payload.title,
      workflowId: workflowId.value,
      workflowName: workflow.value.name,
      graph,
      kind: payload.kind,
      active: true,
      cron: payload.cron,
      watchType: payload.watchType,
      watchAction: payload.watchAction,
      watchAttribute: payload.watchAttribute,
    })
  }

  async function handleTriggerUpdate(ev: { id: string; patch: Partial<WorkflowTrigger> }) {
    // If re-activating or toggling, also refresh the cached graph so the server
    // runs the current workflow definition
    const graph = workflow.value?.graph as WorkflowGraph | undefined
    const patch: Partial<WorkflowTrigger> = { ...ev.patch }
    if (graph && ev.patch.active === true) {
      patch.graph = graph
      patch.workflowName = workflow.value?.name
    }
    await triggers.update(ev.id, patch)
  }

  async function handleTriggerRemove(id: string) {
    await triggers.remove(id)
  }

  async function handleTriggerFire(id: string) {
    const runId = await triggers.fireNow(id)
    if (runId) {
      // Jump to the runs tab so the user sees the result
      sidebarTab.value = 'runs'
      await runs.load()
      activeRunId.value = runId
      const full = await runs.get(runId)
      if (full) {
        execution.loadRun({
          status: full.status,
          traces: full.traces,
          stepOutputs: full.stepOutputs,
          startedAt: full.startedAt,
          error: full.error,
        })
      }
    }
  }

  async function handleCopyWebhook(t: WorkflowTrigger) {
    const url = triggers.webhookUrl(t)
    if (!url) return
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      // ignore clipboard errors (e.g. insecure context)
    }
  }

  // ── Graph validation ─────────────────────────────────────────────────
  const validationWarnings = computed<string[]>(() => {
    const graph = workflow.value?.graph
    if (!graph || graph.nodes.length === 0) return []
    const w: string[] = []
    if (!graph.nodes.some((n) => n.kind === 'start')) w.push('No Start node')
    if (!graph.nodes.some((n) => n.kind === 'end')) w.push('No End node')
    if (graph.nodes.length > 1) {
      const connected = new Set<string>()
      for (const e of graph.edges) {
        connected.add(e.source)
        connected.add(e.target)
      }
      const isolated = graph.nodes.filter((n) => !connected.has(n.id))
      if (isolated.length > 0) w.push(`${isolated.length} isolated node${isolated.length > 1 ? 's' : ''}`)
    }
    return w
  })

  // ── Export / Import ───────────────────────────────────────────────────
  function exportGraph() {
    const graph = workflow.value?.graph
    if (!graph) return
    const slug = (workflow.value?.name || 'workflow').replace(/\s+/g, '-').toLowerCase()
    const blob = new Blob([JSON.stringify(graph, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${slug}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const importInputRef = ref<HTMLInputElement | null>(null)

  function triggerImport() {
    importInputRef.value?.click()
  }

  async function handleImport(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0]
    if (!file || !workflow.value) return
    try {
      const text = await file.text()
      const graph = JSON.parse(text)
      await updateWorkflow(workflow.value.id, { graph })
    } catch {
      // malformed JSON — silently ignore for now
    } finally {
      if (importInputRef.value) importInputRef.value.value = ''
    }
  }
</script>

<template>
  <div class="flex h-full flex-col">
    <!-- Not found -->
    <template v-if="!isLoading && !workflow">
      <div class="flex flex-1 items-center justify-center">
        <div class="text-center">
          <Icon name="lucide:alert-circle" class="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
          <h2 class="mb-2 text-2xl font-bold">Workflow Not Found</h2>
          <UiButton as-child>
            <NuxtLink :to="wp('/workflows')">Back to Workflows</NuxtLink>
          </UiButton>
        </div>
      </div>
    </template>

    <!-- Loading -->
    <template v-else-if="isLoading">
      <div class="flex flex-1 items-center justify-center">
        <UiLoader />
      </div>
    </template>

    <!-- Editor -->
    <template v-else-if="workflow">
      <!-- Header bar -->
      <div class="flex h-11 shrink-0 items-center gap-2 border-b border-border bg-background px-3">
        <UiButton variant="ghost" size="icon-sm" as-child>
          <NuxtLink :to="wp('/workflows')">
            <Icon name="lucide:arrow-left" class="h-4 w-4" />
          </NuxtLink>
        </UiButton>

        <div class="flex items-center gap-1.5">
          <Icon :name="workflow.icon || 'lucide:workflow'" class="h-4 w-4 text-muted-foreground" />
          <template v-if="isEditingTitle">
            <input
              v-model="editTitle"
              class="workflow-title-input rounded border-none bg-transparent px-1 py-0.5 text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-ring"
              @blur="commitTitle"
              @keydown.enter="commitTitle"
              @keydown.escape="isEditingTitle = false" />
          </template>
          <template v-else>
            <button
              type="button"
              class="rounded px-1 py-0.5 text-sm font-semibold hover:bg-muted"
              @click="startEditTitle">
              {{ workflow.name }}
            </button>
          </template>
        </div>

        <div class="flex-1" />

        <!-- Run button -->
        <UiTooltip>
          <UiTooltipTrigger as-child>
            <UiButton
              size="sm"
              :disabled="!canRun"
              class="h-7 gap-1.5 bg-green-600 px-3 text-white hover:bg-green-500 disabled:opacity-40"
              @click="handleRun">
              <Icon
                :name="execution.status.value === 'running' ? 'lucide:loader-circle' : 'lucide:play'"
                :class="['h-3.5 w-3.5', execution.status.value === 'running' && 'animate-spin']" />
              <span>{{ execution.status.value === 'running' ? 'Running' : 'Run' }}</span>
            </UiButton>
          </UiTooltipTrigger>
          <UiTooltipContent v-if="!hasStartNode" side="bottom">Add a Start node to run this workflow</UiTooltipContent>
        </UiTooltip>

        <!-- Active toggle -->
        <div class="flex items-center gap-1.5">
          <span class="text-xs text-muted-foreground">{{ workflow.active ? 'Active' : 'Inactive' }}</span>
          <button
            type="button"
            :class="[
              'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
              workflow.active ? 'bg-green-500' : 'bg-muted',
            ]"
            @click="toggleActive">
            <span
              :class="[
                'pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform',
                workflow.active ? 'translate-x-4' : 'translate-x-0',
              ]" />
          </button>
        </div>

        <!-- Validation warnings badge -->
        <UiTooltip v-if="validationWarnings.length > 0">
          <UiTooltipTrigger as-child>
            <div
              class="flex cursor-default items-center gap-1 rounded-md bg-amber-500/10 px-2 py-1 text-xs text-amber-500">
              <Icon name="lucide:triangle-alert" class="h-3 w-3" />
              <span>{{ validationWarnings.length }}</span>
            </div>
          </UiTooltipTrigger>
          <UiTooltipContent side="bottom" class="max-w-48">
            <ul class="space-y-0.5">
              <li v-for="w in validationWarnings" :key="w">{{ w }}</li>
            </ul>
          </UiTooltipContent>
        </UiTooltip>

        <!-- Menu -->
        <input ref="importInputRef" type="file" accept=".json" class="hidden" @change="handleImport" />
        <UiDropdownMenu>
          <UiDropdownMenuTrigger as-child>
            <UiButton variant="ghost" size="icon-sm">
              <Icon name="lucide:more-horizontal" class="h-4 w-4" />
            </UiButton>
          </UiDropdownMenuTrigger>
          <UiDropdownMenuContent align="end">
            <UiDropdownMenuItem @click="exportGraph">
              <Icon name="lucide:download" class="mr-2 h-4 w-4" />
              Export Graph JSON
            </UiDropdownMenuItem>
            <UiDropdownMenuItem @click="triggerImport">
              <Icon name="lucide:upload" class="mr-2 h-4 w-4" />
              Import Graph JSON
            </UiDropdownMenuItem>
            <UiDropdownMenuSeparator />
            <UiDropdownMenuItem class="text-destructive" @click="handleDelete">
              <Icon name="lucide:trash-2" class="mr-2 h-4 w-4" />
              Delete Workflow
            </UiDropdownMenuItem>
          </UiDropdownMenuContent>
        </UiDropdownMenu>
      </div>

      <!-- Canvas + Runs panel + Execution panel -->
      <div class="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div class="flex min-h-0 flex-1 overflow-hidden">
          <FlowEditor
            :workflow-id="workflowId"
            :execution-node-states="execution.nodeStates.value"
            class="min-h-0 flex-1" />

          <aside class="flex w-72 shrink-0 flex-col overflow-hidden border-l border-border bg-background">
            <!-- Tab bar -->
            <div class="flex h-8 shrink-0 items-center border-b border-border">
              <button
                type="button"
                :class="[
                  'flex-1 h-full text-[11px] font-medium transition-colors',
                  sidebarTab === 'runs'
                    ? 'border-b-2 border-primary text-foreground'
                    : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
                ]"
                @click="sidebarTab = 'runs'">
                Runs
                <span v-if="runs.runs.value.length > 0" class="ml-1 text-muted-foreground">
                  ({{ runs.runs.value.length }})
                </span>
              </button>
              <button
                type="button"
                :class="[
                  'flex-1 h-full text-[11px] font-medium transition-colors',
                  sidebarTab === 'triggers'
                    ? 'border-b-2 border-primary text-foreground'
                    : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
                ]"
                @click="sidebarTab = 'triggers'">
                Triggers
                <span v-if="triggers.triggers.value.length > 0" class="ml-1 text-muted-foreground">
                  ({{ triggers.triggers.value.length }})
                </span>
              </button>
            </div>

            <!-- Tab content -->
            <div class="min-h-0 flex-1">
              <FlowRunsPanel
                v-if="sidebarTab === 'runs'"
                :runs="runs.runs.value"
                :is-loading="runs.isLoading.value"
                :active-run-id="activeRunId"
                @select="handleRunSelect"
                @remove="handleRunRemove"
                @refresh="runs.load()" />
              <FlowTriggersPanel
                v-else
                :triggers="triggers.triggers.value"
                :is-loading="triggers.isLoading.value"
                :workflow-id="workflowId"
                :workflow-name="workflow.name"
                @create="handleTriggerCreate"
                @update="handleTriggerUpdate"
                @remove="handleTriggerRemove"
                @fire="handleTriggerFire"
                @refresh="triggers.load()"
                @copy-webhook="handleCopyWebhook" />
            </div>
          </aside>
        </div>

        <FlowExecutionPanel
          :status="execution.status.value"
          :error="execution.error.value"
          :traces="execution.traces.value"
          :step-outputs="execution.stepOutputs.value"
          :node-states="execution.nodeStates.value"
          :active-node-id="execution.activeNodeId.value"
          :total-duration-ms="execution.totalDurationMs.value"
          :node-map="nodeMap"
          :can-run="canRun"
          @run="handleRun" />
      </div>
    </template>
  </div>
</template>
