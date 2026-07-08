<script lang="ts" setup>
  import { markdownToHtml } from '~/utils/markdown'

  const props = withDefaults(
    defineProps<{
      modelValue: any
      mode: 'view' | 'create' | 'edit'
      placeholder?: string
    }>(),
    {
      placeholder: 'Add notes…',
    },
  )

  const emit = defineEmits<{
    'update:modelValue': [value: any]
  }>()

  const item = computed({
    get: () => props.modelValue,
    set: (v) => emit('update:modelValue', v),
  })

  const isViewMode = computed(() => props.mode === 'view')

  const renderedContent = computed(() => {
    const body = item.value?.content
    if (!body) return ''
    return markdownToHtml(body)
  })

  const hasBody = computed(() => !!item.value?.content?.trim())
</script>

<template>
  <div class="min-h-[280px] flex flex-col">
    <UiRichTextEditor
      v-if="!isViewMode"
      v-model="item.content"
      :placeholder="placeholder"
      class="border-none! rounded-none! flex-1"
      mentions
      tasklist
      images
      embeds
      tables
      mathematics
      collaborative
      :entity-id="item.id" />
    <div
      v-else-if="hasBody"
      class="prose prose-sm max-w-none text-sm text-foreground px-6 py-4"
      v-html="renderedContent" />
    <p v-else class="px-6 py-8 text-sm text-muted-foreground/40 italic">No notes yet.</p>
  </div>
</template>
