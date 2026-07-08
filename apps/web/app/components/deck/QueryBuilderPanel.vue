<script setup lang="ts">
  import type { QueryViewRegionConfig } from '~/types/deck'
  import { toEqlQuery } from '~/lib/deck-query-eql'

  const props = defineProps<{
    config: QueryViewRegionConfig
  }>()

  const emit = defineEmits<{
    save: [config: QueryViewRegionConfig]
  }>()

  const { queryOnce } = useTrellisGraph()

  const localQuery = ref(props.config.query)
  const localViz = ref(props.config.viz ?? 'both')
  const localTitle = ref(props.config.title ?? '')
  const previewRows = ref<number | null>(null)
  const previewError = ref<string | null>(null)
  const previewLoading = ref(false)

  watch(
    () => props.config,
    (c) => {
      localQuery.value = c.query
      localViz.value = c.viz ?? 'both'
      localTitle.value = c.title ?? ''
    },
    { deep: true },
  )

  async function runPreview() {
    previewLoading.value = true
    previewError.value = null
    previewRows.value = null
    try {
      const eql = toEqlQuery({ query: localQuery.value, viz: localViz.value, title: localTitle.value })
      const result = await queryOnce(eql)
      previewRows.value = result.data?.length ?? 0
    } catch (err: unknown) {
      previewError.value = err instanceof Error ? err.message : 'Query failed'
    } finally {
      previewLoading.value = false
    }
  }

  function saveToSlide() {
    emit('save', {
      query: localQuery.value,
      viz: localViz.value,
      title: localTitle.value || undefined,
    })
  }
</script>

<template>
  <div class="space-y-2 rounded-sm border border-border bg-muted/30 p-2.5">
    <h3 class="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Query builder</h3>
    <textarea
      v-model="localQuery"
      aria-label="EQL-S query"
      class="min-h-[72px] w-full resize-y rounded-sm border border-border bg-background px-2 py-1.5 font-mono text-[11px] text-foreground"
    />
    <div class="flex flex-wrap gap-2">
      <select
        v-model="localViz"
        aria-label="Visualization"
        class="rounded-sm border border-border bg-background px-2 py-1 font-mono text-[10px]"
      >
        <option value="both">both</option>
        <option value="tiles">tiles</option>
        <option value="chart">chart</option>
      </select>
      <input
        v-model="localTitle"
        type="text"
        placeholder="Chart title"
        aria-label="Chart title"
        class="min-w-0 flex-1 rounded-sm border border-border bg-background px-2 py-1 font-mono text-[10px]"
      />
    </div>
    <div class="flex gap-1.5">
      <button
        type="button"
        class="rounded-sm border border-border px-2 py-1 font-mono text-[9px] uppercase text-muted-foreground hover:border-violet-500 hover:text-foreground"
        :disabled="previewLoading"
        @click="runPreview"
      >
        {{ previewLoading ? 'Running…' : 'Run preview' }}
      </button>
      <button
        type="button"
        class="rounded-sm border border-violet-500/50 bg-violet-500/10 px-2 py-1 font-mono text-[9px] uppercase text-violet-300 hover:bg-violet-500/20"
        @click="saveToSlide"
      >
        Save to slide
      </button>
    </div>
    <p v-if="previewRows != null" class="font-mono text-[9px] text-emerald-400">
      Preview: {{ previewRows }} row{{ previewRows === 1 ? '' : 's' }}
    </p>
    <p v-if="previewError" role="alert" class="font-mono text-[9px] text-destructive">{{ previewError }}</p>
  </div>
</template>
