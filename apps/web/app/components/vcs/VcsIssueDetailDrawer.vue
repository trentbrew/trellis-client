<script setup lang="ts">
  import type { VcsIssueDetail } from '~/types/vcs-issue'
  import { VCS_STATUS_LABELS } from '~/types/vcs-issue'

  defineProps<{
    open: boolean
    loading: boolean
    detail: VcsIssueDetail | null
  }>()

  const emit = defineEmits<{
    'update:open': [value: boolean]
  }>()

  const panelRef = ref<HTMLElement | null>(null)

  watch(
    () => panelRef.value,
    (el) => {
      if (el) el.focus()
    },
  )

  function close() {
    emit('update:open', false)
  }

  function criterionIcon(state: string) {
    if (state === 'passed') return '✓'
    if (state === 'failed') return '✗'
    return '○'
  }
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-50 bg-black/45"
      aria-hidden="true"
      @click="close" />

    <aside
      v-if="open"
      ref="panelRef"
      role="dialog"
      aria-modal="true"
      tabindex="-1"
      class="fixed inset-y-0 right-0 z-[51] flex w-full max-w-[420px] flex-col border-l border-border bg-background shadow-xl outline-none motion-reduce:transition-none transition-transform duration-200"
      @keydown.esc.prevent="close">
      <header class="flex items-start gap-3 border-b border-border px-5 py-4">
        <div class="min-w-0 flex-1">
          <div v-if="detail" class="font-mono text-[11px] font-medium text-primary">{{ detail.id }}</div>
          <h2 class="mt-1 text-base font-semibold leading-snug">
            {{ detail?.title ?? 'Loading issue…' }}
          </h2>
          <div v-if="detail" class="mt-2 inline-flex items-center gap-1.5 rounded-full border border-border px-2 py-0.5 text-[11px]">
            {{ VCS_STATUS_LABELS[detail.status] }}
          </div>
        </div>
        <UiButton variant="ghost" size="icon" class="shrink-0" aria-label="Close" @click="close">
          <Icon name="lucide:x" class="h-4 w-4" />
        </UiButton>
      </header>

      <div class="flex-1 overflow-y-auto px-5 py-4">
        <div v-if="loading" class="flex items-center gap-2 text-sm text-muted-foreground">
          <Icon name="lucide:loader-2" class="h-4 w-4 animate-spin" />
          Loading…
        </div>

        <template v-else-if="detail">
          <section v-if="detail.description" class="mb-5">
            <h3 class="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Description</h3>
            <p class="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{{ detail.description }}</p>
          </section>

          <section v-if="detail.labels.length" class="mb-5 flex flex-wrap gap-1">
            <span
              v-for="label in detail.labels"
              :key="label"
              class="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              {{ label }}
            </span>
          </section>

          <section v-if="detail.criteria.length" class="mb-5">
            <h3 class="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Acceptance criteria</h3>
            <div
              v-for="row in detail.criteria"
              :key="row.index"
              class="flex items-start gap-2 py-1 text-sm"
              :class="row.state === 'passed' ? 'text-foreground' : 'text-muted-foreground'">
              <span class="w-4 shrink-0">{{ criterionIcon(row.state) }}</span>
              <span>{{ row.text }}</span>
            </div>
          </section>

          <section class="text-xs leading-relaxed text-muted-foreground">
            <div v-if="detail.parent">Parent: {{ detail.parent }}</div>
            <div v-if="detail.assignee">Assignee: {{ detail.assignee }}</div>
            <div v-if="detail.branch">Branch: {{ detail.branch }}</div>
          </section>
        </template>
      </div>

      <footer v-if="detail" class="border-t border-border px-5 py-3 font-mono text-[11px] text-muted-foreground">
        Edit via CLI: trellis issue show {{ detail.id }}
      </footer>
    </aside>
  </Teleport>
</template>
