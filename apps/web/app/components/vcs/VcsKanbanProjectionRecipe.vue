<script setup lang="ts">
  import type {
    VcsIssueDetail,
    VcsIssueFilters,
    VcsIssueStatus,
    VcsIssueSummary,
    VcsIssueSwimlane,
    VcsIssuesErrorResponse,
    VcsKanbanViewMode,
  } from '~/types/vcs-issue'

  const props = defineProps<{
    filters: VcsIssueFilters
    viewMode: VcsKanbanViewMode
    availableLabels: string[]
    availableAssignees: string[]
    visibleCount: { shown: number; total: number }
    hasActiveFilters: boolean
    filtersMatchNothing: boolean
    loading: boolean
    refreshing: boolean
    error: VcsIssuesErrorResponse | null
    syncLabel: string
    issues: VcsIssueSummary[]
    columns: Array<{ status: VcsIssueStatus; issues: VcsIssueSummary[] }>
    swimlanes: VcsIssueSwimlane[]
    isEpicCollapsed: (_epicId: string) => boolean
    selectedId: string | null
    detail: VcsIssueDetail | null
    detailLoading: boolean
  }>()

  const emit = defineEmits<{
    ready: [payload: { projectionType: 'kanban'; total: number }]
    refresh: []
    'update:filters': [filters: VcsIssueFilters]
    'update:viewMode': [mode: VcsKanbanViewMode]
    clear: []
    select: [issue: VcsIssueSummary, el: HTMLElement]
    closeDetail: []
    toggleEpic: [epicId: string]
  }>()

  const drawerOpen = computed({
    get: () => Boolean(props.selectedId),
    set: (value: boolean) => {
      if (!value) emit('closeDetail')
    },
  })

  const hasIssues = computed(() => props.issues.length > 0)

  // Projection recipe boundary: this VCS-specific adapter presents itself as a
  // kanban renderer without moving VCS data fetching into browse/ProjectionOutlet.
  watch(
    () => props.visibleCount.total,
    (total) => emit('ready', { projectionType: 'kanban', total }),
    { immediate: true },
  )
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col" data-projection-recipe="kanban">
    <VcsIssueFilterBar
      :refreshing="refreshing"
      :sync-label="syncLabel"
      :filters="filters"
      :view-mode="viewMode"
      :available-labels="availableLabels"
      :available-assignees="availableAssignees"
      :visible-count="visibleCount"
      :has-active-filters="hasActiveFilters"
      @refresh="emit('refresh')"
      @update:filters="emit('update:filters', $event)"
      @update:view-mode="emit('update:viewMode', $event)"
      @clear="emit('clear')" />

    <div v-if="error?.code === 'NO_VCS_REPO'" class="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
      <Icon name="lucide:folder-x" class="h-10 w-10 text-muted-foreground/50" />
      <div class="text-sm font-medium">No TrellisVCS repo in this workspace</div>
      <p class="max-w-md text-sm text-muted-foreground">Run <code class="rounded bg-muted px-1 py-0.5 font-mono text-xs">trellis init</code> in your project root, then refresh.</p>
      <UiButton variant="outline" size="sm" @click="emit('refresh')">Retry</UiButton>
    </div>

    <div v-else-if="error" class="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
      <Icon name="lucide:triangle-alert" class="h-10 w-10 text-destructive/70" />
      <div class="text-sm font-medium">Could not load issues</div>
      <p class="max-w-md text-sm text-muted-foreground">{{ error.message }}</p>
      <UiButton variant="outline" size="sm" @click="emit('refresh')">Retry</UiButton>
    </div>

    <div v-else-if="filtersMatchNothing" class="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
      <Icon name="lucide:filter-x" class="h-10 w-10 text-muted-foreground/50" />
      <div class="text-sm font-medium">No issues match filters</div>
      <p class="text-sm text-muted-foreground">Try clearing filters or choosing different labels.</p>
      <UiButton variant="outline" size="sm" @click="emit('clear')">Clear filters</UiButton>
    </div>

    <div v-else-if="!loading && !hasIssues" class="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
      <Icon name="lucide:inbox" class="h-10 w-10 text-muted-foreground/50" />
      <div class="text-sm font-medium">No issues yet</div>
      <p class="text-sm text-muted-foreground">Create one with <code class="rounded bg-muted px-1 py-0.5 font-mono text-xs">trellis issue create</code></p>
    </div>

    <div v-else class="min-h-0 flex-1 overflow-auto pt-4">
      <VcsIssueBoard
        :loading="loading"
        :view-mode="viewMode"
        :columns="columns"
        :swimlanes="swimlanes"
        :is-epic-collapsed="isEpicCollapsed"
        @select="(issue, el) => emit('select', issue, el)"
        @toggle-epic="emit('toggleEpic', $event)" />
    </div>

    <VcsIssueDetailDrawer
      v-model:open="drawerOpen"
      :loading="detailLoading"
      :detail="detail" />
  </div>
</template>
