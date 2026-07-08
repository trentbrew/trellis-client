<script lang="ts" setup>
  /**
   * EntityBodyHeader — Title input + description block, designed to live at
   * the top of an entity dialog's scrollable center column. Pairs with
   * EntityDialogShell's stripped chrome (badges/nav/close only).
   */


  const props = withDefaults(
    defineProps<{
      title: string
      description: string
      mode?: 'view' | 'create' | 'edit'
      titlePlaceholder?: string
      summary?: string
      isGeneratingSummary?: boolean
      entityId?: string
      aiOnly?: boolean
      variant?: 'default' | 'document'
      /** Tighter horizontal padding for narrow inset panels. */
      density?: 'default' | 'inset'
    }>(),
    {
      mode: 'edit',
      titlePlaceholder: 'Item name...',
      summary: '',
      isGeneratingSummary: false,
      aiOnly: false,
      variant: 'default',
      density: 'default',
    },
  )

  const emit = defineEmits<{
    'update:title': [value: string]
    'update:description': [value: string]
    regenerateSummary: []
  }>()

  const isViewMode = computed(() => props.mode === 'view')
  const isDocumentVariant = computed(() => props.variant === 'document')
  const resolvedTitlePlaceholder = computed(() => {
    if (!isDocumentVariant.value) return props.titlePlaceholder
    if (!props.titlePlaceholder || props.titlePlaceholder === 'Item name...') return 'Untitled'
    return props.titlePlaceholder
  })

  const shellClass = computed(() => {
    const inset = props.density === 'inset'
    if (isDocumentVariant.value) {
      return inset ? 'px-4 pt-6 pb-3' : 'pt-12 pb-5'
    }
    return inset ? 'px-4 pt-4 pb-3' : 'px-6 pt-6 pb-4'
  })

  const titleClass = computed(() =>
    props.density === 'inset' ? 'text-xl' : 'text-2xl',
  )
</script>

<template>
  <div :class="isDocumentVariant ? '' : 'border-b border-border'">
    <div :class="shellClass">
      <DocumentTitleField
        v-if="isDocumentVariant"
        :title="title"
        :mode="mode"
        :placeholder="resolvedTitlePlaceholder"
        @update:title="emit('update:title', $event)" />
      <template v-else>
        <textarea
          v-if="!isViewMode"
          :value="title"
          rows="1"
          :placeholder="titlePlaceholder"
          spellcheck="false"
          :class="[
            titleClass,
            'w-full min-h-0 resize-none overflow-hidden field-sizing-content font-semibold bg-transparent border border-transparent outline-none placeholder:text-muted-foreground/40 focus:ring-0 hover:border-border hover:bg-muted/20 focus:border-border focus:bg-muted/20 rounded-md px-2 py-1 -mx-2 transition-all break-words whitespace-pre-wrap leading-snug',
          ]"
          @input="emit('update:title', ($event.target as HTMLTextAreaElement).value)" />
        <h1 v-else :class="[titleClass, 'font-semibold px-2 break-words whitespace-pre-wrap leading-snug']">
          {{ title }}
        </h1>
      </template>

      <div v-if="!isDocumentVariant" class="mt-3 px-2">
        <EntityDescriptionBlock
          :description="description"
          :summary="summary"
          :is-generating-summary="isGeneratingSummary"
          :mode="mode"
          :entity-id="entityId"
          :ai-only="aiOnly"
          @update:description="emit('update:description', $event)"
          @regenerate-summary="emit('regenerateSummary')" />
      </div>

      <slot name="below" />
    </div>
  </div>
</template>
