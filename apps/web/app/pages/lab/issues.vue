<script setup lang="ts">
  definePageMeta({
    title: 'Lab Issues',
    icon: 'lucide:square-kanban',
  })

  const {
    columns,
    swimlanes,
    filters,
    viewMode,
    availableLabels,
    availableAssignees,
    visibleCount,
    hasActiveFilters,
    filtersMatchNothing,
    workspaceRoot,
    workspaceName,
    loading,
    refreshing,
    error,
    syncLabel,
    selectedId,
    detail,
    detailLoading,
    refresh,
    openDetail,
    closeDetail,
    setFilters,
    clearFilters,
    persistViewMode,
    isEpicCollapsed,
    toggleEpicCollapsed,
    issues,
  } = useVcsIssues()

  const drawerOpen = computed({
    get: () => Boolean(selectedId.value),
    set: (value: boolean) => {
      if (!value) closeDetail()
    },
  })

  const hasIssues = computed(() => issues.value.length > 0)

  function onSelect(issue: import('~/types/vcs-issue').VcsIssueSummary, el: HTMLElement) {
    void openDetail(issue.id, el)
  }
</script>

<template>
  <Page variant="canvas" :fill-height="true" :hide-sidebar="true">
    <div class="flex h-full min-h-0 flex-col">
      <header class="flex items-start justify-between gap-4 px-6 pt-5">
        <div>
          <div class="flex items-center gap-2 text-base font-semibold">
            <Icon name="lucide:flask-conical" class="h-[18px] w-[18px] text-primary" />
            Lab
          </div>
          <LabSubNav active="issues" class="mt-3" />
        </div>
        <span
          v-if="workspaceName"
          class="rounded-full border border-border bg-background px-2.5 py-1 font-mono text-[11px] text-muted-foreground"
          :title="workspaceRoot">
          {{ workspaceName }}
        </span>
      </header>

      <VcsIssueFilterBar
        :refreshing="refreshing"
        :sync-label="syncLabel"
        :filters="filters"
        :view-mode="viewMode"
        :available-labels="availableLabels"
        :available-assignees="availableAssignees"
        :visible-count="visibleCount"
        :has-active-filters="hasActiveFilters"
        @refresh="refresh()"
        @update:filters="setFilters"
        @update:view-mode="persistViewMode"
        @clear="clearFilters()" />

      <div v-if="error?.code === 'NO_VCS_REPO'" class="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
        <Icon name="lucide:folder-x" class="h-10 w-10 text-muted-foreground/50" />
        <div class="text-sm font-medium">No TrellisVCS repo in this workspace</div>
        <p class="max-w-md text-sm text-muted-foreground">Run <code class="rounded bg-muted px-1 py-0.5 font-mono text-xs">trellis init</code> in your project root, then refresh.</p>
        <UiButton variant="outline" size="sm" @click="refresh()">Retry</UiButton>
      </div>

      <div v-else-if="error" class="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
        <Icon name="lucide:triangle-alert" class="h-10 w-10 text-destructive/70" />
        <div class="text-sm font-medium">Could not load issues</div>
        <p class="max-w-md text-sm text-muted-foreground">{{ error.message }}</p>
        <UiButton variant="outline" size="sm" @click="refresh()">Retry</UiButton>
      </div>

      <div v-else-if="filtersMatchNothing" class="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
        <Icon name="lucide:filter-x" class="h-10 w-10 text-muted-foreground/50" />
        <div class="text-sm font-medium">No issues match filters</div>
        <p class="text-sm text-muted-foreground">Try clearing filters or choosing different labels.</p>
        <UiButton variant="outline" size="sm" @click="clearFilters()">Clear filters</UiButton>
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
          @select="onSelect"
          @toggle-epic="toggleEpicCollapsed" />
      </div>

      <VcsIssueDetailDrawer
        v-model:open="drawerOpen"
        :loading="detailLoading"
        :detail="detail" />
    </div>
  </Page>
</template>
