<script setup lang="ts">
  import type { VcsIssueStatus, VcsIssueSummary } from '~/types/vcs-issue'
  import { VCS_STATUS_LABELS } from '~/types/vcs-issue'

  defineProps<{
    status: VcsIssueStatus
    issues: VcsIssueSummary[]
  }>()

  const emit = defineEmits<{
    select: [issue: VcsIssueSummary, el: HTMLElement]
  }>()

  const STATUS_DOT: Record<VcsIssueStatus, string> = {
    backlog: 'bg-zinc-500',
    queue: 'bg-amber-500',
    in_progress: 'bg-emerald-500',
    paused: 'bg-yellow-500',
    closed: 'bg-zinc-600',
  }
</script>

<template>
  <section
    class="flex w-[260px] shrink-0 flex-col gap-2"
    role="group"
    :aria-label="`${VCS_STATUS_LABELS[status]}, ${issues.length} issues`">
    <header class="sticky top-0 z-[1] flex items-center gap-2 bg-background/95 py-1.5 backdrop-blur-sm">
      <span class="h-2 w-2 rounded-full" :class="STATUS_DOT[status]" />
      <span class="flex-1 text-[11px] font-semibold uppercase tracking-wider">{{ VCS_STATUS_LABELS[status] }}</span>
      <span class="inline-flex h-[22px] min-w-[22px] items-center justify-center rounded-full border border-border bg-muted px-1.5 text-[11px] text-muted-foreground tabular-nums">
        {{ issues.length }}
      </span>
    </header>

    <div class="flex min-h-[120px] flex-col gap-2">
      <VcsIssueCard
        v-for="issue in issues"
        :key="issue.id"
        :issue="issue"
        @select="(item, el) => emit('select', item, el)" />

      <div
        v-if="issues.length === 0"
        class="rounded-[10px] border border-dashed border-border px-3 py-5 text-center text-[11px] text-muted-foreground">
        {{ status === 'in_progress' ? 'Nothing in flight' : status === 'paused' ? '—' : 'Empty' }}
      </div>
    </div>
  </section>
</template>
