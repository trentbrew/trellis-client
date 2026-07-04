<script setup lang="ts">
  import type { VcsIssueSummary } from '~/types/vcs-issue'

  const props = defineProps<{
    issue: VcsIssueSummary
  }>()

  const emit = defineEmits<{
    select: [issue: VcsIssueSummary, el: HTMLElement]
  }>()

  const cardRef = ref<HTMLElement | null>(null)

  function labelClass(label: string) {
    if (label === 'proposal') return 'bg-violet-500/20 text-violet-300'
    if (label === 'spec') return 'bg-blue-500/20 text-blue-300'
    if (label === 'impl') return 'bg-emerald-500/20 text-emerald-300'
    if (label === 'review') return 'bg-amber-500/20 text-amber-300'
    if (label === 'design') return 'bg-pink-500/20 text-pink-300'
    if (label === 'needs-design') return 'bg-pink-500/10 text-pink-300 border border-dashed border-pink-500/30'
    return 'bg-muted text-muted-foreground'
  }

  function assigneeShort(value?: string) {
    if (!value) return 'unassigned'
    return value.replace(/^agent:/, '')
  }

  function onClick() {
    if (cardRef.value) emit('select', props.issue, cardRef.value)
  }
</script>

<template>
  <button
    ref="cardRef"
    type="button"
    class="w-full text-left rounded-[10px] border border-border bg-card/60 p-3 transition-colors hover:border-primary/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
    :class="props.issue.status === 'closed' ? 'opacity-75' : ''"
    :aria-label="`${props.issue.id}, ${props.issue.title}, ${props.issue.status}`"
    @click="onClick">
    <div class="font-mono text-[11px] font-medium text-primary">{{ props.issue.id }}</div>
    <div class="mt-1.5 text-[13px] font-medium leading-snug line-clamp-2">{{ props.issue.title }}</div>

    <div v-if="props.issue.labels.length" class="mt-2 flex flex-wrap gap-1">
      <span
        v-for="label in props.issue.labels.slice(0, 3)"
        :key="label"
        class="inline-flex h-5 items-center rounded-md px-1.5 text-[10px] font-medium"
        :class="labelClass(label)">
        {{ label }}
      </span>
      <span v-if="props.issue.labels.length > 3" class="text-[10px] text-muted-foreground self-center">
        +{{ props.issue.labels.length - 3 }}
      </span>
    </div>

    <div class="mt-2 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
      <span v-if="props.issue.parent" class="font-mono text-[10px]">← {{ props.issue.parent }}</span>
      <span v-else />
      <span class="inline-flex items-center gap-1 shrink-0">
        <span class="flex h-[18px] w-[18px] items-center justify-center rounded-full border border-border bg-muted text-[9px] uppercase">
          {{ assigneeShort(props.issue.assignee).slice(0, 1) }}
        </span>
        {{ assigneeShort(props.issue.assignee) }}
      </span>
    </div>

    <div v-if="props.issue.acTotal" class="mt-2 h-1 overflow-hidden rounded-full bg-indigo-500/15">
      <div
        class="h-full rounded-full bg-indigo-500"
        :style="{ width: `${Math.round(((props.issue.acPassed ?? 0) / props.issue.acTotal) * 100)}%` }" />
    </div>
  </button>
</template>
