<script setup lang="ts">
  import type { VcsIssueStatus, VcsIssueSummary } from '~/types/vcs-issue'
  import { groupIssuesByStatus } from '~/lib/vcs-issue-filters'

  const props = defineProps<{
    epicId: string
    epicTitle: string
    issues: VcsIssueSummary[]
    collapsed: boolean
    hideParentOnCards?: boolean
  }>()

  const emit = defineEmits<{
    select: [issue: VcsIssueSummary, el: HTMLElement]
    toggle: []
  }>()

  const columns = computed(() => groupIssuesByStatus(props.issues))
  const gridId = computed(() => `swimlane-${props.epicId}-grid`)
  const isUngrouped = computed(() => props.epicId === 'ungrouped')
</script>

<template>
  <section class="overflow-hidden rounded-[10px] border border-border/80 bg-muted/10">
    <button
      type="button"
      class="flex h-10 w-full items-center gap-2 border-b border-border/80 bg-muted/30 px-4 text-left"
      :aria-expanded="!props.collapsed"
      :aria-controls="gridId"
      :aria-label="`Toggle swimlane ${props.epicTitle}`"
      @click="emit('toggle')">
      <Icon
        name="lucide:chevron-down"
        class="h-4 w-4 shrink-0 text-muted-foreground transition-transform"
        :class="props.collapsed ? '-rotate-90' : ''" />
      <span v-if="!isUngrouped" class="font-mono text-[11px] font-medium text-primary">{{ props.epicId }}</span>
      <span class="min-w-0 flex-1 truncate text-xs font-semibold">{{ props.epicTitle }}</span>
      <span class="text-[11px] text-muted-foreground tabular-nums">{{ props.issues.length }} issues</span>
    </button>

    <div
      v-show="!props.collapsed"
      :id="gridId"
      class="flex gap-3 overflow-x-auto p-3"
      role="region"
      :aria-label="`${props.epicTitle} swimlane`">
      <VcsIssueColumn
        v-for="column in columns"
        :key="column.status"
        :status="column.status"
        :issues="column.issues"
        :hide-parent="props.hideParentOnCards ?? !isUngrouped"
        @select="(issue, el) => emit('select', issue, el)" />
    </div>
  </section>
</template>
