<script lang="ts" setup>
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
</script>

<template>
  <div class="flex-1 flex flex-col min-h-0 divide-y divide-border">

    <!-- Notes / content rich text editor -->
    <div class="flex-1 flex flex-col min-h-0">
      <UiRichTextEditor
        v-if="!isViewMode"
        v-model="item.content"
        placeholder="Add notes, context, or details..."
        class="flex-1 min-h-0 border-none! rounded-none!"
        fill-height
        mentions
        tasklist
        images
        embeds
        tables
        mathematics
        :entity-id="item.id" />
      <div
        v-else-if="item.content"
        class="prose prose-sm max-w-none text-sm text-foreground flex-1 p-4"
        v-html="item.content" />
    </div>

  </div>
</template>

<style scoped></style>
