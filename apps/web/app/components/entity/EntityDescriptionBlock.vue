<script lang="ts" setup>
  /**
   * EntityDescriptionBlock — Renders a dialog-header description with
   * AI-summary-first behavior.
   *
   * Behavior:
   *  - edit/create mode → rich text editor (original description)
   *  - view mode + summary present → shows the AI summary with an
   *    "AI summary" affordance and a toggle to show the original
   *  - view mode + generating → subtle "Summarizing…" indicator
   *  - view mode + description only → original description (line-clamp-3)
   *
   * Used by all dialog shells (Entity, Actor, Container, Document) so
   * summary rendering stays consistent across all entity types.
   */

  const props = withDefaults(
    defineProps<{
      description: string
      summary?: string
      isGeneratingSummary?: boolean
      mode?: 'view' | 'create' | 'edit'
      entityId?: string
      editorClass?: string
      placeholder?: string
      /**
       * When true, the block renders the AI-summary-only view regardless of
       * mode (no rich text editor). Used for entities whose description is
       * owned entirely by the AI pipeline — e.g. emails, where the gmail
       * notifier generates the summary on ingest and the user never edits it.
       */
      aiOnly?: boolean
    }>(),
    {
      summary: '',
      isGeneratingSummary: false,
      mode: 'edit',
      editorClass: 'opacity-50',
      placeholder: 'Add a description...',
      aiOnly: false,
    },
  )

  const emit = defineEmits<{
    'update:description': [value: string]
    regenerateSummary: []
  }>()

  const isViewMode = computed(() => props.mode === 'view' || props.aiOnly)
  const hasSummary = computed(() => !!props.summary?.trim())
  const showingOriginal = ref(false)

  // Reset toggle when switching entities.
  watch(
    () => props.entityId,
    () => {
      showingOriginal.value = false
    },
  )
</script>

<template>
  <UiRichTextEditor
    v-if="!isViewMode"
    :model-value="description"
    :placeholder="placeholder"
    seamless
    :class="editorClass"
    @update:model-value="emit('update:description', $event)" />
  <template v-else>
    <div v-if="description || hasSummary || isGeneratingSummary" class="group/summary">
      <!-- AI summary (default when available) -->
      <div v-if="hasSummary && !showingOriginal" class="flex items-start gap-2">
        <p class="text-sm text-muted-foreground leading-relaxed flex-1 whitespace-pre-line">
          {{ summary }}
        </p>
        <div class="flex items-center gap-0.5 shrink-0 opacity-0 group-hover/summary:opacity-100 transition-opacity">
          <button
            v-if="description"
            class="inline-flex items-center justify-center h-5 w-5 rounded hover:bg-muted/50 text-muted-foreground/70 hover:text-foreground transition-colors"
            title="Show original"
            @click="showingOriginal = true">
            <Icon name="lucide:file-text" class="h-3 w-3" />
          </button>
          <button
            :disabled="isGeneratingSummary"
            class="inline-flex items-center justify-center h-5 w-5 rounded hover:bg-muted/50 text-muted-foreground/70 hover:text-foreground transition-colors disabled:opacity-50"
            title="Regenerate summary"
            @click="emit('regenerateSummary')">
            <Icon name="lucide:refresh-cw" class="h-3 w-3" :class="isGeneratingSummary ? 'animate-spin' : ''" />
          </button>
        </div>
      </div>
      <!-- Generating placeholder (no summary yet, no description, or generating while source exists) -->
      <div
        v-else-if="isGeneratingSummary && !hasSummary"
        class="inline-flex items-center gap-1.5 text-sm text-muted-foreground/70 italic">
        <Icon name="lucide:loader-2" class="h-3 w-3 animate-spin" />
        Summarizing…
      </div>
      <!-- Original description -->
      <div v-else-if="description" class="flex items-start gap-2">
        <p class="text-sm text-muted-foreground leading-relaxed flex-1 line-clamp-3" v-html="description" />
        <button
          v-if="hasSummary"
          class="inline-flex items-center justify-center h-5 w-5 rounded hover:bg-muted/50 text-muted-foreground/70 hover:text-foreground transition-colors shrink-0 opacity-0 group-hover/summary:opacity-100"
          title="Show AI summary"
          @click="showingOriginal = false">
          <Icon name="lucide:sparkles" class="h-3 w-3" />
        </button>
      </div>
    </div>
    <p v-else class="text-sm text-muted-foreground italic">No description</p>
  </template>
</template>
