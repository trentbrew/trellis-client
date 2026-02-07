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
  <div class="flex-1 flex flex-col min-h-0">
    <UiRichTextEditor
      v-if="!isViewMode"
      v-model="item.content"
      placeholder="Write your note..."
      class="flex-1 min-h-0 border-none! rounded-none!"
      fill-height
      mentions />
    <div
      v-else
      class="text-sm text-foreground whitespace-pre-wrap flex-1 p-4"
      v-html="item.content || '<span class=\'text-muted-foreground/50 italic\'>Empty note.</span>'" />
  </div>
</template>
