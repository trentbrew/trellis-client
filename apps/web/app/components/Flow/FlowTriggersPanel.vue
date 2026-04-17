<script setup lang="ts">
  import type { WorkflowTrigger, TriggerKind, EntityChangeAction } from '~/composables/useWorkflowTriggers'

  const props = defineProps<{
    triggers: WorkflowTrigger[]
    isLoading: boolean
    workflowId: string
    workflowName?: string
  }>()

  const emit = defineEmits<{
    create: [
      payload: {
        title: string
        kind: TriggerKind
        cron?: string
        watchType?: string
        watchAction?: EntityChangeAction
        watchAttribute?: string
      },
    ]
    update: [payload: { id: string; patch: Partial<WorkflowTrigger> }]
    remove: [id: string]
    fire: [id: string]
    refresh: []
    copyWebhook: [trigger: WorkflowTrigger]
  }>()

  // ── Formatting helpers ─────────────────────────────────────────────────────
  function formatRelative(iso: string | undefined): string {
    if (!iso) return 'never'
    const t = new Date(iso).getTime()
    if (!t) return 'never'
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

  const kindMeta: Record<TriggerKind, { icon: string; label: string; color: string }> = {
    schedule: { icon: 'lucide:clock', label: 'Schedule', color: 'text-blue-500' },
    webhook: { icon: 'lucide:webhook', label: 'Webhook', color: 'text-purple-500' },
    'entity-change': { icon: 'lucide:git-branch', label: 'Entity Change', color: 'text-amber-500' },
  }

  function triggerSubtitle(t: WorkflowTrigger): string {
    if (t.kind === 'schedule' && t.cron) return t.cron
    if (t.kind === 'webhook') return t.token ? `token …${t.token.slice(-6)}` : 'no token'
    if (t.kind === 'entity-change') {
      const act = t.watchAction && t.watchAction !== 'any' ? t.watchAction : 'any change'
      return `${t.watchType || '*'} · ${act}`
    }
    return ''
  }

  // ── Add form state ─────────────────────────────────────────────────────────
  const isAdding = ref(false)
  const form = reactive({
    title: '',
    kind: 'schedule' as TriggerKind,
    cron: '*/5 * * * *',
    watchType: 'task',
    watchAction: 'createNode' as EntityChangeAction,
    watchAttribute: '',
  })

  function resetForm() {
    form.title = ''
    form.kind = 'schedule'
    form.cron = '*/5 * * * *'
    form.watchType = 'task'
    form.watchAction = 'createNode'
    form.watchAttribute = ''
  }

  function openAdd() {
    resetForm()
    isAdding.value = true
  }

  function cancelAdd() {
    isAdding.value = false
  }

  function submitAdd() {
    const title = form.title.trim() || `${kindMeta[form.kind].label} trigger`
    const payload: {
      title: string
      kind: TriggerKind
      cron?: string
      watchType?: string
      watchAction?: EntityChangeAction
      watchAttribute?: string
    } = { title, kind: form.kind }
    if (form.kind === 'schedule') payload.cron = form.cron.trim()
    if (form.kind === 'entity-change') {
      payload.watchType = form.watchType.trim()
      payload.watchAction = form.watchAction
      if (form.watchAttribute.trim()) payload.watchAttribute = form.watchAttribute.trim()
    }
    emit('create', payload)
    isAdding.value = false
  }

  // ── Per-row actions ────────────────────────────────────────────────────────
  function toggleActive(t: WorkflowTrigger) {
    emit('update', { id: t.id, patch: { active: !t.active } })
  }

  // ── Cron presets ──────────────────────────────────────────────────────────
  const cronPresets: { label: string; value: string }[] = [
    { label: 'Every minute', value: '* * * * *' },
    { label: 'Every 5 minutes', value: '*/5 * * * *' },
    { label: 'Every 15 minutes', value: '*/15 * * * *' },
    { label: 'Hourly', value: '0 * * * *' },
    { label: 'Daily at 9am', value: '0 9 * * *' },
    { label: 'Weekdays at 9am', value: '0 9 * * 1-5' },
  ]

  // ── Known entity types for entity-change watch ─────────────────────────────
  const entityTypeOptions = ['task', 'note', 'event', 'person', 'project', 'email', 'file', 'workflow-run']
</script>

<template>
  <div class="flex h-full flex-col overflow-hidden">
    <!-- Header -->
    <div class="flex h-9 shrink-0 items-center gap-2 border-b border-border px-3">
      <span class="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Triggers</span>
      <span v-if="props.triggers.length > 0" class="text-[10px] text-muted-foreground">
        · {{ props.triggers.length }}
      </span>
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
      <button
        type="button"
        class="flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        @click="openAdd">
        <Icon name="lucide:plus" class="h-3.5 w-3.5" />
      </button>
    </div>

    <!-- Add form -->
    <div v-if="isAdding" class="shrink-0 border-b border-border bg-muted/30 p-3 space-y-2">
      <div class="text-[11px] font-semibold text-foreground/80">New trigger</div>

      <!-- Kind -->
      <label class="block space-y-1">
        <span class="text-[10px] text-muted-foreground">Kind</span>
        <select
          v-model="form.kind"
          class="block w-full rounded border border-border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring">
          <option value="schedule">Schedule (cron)</option>
          <option value="webhook">Webhook (URL)</option>
          <option value="entity-change">Entity Change</option>
        </select>
      </label>

      <!-- Title -->
      <label class="block space-y-1">
        <span class="text-[10px] text-muted-foreground">Title (optional)</span>
        <input
          v-model="form.title"
          type="text"
          :placeholder="`${kindMeta[form.kind].label} trigger`"
          class="block w-full rounded border border-border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring" />
      </label>

      <!-- Schedule fields -->
      <template v-if="form.kind === 'schedule'">
        <label class="block space-y-1">
          <span class="text-[10px] text-muted-foreground">Cron expression</span>
          <input
            v-model="form.cron"
            type="text"
            placeholder="*/5 * * * *"
            class="block w-full rounded border border-border bg-background px-2 py-1 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-ring" />
        </label>
        <div class="flex flex-wrap gap-1">
          <button
            v-for="preset in cronPresets"
            :key="preset.value"
            type="button"
            class="rounded bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground ring-1 ring-border transition-colors hover:bg-muted hover:text-foreground"
            :title="preset.value"
            @click="form.cron = preset.value">
            {{ preset.label }}
          </button>
        </div>
      </template>

      <!-- Webhook fields -->
      <template v-else-if="form.kind === 'webhook'">
        <div
          class="rounded border border-dashed border-border bg-background/60 px-2 py-2 text-[10px] text-muted-foreground">
          A URL token will be generated. POST any JSON to that URL to fire the workflow.
        </div>
      </template>

      <!-- Entity change fields -->
      <template v-else-if="form.kind === 'entity-change'">
        <label class="block space-y-1">
          <span class="text-[10px] text-muted-foreground">Watch type</span>
          <select
            v-model="form.watchType"
            class="block w-full rounded border border-border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring">
            <option v-for="t in entityTypeOptions" :key="t" :value="t">{{ t }}</option>
          </select>
        </label>
        <label class="block space-y-1">
          <span class="text-[10px] text-muted-foreground">Action</span>
          <select
            v-model="form.watchAction"
            class="block w-full rounded border border-border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring">
            <option value="createNode">Create</option>
            <option value="updateNode">Update</option>
            <option value="deleteNode">Delete</option>
            <option value="any">Any</option>
          </select>
        </label>
        <label class="block space-y-1">
          <span class="text-[10px] text-muted-foreground">Attribute filter (optional)</span>
          <input
            v-model="form.watchAttribute"
            type="text"
            placeholder="e.g. taskStatus"
            class="block w-full rounded border border-border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring" />
        </label>
      </template>

      <div class="flex items-center justify-end gap-2 pt-1">
        <button
          type="button"
          class="rounded px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          @click="cancelAdd">
          Cancel
        </button>
        <button
          type="button"
          class="rounded bg-primary px-2 py-1 text-[11px] font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          @click="submitAdd">
          Create
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div
      v-if="props.isLoading && props.triggers.length === 0 && !isAdding"
      class="flex flex-1 items-center justify-center p-4 text-[11px] text-muted-foreground">
      <Icon name="lucide:loader-circle" class="mr-2 h-3.5 w-3.5 animate-spin" />
      Loading triggers…
    </div>

    <!-- Empty -->
    <div
      v-else-if="props.triggers.length === 0 && !isAdding"
      class="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center text-[11px] text-muted-foreground">
      <Icon name="lucide:zap" class="h-5 w-5 opacity-50" />
      <p>No triggers yet.</p>
      <p class="text-[10px] opacity-60">
        Triggers fire workflows automatically — on a schedule, via a webhook, or when entities change.
      </p>
      <button
        type="button"
        class="mt-1 rounded bg-primary px-2 py-1 text-[11px] font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        @click="openAdd">
        Add trigger
      </button>
    </div>

    <!-- List -->
    <div v-else-if="props.triggers.length > 0" class="flex-1 overflow-y-auto">
      <div
        v-for="t in props.triggers"
        :key="t.id"
        class="group flex items-center gap-2 border-b border-border/50 px-3 py-2 transition-colors hover:bg-muted/40">
        <!-- Kind icon -->
        <Icon :name="kindMeta[t.kind].icon" :class="['h-3.5 w-3.5 shrink-0', kindMeta[t.kind].color]" />

        <!-- Main content -->
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-1.5 text-xs">
            <span class="truncate font-medium text-foreground/90">{{ t.title }}</span>
            <span
              v-if="!t.active"
              class="rounded bg-muted px-1 py-0 text-[9px] font-medium uppercase text-muted-foreground">
              off
            </span>
          </div>
          <div class="mt-0.5 truncate font-mono text-[10px] text-muted-foreground">
            {{ triggerSubtitle(t) }}
          </div>
          <div class="mt-0.5 flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <span>{{ t.fireCount ?? 0 }} fires</span>
            <span>·</span>
            <span>{{ formatRelative(t.lastFiredAt) }}</span>
          </div>
          <div v-if="t.lastError" class="mt-0.5 truncate text-[10px] text-destructive">{{ t.lastError }}</div>
        </div>

        <!-- Actions -->
        <div class="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          <UiTooltip v-if="t.kind === 'webhook' && t.token">
            <UiTooltipTrigger as-child>
              <button
                type="button"
                class="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
                @click="emit('copyWebhook', t)">
                <Icon name="lucide:copy" class="h-3 w-3" />
              </button>
            </UiTooltipTrigger>
            <UiTooltipContent side="left">Copy webhook URL</UiTooltipContent>
          </UiTooltip>

          <UiTooltip>
            <UiTooltipTrigger as-child>
              <button
                type="button"
                class="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
                @click="emit('fire', t.id)">
                <Icon name="lucide:play" class="h-3 w-3" />
              </button>
            </UiTooltipTrigger>
            <UiTooltipContent side="left">Fire now</UiTooltipContent>
          </UiTooltip>

          <UiTooltip>
            <UiTooltipTrigger as-child>
              <button
                type="button"
                class="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
                @click="toggleActive(t)">
                <Icon :name="t.active ? 'lucide:pause' : 'lucide:power'" class="h-3 w-3" />
              </button>
            </UiTooltipTrigger>
            <UiTooltipContent side="left">{{ t.active ? 'Disable' : 'Enable' }}</UiTooltipContent>
          </UiTooltip>

          <UiTooltip>
            <UiTooltipTrigger as-child>
              <button
                type="button"
                class="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                @click="emit('remove', t.id)">
                <Icon name="lucide:trash-2" class="h-3 w-3" />
              </button>
            </UiTooltipTrigger>
            <UiTooltipContent side="left">Delete</UiTooltipContent>
          </UiTooltip>
        </div>

        <!-- Active dot (always visible) -->
        <span
          :class="[
            'h-1.5 w-1.5 shrink-0 rounded-full transition-colors',
            t.active ? 'bg-green-500' : 'bg-muted-foreground/30',
          ]" />
      </div>
    </div>
  </div>
</template>
