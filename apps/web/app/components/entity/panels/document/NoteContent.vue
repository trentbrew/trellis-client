<script lang="ts" setup>
  import { markdownToHtml } from '~/utils/markdown'
  import { isEntityReference } from '~/types/entity'

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
  const { items } = useTrellisEntities()

  /** Linked audio file from voice memo references (first audio/* file ref). */
  const linkedAudioUrl = computed(() => {
    const refs = item.value?.references
    if (!Array.isArray(refs)) return null

    for (const ref of refs) {
      if (!isEntityReference(ref) || ref.entityType !== 'file') continue
      const fileEntity = (items.value as any[]).find((e) => e.id === ref.entityId)
      const mime = fileEntity?.mimeType as string | undefined
      if (mime?.startsWith('audio/') && fileEntity?.url) {
        return fileEntity.url as string
      }
    }
    return null
  })

  const renderedContent = computed(() => {
    if (!item.value?.content) return '<span class="text-muted-foreground/50 italic">Empty note.</span>'
    return markdownToHtml(item.value.content)
  })
</script>

<template>
  <div class="min-h-full w-full min-w-0">
    <div
      v-if="linkedAudioUrl"
      class="mb-4 pb-0 pt-4">
      <div class="mb-2 flex items-center gap-2">
        <Icon name="lucide:mic" class="h-3.5 w-3.5 text-muted-foreground" />
        <span class="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Voice recording</span>
      </div>
      <audio :src="linkedAudioUrl" controls class="h-9 w-full" />
    </div>

    <div v-if="!isViewMode" data-testid="note-body-editor" class="w-full min-w-0">
      <UiRichTextEditor
        v-model="item.content"
        placeholder="Type something..."
        class="w-full min-w-0 overflow-x-auto border-none! rounded-none!"
        mentions
        tasklist
        images
        embeds
        tables
        mathematics
        collaborative
        :entity-id="item.id" />
    </div>
    <div v-else class="prose prose-sm max-w-none w-full min-w-0 text-sm text-foreground" v-html="renderedContent" />
  </div>
</template>
