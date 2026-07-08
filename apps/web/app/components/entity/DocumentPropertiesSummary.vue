<script lang="ts" setup>
  const props = withDefaults(
    defineProps<{
      summary?: string
      isGeneratingSummary?: boolean
      contentLength?: number
      summaryGeneratedAt?: string
      minSourceLength?: number
    }>(),
    {
      summary: '',
      isGeneratingSummary: false,
      contentLength: 0,
      summaryGeneratedAt: '',
      minSourceLength: 120,
    },
  )

  const emit = defineEmits<{
    regenerateSummary: []
  }>()

  const hasSummary = computed(() => !!props.summary?.trim())
  const isTooShort = computed(() => props.contentLength < props.minSourceLength)

  const generatedLabel = computed(() => {
    if (!props.summaryGeneratedAt) return null
    const d = new Date(props.summaryGeneratedAt)
    if (Number.isNaN(d.getTime())) return null
    return `Generated · ${formatRelativeTime(d.getTime())}`
  })

  const showRow = computed(
    () => hasSummary.value || props.isGeneratingSummary || props.contentLength > 0,
  )
</script>

<template>
  <div v-if="showRow" class="px-3 py-3 border-b border-border/50">
    <div class="summary-block border-l-2 border-violet-400/40 pl-3">
      <div class="flex items-center justify-between gap-2 mb-1">
        <span class="text-[10px] uppercase tracking-wide text-violet-400/90 flex items-center gap-1 font-semibold">
          <Icon name="lucide:sparkles" class="h-3 w-3" />
          Summary
        </span>
        <button
          v-if="hasSummary || !isTooShort"
          type="button"
          class="inline-flex items-center justify-center h-6 w-6 rounded hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          aria-label="Regenerate summary"
          :aria-busy="isGeneratingSummary"
          :disabled="isGeneratingSummary || isTooShort"
          @click="emit('regenerateSummary')">
          <Icon name="lucide:refresh-cw" class="h-3 w-3" :class="isGeneratingSummary ? 'animate-spin' : ''" />
        </button>
      </div>

      <div v-if="hasSummary && !isGeneratingSummary" aria-label="AI-generated summary">
        <p class="text-[13px] text-muted-foreground leading-relaxed whitespace-pre-line">
          {{ summary }}
        </p>
        <p v-if="generatedLabel" class="summary-meta font-mono text-[9px] text-muted-foreground/60 mt-1.5">
          {{ generatedLabel }}
        </p>
      </div>

      <div
        v-else-if="isGeneratingSummary"
        class="inline-flex items-center gap-1.5 text-sm text-muted-foreground/70 italic"
        aria-live="polite">
        <Icon name="lucide:loader-2" class="h-3 w-3 animate-spin" />
        Summarizing…
      </div>

      <p v-else-if="isTooShort" class="text-sm text-muted-foreground italic">
        Write more to generate a summary
      </p>
    </div>
  </div>
</template>
