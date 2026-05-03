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
    }>(),
    {
      mode: 'edit',
      titlePlaceholder: 'Item name...',
      summary: '',
      isGeneratingSummary: false,
      aiOnly: false,
    },
  )

  const emit = defineEmits<{
    'update:title': [value: string]
    'update:description': [value: string]
    regenerateSummary: []
  }>()

  const isViewMode = computed(() => props.mode === 'view')
</script>

<template>
  <div class="border-b border-border">
    <div class="px-6 pt-6 pb-4">
      <input
        v-if="!isViewMode"
        :value="title"
        type="text"
        :placeholder="titlePlaceholder"
        spellcheck="false"
        class="w-full text-2xl font-semibold bg-transparent border border-transparent outline-none placeholder:text-muted-foreground/40 focus:ring-0 hover:border-border hover:bg-muted/20 focus:border-border focus:bg-muted/20 rounded-md px-2 py-1 -mx-2 transition-all"
        @input="emit('update:title', ($event.target as HTMLInputElement).value)" />
      <h1 v-else class="text-2xl font-semibold px-2">{{ title }}</h1>

      <div class="mt-3 px-2">
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
