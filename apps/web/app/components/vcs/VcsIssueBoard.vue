<script setup lang="ts">
  import type { VcsIssueSummary, VcsKanbanViewMode } from '~/types/vcs-issue'

  defineProps<{
    loading: boolean
    viewMode: VcsKanbanViewMode
    columns: Array<{ status: import('~/types/vcs-issue').VcsIssueStatus; issues: VcsIssueSummary[] }>
    swimlanes: Array<{ epicId: string; epicTitle: string; issues: VcsIssueSummary[] }>
    isEpicCollapsed: (epicId: string) => boolean
  }>()

  const emit = defineEmits<{
    select: [issue: VcsIssueSummary, el: HTMLElement]
    toggleEpic: [epicId: string]
  }>()
</script>

<template>
  <div v-if="loading" class="flex gap-3 overflow-x-auto px-6 pb-6">
    <div v-for="i in 5" :key="i" class="w-[260px] shrink-0 space-y-2">
      <div class="h-8 animate-pulse rounded-md bg-muted/50" />
      <div class="h-24 animate-pulse rounded-[10px] bg-muted/30" />
      <div class="h-24 animate-pulse rounded-[10px] bg-muted/20" />
    </div>
  </div>

  <div
    v-else-if="viewMode === 'flat'"
    class="flex gap-3 overflow-x-auto px-6 pb-6"
    role="region"
    aria-label="VCS issue board">
    <VcsIssueColumn
      v-for="column in columns"
      :key="column.status"
      :status="column.status"
      :issues="column.issues"
      @select="(issue, el) => emit('select', issue, el)" />
  </div>

  <div v-else class="space-y-4 px-6 pb-6" role="region" aria-label="VCS issue board grouped by epic">
    <VcsIssueSwimlane
      v-for="lane in swimlanes"
      :key="lane.epicId"
      :epic-id="lane.epicId"
      :epic-title="lane.epicTitle"
      :issues="lane.issues"
      :collapsed="isEpicCollapsed(lane.epicId)"
      :hide-parent-on-cards="lane.epicId !== 'ungrouped'"
      @toggle="emit('toggleEpic', lane.epicId)"
      @select="(issue, el) => emit('select', issue, el)" />
  </div>
</template>
