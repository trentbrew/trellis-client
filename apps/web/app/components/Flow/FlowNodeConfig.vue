<script setup lang="ts">
  import type { Node } from '@vue-flow/core'
  import type { WorkflowNodeKind } from '~/types/database'

  const props = defineProps<{
    node: Node
    updateNodeData: (_id: string, _data: Record<string, unknown>) => void
  }>()

  const kind = computed(() => props.node.data?.kind as WorkflowNodeKind)
  const d = computed(() => props.node.data as Record<string, unknown>)

  // ── Label ──────────────────────────────────────────────────────────────────
  const editingLabel = ref(String(d.value?.label ?? ''))
  watch(
    () => props.node.id,
    () => {
      editingLabel.value = String(d.value?.label ?? '')
      syncRoutes()
    },
  )
  function commitLabel() {
    props.updateNodeData(props.node.id, { label: editingLabel.value })
  }

  // ── Agent ──────────────────────────────────────────────────────────────────
  // Trellis supports two LLM backends (both proxied via /api/llm/generate):
  //   - Ollama (local, free) — any tag pulled locally (default: gemma4:e4b)
  //   - Gemini (cloud) — requires GEMINI_API_KEY
  const agentModels = [
    { value: 'gemma4:e4b', label: 'Gemma 4 (local, default)' },
    { value: 'gemma3:latest', label: 'Gemma 3 (local)' },
    { value: 'llama3.2:latest', label: 'Llama 3.2 (local)' },
    { value: 'qwen2.5-coder:latest', label: 'Qwen 2.5 Coder (local)' },
    { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash (cloud)' },
    { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro (cloud)' },
  ]

  function setAgent(field: string, value: unknown) {
    props.updateNodeData(props.node.id, { [field]: value })
  }

  // ── Tool ───────────────────────────────────────────────────────────────────
  // Names must match the server registry in server/utils/workflow-tools.ts.
  const toolOptions = [
    { value: 'http_request', label: 'http_request — Fetch a URL' },
    { value: 'tql_query', label: 'tql_query — Run an EQL-S query' },
    { value: 'tql_load_data', label: 'tql_load_data — Load entity data' },
    { value: 'tql_mutate', label: 'tql_mutate — Create/update/link entities' },
    { value: 'send_email', label: 'send_email — Send email via Resend' },
    { value: 'run_js', label: 'run_js — Sandboxed JS eval' },
  ]

  interface ToolArg {
    key: string
    value: string
  }
  const toolArgs = ref<ToolArg[]>([])

  watch(
    () => props.node.id,
    () => {
      toolArgs.value = ((d.value?.args as ToolArg[]) || []).map((a) => ({ ...a }))
    },
    { immediate: true },
  )

  function addArg() {
    toolArgs.value.push({ key: '', value: '' })
  }
  function removeArg(idx: number) {
    toolArgs.value.splice(idx, 1)
    saveArgs()
  }
  function saveArgs() {
    props.updateNodeData(props.node.id, { args: JSON.parse(JSON.stringify(toolArgs.value)) })
  }

  // ── Router ─────────────────────────────────────────────────────────────────
  interface RouterRoute {
    id: string
    label: string
    condition: string
  }
  const routes = ref<RouterRoute[]>([])

  function syncRoutes() {
    const existing = d.value?.routes as RouterRoute[] | undefined
    if (existing && existing.length > 0) {
      routes.value = existing.map((r) => ({ ...r }))
    } else {
      routes.value = [{ id: 'default', label: 'default', condition: '' }]
    }
  }

  watch(() => props.node.id, syncRoutes, { immediate: true })

  function addRoute() {
    routes.value.push({ id: `route-${Date.now()}`, label: `Route ${routes.value.length}`, condition: '' })
    saveRoutes()
  }
  function removeRoute(idx: number) {
    if (routes.value[idx]?.id === 'default') return
    routes.value.splice(idx, 1)
    saveRoutes()
  }
  function saveRoutes() {
    props.updateNodeData(props.node.id, { routes: JSON.parse(JSON.stringify(routes.value)) })
  }

  // ── Guard ──────────────────────────────────────────────────────────────────
  function setGuard(field: string, value: unknown) {
    props.updateNodeData(props.node.id, { [field]: value })
  }

  // ── Memory ─────────────────────────────────────────────────────────────────
  function setMemory(field: string, value: unknown) {
    props.updateNodeData(props.node.id, { [field]: value })
  }

  // ── Note ───────────────────────────────────────────────────────────────────
  function setNote(value: string) {
    props.updateNodeData(props.node.id, { content: value })
  }
</script>

<template>
  <div class="space-y-5">
    <!-- Kind badge -->
    <div class="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2.5">
      <Icon
        :name="
          {
            start: 'lucide:play',
            agent: 'lucide:sparkles',
            tool: 'lucide:wrench',
            router: 'lucide:git-branch',
            guard: 'lucide:shield',
            'memory-read': 'lucide:database',
            'memory-write': 'lucide:database-zap',
            end: 'lucide:flag',
            note: 'lucide:sticky-note',
          }[kind] || 'lucide:box'
        "
        class="h-4 w-4 shrink-0 text-muted-foreground" />
      <span class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{{ kind }}</span>
    </div>

    <!-- Label (all kinds) -->
    <div class="space-y-1.5">
      <label class="text-xs font-medium text-muted-foreground">Label</label>
      <input v-model="editingLabel" class="field" @blur="commitLabel" @keydown.enter="commitLabel" />
    </div>

    <!-- ── Agent ──────────────────────────────────────────────────────────── -->
    <template v-if="kind === 'agent'">
      <div class="space-y-1.5">
        <label class="text-xs font-medium text-muted-foreground">Model</label>
        <select
          :value="(d.model as string) || 'gpt-4o'"
          class="field"
          @change="setAgent('model', ($event.target as HTMLSelectElement).value)">
          <option v-for="m in agentModels" :key="m.value" :value="m.value">{{ m.label }}</option>
        </select>
      </div>

      <div class="space-y-1.5">
        <label class="text-xs font-medium text-muted-foreground">System Prompt</label>
        <textarea
          :value="(d.system as string) || ''"
          rows="4"
          class="field font-mono text-xs"
          placeholder="You are a helpful assistant..."
          @blur="setAgent('system', ($event.target as HTMLTextAreaElement).value)" />
      </div>

      <div class="space-y-1.5">
        <label class="text-xs font-medium text-muted-foreground">User Prompt Template</label>
        <textarea
          :value="(d.prompt as string) || ''"
          rows="3"
          class="field font-mono text-xs"
          placeholder="{{input}}"
          @blur="setAgent('prompt', ($event.target as HTMLTextAreaElement).value)" />
        <p class="text-[10px] text-muted-foreground">
          Use
          <code class="rounded bg-muted px-1">&#123;&#123;input&#125;&#125;</code>
          and
          <code class="rounded bg-muted px-1">&#123;&#123;state&#125;&#125;</code>
        </p>
      </div>

      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <label class="text-xs font-medium text-muted-foreground">Temperature</label>
          <span class="text-xs tabular-nums text-muted-foreground">{{ (d.temperature as number) ?? 0.7 }}</span>
        </div>
        <input
          type="range"
          :value="(d.temperature as number) ?? 0.7"
          min="0"
          max="2"
          step="0.1"
          class="w-full accent-primary"
          @change="setAgent('temperature', parseFloat(($event.target as HTMLInputElement).value))" />
        <div class="flex justify-between text-[10px] text-muted-foreground">
          <span>Precise (0)</span>
          <span>Creative (2)</span>
        </div>
      </div>

      <div class="flex items-center justify-between">
        <div>
          <label class="text-xs font-medium text-muted-foreground">Stream output</label>
          <p class="text-[10px] text-muted-foreground">Yield tokens as they arrive</p>
        </div>
        <button
          type="button"
          :class="[
            'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
            d.stream ? 'bg-primary' : 'bg-muted',
          ]"
          @click="setAgent('stream', !d.stream)">
          <span
            :class="[
              'inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition-transform',
              d.stream ? 'translate-x-4' : 'translate-x-0',
            ]" />
        </button>
      </div>
    </template>

    <!-- ── Tool ───────────────────────────────────────────────────────────── -->
    <template v-if="kind === 'tool'">
      <div class="space-y-1.5">
        <label class="text-xs font-medium text-muted-foreground">Tool</label>
        <select
          :value="(d.toolName as string) || ''"
          class="field"
          @change="props.updateNodeData(node.id, { toolName: ($event.target as HTMLSelectElement).value })">
          <option value="">Select tool...</option>
          <option v-for="t in toolOptions" :key="t.value" :value="t.value">{{ t.label }}</option>
        </select>
      </div>

      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <label class="text-xs font-medium text-muted-foreground">Arguments</label>
          <button type="button" class="icon-action" @click="addArg">
            <Icon name="lucide:plus" class="h-3.5 w-3.5" />
          </button>
        </div>
        <div
          v-if="toolArgs.length === 0"
          class="rounded-lg border border-dashed border-border p-3 text-center text-[11px] text-muted-foreground">
          No arguments
        </div>
        <div v-for="(arg, idx) in toolArgs" :key="idx" class="flex items-center gap-1.5">
          <input v-model="arg.key" class="field flex-1 font-mono text-xs" placeholder="key" @blur="saveArgs" />
          <input v-model="arg.value" class="field flex-1 font-mono text-xs" placeholder="value" @blur="saveArgs" />
          <button type="button" class="icon-action text-destructive" @click="removeArg(idx)">
            <Icon name="lucide:x" class="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </template>

    <!-- ── Router ─────────────────────────────────────────────────────────── -->
    <template v-if="kind === 'router'">
      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <label class="text-xs font-medium text-muted-foreground">Routes</label>
          <button type="button" class="icon-action" @click="addRoute">
            <Icon name="lucide:plus" class="h-3.5 w-3.5" />
          </button>
        </div>
        <p class="text-[10px] text-muted-foreground">
          Each route maps to an outgoing edge. Conditions are evaluated in order; the first match fires.
        </p>

        <div
          v-for="(route, idx) in routes"
          :key="route.id"
          class="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
          <div class="flex items-center gap-1.5">
            <span class="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground w-14 shrink-0">
              Label
            </span>
            <input
              v-model="route.label"
              :disabled="route.id === 'default'"
              class="field flex-1 text-xs"
              placeholder="route label"
              @blur="saveRoutes" />
            <button
              v-if="route.id !== 'default'"
              type="button"
              class="icon-action text-muted-foreground hover:text-destructive"
              @click="removeRoute(idx)">
              <Icon name="lucide:x" class="h-3.5 w-3.5" />
            </button>
            <span v-else class="text-[10px] text-muted-foreground w-5 text-center">↙</span>
          </div>
          <div v-if="route.id !== 'default'" class="flex items-start gap-1.5">
            <span class="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground w-14 shrink-0 pt-1.5">
              Condition
            </span>
            <textarea
              v-model="route.condition"
              rows="2"
              class="field flex-1 font-mono text-xs"
              placeholder="output.score > 0.8"
              @blur="saveRoutes" />
          </div>
          <div v-else class="flex items-center gap-1.5">
            <span class="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground w-14 shrink-0">
              Default
            </span>
            <span class="text-[11px] text-muted-foreground italic">Fires if no other route matches</span>
          </div>
        </div>
      </div>
    </template>

    <!-- ── Guard ──────────────────────────────────────────────────────────── -->
    <template v-if="kind === 'guard'">
      <div class="space-y-1.5">
        <label class="text-xs font-medium text-muted-foreground">Mode</label>
        <select
          :value="(d.mode as string) || 'allow'"
          class="field"
          @change="setGuard('mode', ($event.target as HTMLSelectElement).value)">
          <option value="allow">Allow if...</option>
          <option value="block">Block if...</option>
        </select>
      </div>
      <div class="space-y-1.5">
        <label class="text-xs font-medium text-muted-foreground">Condition</label>
        <textarea
          :value="(d.condition as string) || ''"
          rows="3"
          class="field font-mono text-xs"
          placeholder="input.role === 'admin'"
          @blur="setGuard('condition', ($event.target as HTMLTextAreaElement).value)" />
        <p class="text-[10px] text-muted-foreground">
          Evaluated against the current execution
          <code class="rounded bg-muted px-1">input</code>
          and
          <code class="rounded bg-muted px-1">state</code>
          .
        </p>
      </div>
    </template>

    <!-- ── Memory Read ─────────────────────────────────────────────────────── -->
    <template v-if="kind === 'memory-read'">
      <div class="space-y-1.5">
        <label class="text-xs font-medium text-muted-foreground">Key</label>
        <input
          :value="(d.key as string) || ''"
          class="field font-mono text-sm"
          placeholder="context_key"
          @blur="setMemory('key', ($event.target as HTMLInputElement).value)" />
        <p class="text-[10px] text-muted-foreground">Value is injected into the next node's input.</p>
      </div>
    </template>

    <!-- ── Memory Write ────────────────────────────────────────────────────── -->
    <template v-if="kind === 'memory-write'">
      <div class="space-y-1.5">
        <label class="text-xs font-medium text-muted-foreground">Key</label>
        <input
          :value="(d.key as string) || ''"
          class="field font-mono text-sm"
          placeholder="context_key"
          @blur="setMemory('key', ($event.target as HTMLInputElement).value)" />
      </div>
      <div class="space-y-1.5">
        <label class="text-xs font-medium text-muted-foreground">From (dot path)</label>
        <input
          :value="(d.from as string) || ''"
          class="field font-mono text-sm"
          placeholder="output.text"
          @blur="setMemory('from', ($event.target as HTMLInputElement).value)" />
        <p class="text-[10px] text-muted-foreground">
          Dot-path into the previous node's output. E.g.
          <code class="rounded bg-muted px-1">output.text</code>
        </p>
      </div>
    </template>

    <!-- ── Note ───────────────────────────────────────────────────────────── -->
    <template v-if="kind === 'note'">
      <div class="space-y-1.5">
        <label class="text-xs font-medium text-muted-foreground">Content</label>
        <textarea
          :value="(d.content as string) || ''"
          rows="8"
          class="field text-sm"
          placeholder="Add notes, instructions, or documentation..."
          @blur="setNote(($event.target as HTMLTextAreaElement).value)" />
      </div>
    </template>

    <!-- ── Start (no extra fields) ────────────────────────────────────────── -->
    <template v-if="kind === 'start'">
      <div class="rounded-lg border border-dashed border-border p-3 text-center text-[11px] text-muted-foreground">
        Entry point — every workflow starts here.
      </div>
    </template>

    <!-- ── End (no extra fields) ──────────────────────────────────────────── -->
    <template v-if="kind === 'end'">
      <div class="rounded-lg border border-dashed border-border p-3 text-center text-[11px] text-muted-foreground">
        Terminal node — workflow stops here.
      </div>
    </template>

    <!-- Position + ID debug row -->
    <div class="space-y-1 border-t border-border pt-3">
      <p class="text-[10px] text-muted-foreground">
        <span class="font-medium">Position</span>
        {{ Math.round(node.position.x) }}, {{ Math.round(node.position.y) }}
      </p>
      <p class="font-mono text-[10px] text-muted-foreground break-all">
        <span class="font-medium not-mono">ID</span>
        {{ node.id }}
      </p>
    </div>
  </div>
</template>

<style scoped>
  .field {
    width: 100%;
    border-radius: 0.375rem;
    border: 1px solid var(--border);
    background-color: transparent;
    padding: 0.375rem 0.75rem;
    font-size: 0.875rem;
    line-height: 1.25rem;
    resize: none;
  }
  .field:focus {
    outline: none;
    box-shadow: 0 0 0 1px var(--ring);
  }

  .icon-action {
    display: flex;
    height: 1.5rem;
    width: 1.5rem;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    border-radius: 0.375rem;
    color: var(--muted-foreground);
    transition:
      color 0.15s ease,
      background-color 0.15s ease;
  }
  .icon-action:hover {
    background-color: var(--muted);
    color: var(--foreground);
  }
</style>
