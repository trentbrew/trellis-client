<script setup lang="ts">
  import type { VcsIssueSummary } from '~/types/vcs-issue'

  defineProps<{
    loading: boolean
    columns: Array<{ status: import('~/types/vcs-issue').VcsIssueStatus; issues: VcsIssueSummary[] }>
  }>()

  const emit = defineEmits<{
    select: [issue: VcsIssueSummary, el: HTMLElement]
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

  <div v-else class="flex gap-3 overflow-x-auto px-6 pb-6" role="region" aria-label="VCS issue board">
    <VcsIssueColumn
      v-for="column in columns"
      :key="column.status"
      :status="column.status"
      :issues="column.issues"
      @select="(issue, el) => emit('select', issue, el)" />
  </div>
</template>
