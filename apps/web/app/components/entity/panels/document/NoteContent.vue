<script lang="ts" setup>
  import { markdownToHtml } from '~/utils/markdown'

  const props = defineProps<{
    modelValue: any
    mode: 'view' | 'create' | 'edit'
  }>()

  const emit = defineEmits<{
    'update:modelValue': [value: any]
  }>()

  const item = computed({
    get: () => props.modelValue,
    set: (v) => emit('update:modelValue', v),
  })

  const isViewMode = computed(() => props.mode === 'view')

  const renderedContent = computed(() => {
    if (!item.value?.content) return '<span class="text-muted-foreground/50 italic">Empty note.</span>'
    return markdownToHtml(item.value.content)
  })
</script>

<template>
  <div class="min-h-[400px]">
    <UiRichTextEditor
      v-if="!isViewMode"
      v-model="item.content"
      placeholder="Write your note..."
      class="border-none! rounded-none!"
      mentions
      tasklist
      images
      embeds
      tables
      mathematics
      collaborative
      :entity-id="item.id" />
    <div v-else class="prose prose-sm max-w-none text-sm text-foreground p-4" v-html="renderedContent" />
  </div>
</template>
