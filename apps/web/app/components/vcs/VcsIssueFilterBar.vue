<script setup lang="ts">
  import type { VcsIssueFilters, VcsKanbanViewMode } from '~/types/vcs-issue'
  import { VCS_ASSIGNEE_UNASSIGNED } from '~/types/vcs-issue'

  const props = defineProps<{
    refreshing: boolean
    syncLabel: string
    filters: VcsIssueFilters
    viewMode: VcsKanbanViewMode
    availableLabels: string[]
    availableAssignees: string[]
    visibleCount: { shown: number; total: number }
    hasActiveFilters: boolean
  }>()

  const emit = defineEmits<{
    refresh: []
    'update:filters': [filters: VcsIssueFilters]
    'update:viewMode': [mode: VcsKanbanViewMode]
    clear: []
  }>()

  const labelsOpen = ref(false)
  const assigneeOpen = ref(false)

  function toggleLabel(label: string, checked: boolean) {
    const labels = new Set(props.filters.labels)
    if (checked) labels.add(label)
    else labels.delete(label)
    emit('update:filters', { ...props.filters, labels: [...labels] })
  }

  function toggleAssignee(assignee: string, checked: boolean) {
    const assignees = new Set(props.filters.assignees)
    if (checked) assignees.add(assignee)
    else assignees.delete(assignee)
    emit('update:filters', { ...props.filters, assignees: [...assignees] })
  }

  function assigneeLabel(value: string) {
    return value === VCS_ASSIGNEE_UNASSIGNED ? 'Unassigned' : value.replace(/^agent:/, '')
  }
</script>

<template>
  <div class="flex flex-wrap items-center gap-2 border-b border-border bg-muted/20 px-6 py-2.5">
    <UiPopover v-model:open="labelsOpen">
      <UiPopoverTrigger as-child>
        <button
          type="button"
          class="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          :class="props.filters.labels.length ? 'border-primary/50 bg-primary/10 text-foreground' : ''"
          aria-haspopup="dialog"
          :aria-expanded="labelsOpen">
          Labels
          <span
            v-if="props.filters.labels.length"
            class="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] text-primary-foreground">
            {{ props.filters.labels.length }}
          </span>
          <span v-else class="text-[9px]">▾</span>
        </button>
      </UiPopoverTrigger>
      <UiPopoverContent align="start" class="w-56 p-2" aria-label="Filter by label">
        <label
          v-for="label in props.availableLabels"
          :key="label"
          class="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-muted">
          <input
            type="checkbox"
            class="rounded border-border"
            :checked="props.filters.labels.includes(label)"
            @change="toggleLabel(label, ($event.target as HTMLInputElement).checked)" />
          {{ label }}
        </label>
        <p v-if="!props.availableLabels.length" class="px-2 py-1 text-xs text-muted-foreground">No labels</p>
      </UiPopoverContent>
    </UiPopover>

    <UiPopover v-model:open="assigneeOpen">
      <UiPopoverTrigger as-child>
        <button
          type="button"
          class="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          :class="props.filters.assignees.length ? 'border-primary/50 bg-primary/10 text-foreground' : ''"
          aria-haspopup="dialog"
          :aria-expanded="assigneeOpen">
          Assignee
          <span
            v-if="props.filters.assignees.length"
            class="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] text-primary-foreground">
            {{ props.filters.assignees.length }}
          </span>
          <span v-else class="text-[9px]">▾</span>
        </button>
      </UiPopoverTrigger>
      <UiPopoverContent align="start" class="w-56 p-2" aria-label="Filter by assignee">
        <label class="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-muted">
          <input
            type="checkbox"
            class="rounded border-border"
            :checked="props.filters.assignees.includes(VCS_ASSIGNEE_UNASSIGNED)"
            @change="toggleAssignee(VCS_ASSIGNEE_UNASSIGNED, ($event.target as HTMLInputElement).checked)" />
          Unassigned
        </label>
        <label
          v-for="assignee in props.availableAssignees"
          :key="assignee"
          class="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-muted">
          <input
            type="checkbox"
            class="rounded border-border"
            :checked="props.filters.assignees.includes(assignee)"
            @change="toggleAssignee(assignee, ($event.target as HTMLInputElement).checked)" />
          {{ assigneeLabel(assignee) }}
        </label>
      </UiPopoverContent>
    </UiPopover>

    <select
      class="h-7 rounded-md border border-border bg-background px-2 text-[11px] text-foreground"
      role="radiogroup"
      aria-label="Board layout"
      :value="props.viewMode"
      @change="emit('update:viewMode', ($event.target as HTMLSelectElement).value as VcsKanbanViewMode)">
      <option value="grouped">Grouped by epic</option>
      <option value="flat">Flat</option>
    </select>

    <button
      type="button"
      class="text-[11px] text-primary disabled:cursor-not-allowed disabled:opacity-35"
      :disabled="!props.hasActiveFilters"
      @click="emit('clear')">
      Clear
    </button>

    <div class="min-w-2 flex-1" />

    <span class="text-[11px] text-muted-foreground tabular-nums" aria-live="polite">
      Showing {{ props.visibleCount.shown }} of {{ props.visibleCount.total }}
    </span>

    <UiButton variant="outline" size="sm" class="h-7 text-xs" :disabled="refreshing" @click="emit('refresh')">
      <Icon name="lucide:refresh-cw" class="mr-1 h-3.5 w-3.5" :class="refreshing ? 'animate-spin' : ''" />
      Refresh
    </UiButton>

    <span v-if="syncLabel" class="text-[11px] text-muted-foreground tabular-nums">Last sync {{ syncLabel }}</span>
  </div>
</template>
