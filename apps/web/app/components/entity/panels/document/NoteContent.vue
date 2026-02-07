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

    <!-- Pin toggle -->
    <div class="p-4 flex items-center gap-3">
      <button
        v-if="!isViewMode"
        class="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs transition-colors"
        :class="item.pinned ? 'bg-primary/10 text-primary' : 'bg-muted/50 hover:bg-muted text-muted-foreground'"
        @click="item.pinned = !item.pinned">
        <Icon name="lucide:pin" class="h-3.5 w-3.5" />
        <span>{{ item.pinned ? 'Pinned' : 'Pin' }}</span>
      </button>
      <span v-else-if="item.pinned" class="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-primary/10 text-primary text-xs">
        <Icon name="lucide:pin" class="h-3.5 w-3.5" /> Pinned
      </span>
    </div>
  </div>
</template>
