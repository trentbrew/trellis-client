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

      <VcsKanbanProjectionRecipe
        :refreshing="refreshing"
        :sync-label="syncLabel"
        :filters="filters"
        :view-mode="viewMode"
        :available-labels="availableLabels"
        :available-assignees="availableAssignees"
        :visible-count="visibleCount"
        :has-active-filters="hasActiveFilters"
        :filters-match-nothing="filtersMatchNothing"
        :loading="loading"
        :error="error"
        :issues="issues"
        :columns="columns"
        :swimlanes="swimlanes"
        :is-epic-collapsed="isEpicCollapsed"
        :selected-id="selectedId"
        :detail="detail"
        :detail-loading="detailLoading"
        @refresh="refresh()"
        @update:filters="setFilters"
        @update:view-mode="persistViewMode"
        @clear="clearFilters()"
        @select="(issue, el) => openDetail(issue.id, el)"
        @close-detail="closeDetail"
        @toggle-epic="toggleEpicCollapsed" />
    </div>
  </Page>
</template>
