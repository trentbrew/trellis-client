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
    <!-- Rich text content -->
    <div class="p-4 flex-1 flex flex-col min-h-0">
      <p class="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Content</p>
      <UiRichTextEditor v-if="!isViewMode" v-model="item.content" placeholder="Write your note..." class="flex-1" />
      <div v-else class="text-sm text-foreground whitespace-pre-wrap min-h-[120px] rounded-md border border-border bg-muted/10 p-3" v-html="item.content || 'Empty note.'" />
    </div>
  </div>
</template>
