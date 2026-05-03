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
  <div class="divide-y divide-border">
    <!-- Notes / content rich text editor -->
    <div class="min-h-[400px]">
      <UiRichTextEditor
        v-if="!isViewMode"
        v-model="item.content"
        placeholder="Add notes, context, or details..."
        class="border-none! rounded-none!"
        mentions
        tasklist
        images
        embeds
        tables
        mathematics
        :entity-id="item.id" />
      <div
        v-else-if="item.content"
        class="prose prose-sm max-w-none text-sm text-foreground p-4"
        v-html="item.content" />
    </div>
  </div>
</template>

<style scoped></style>
