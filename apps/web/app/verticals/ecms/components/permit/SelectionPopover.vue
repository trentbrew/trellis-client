<script setup lang="ts">
  interface Props {
    visible: boolean
    position: { x: number; y: number }
    selectedText: string
  }

  defineProps<Props>()

  const emit = defineEmits<{
    createCondition: [text: string]
    highlight: [text: string]
    close: []
  }>()
</script>

<template>
  <Teleport to="body">
    <div
      v-if="visible && selectedText"
      data-selection-popover
      class="fixed z-100 animate-in fade-in zoom-in-95 duration-150"
      :style="{ left: `${position.x}px`, top: `${position.y}px` }">
      <div class="flex items-center gap-1 rounded-lg border border-border bg-card p-1 shadow-xl">
        <UiButton
          variant="ghost"
          size="sm"
          class="h-8 gap-1.5 px-2 text-xs"
          @click="emit('createCondition', selectedText)">
          <Icon name="lucide:plus-circle" class="size-3.5 text-violet-500" />
          New Condition
        </UiButton>
        <div class="h-4 w-px bg-border" />
        <UiButton variant="ghost" size="sm" class="h-8 gap-1.5 px-2 text-xs" @click="emit('highlight', selectedText)">
          <Icon name="lucide:highlighter" class="size-3.5 text-amber-500" />
          Highlight
        </UiButton>
        <div class="h-4 w-px bg-border" />
        <UiButton variant="ghost" size="icon" class="size-8" @click="emit('close')">
          <Icon name="lucide:x" class="size-3.5" />
        </UiButton>
      </div>
    </div>
  </Teleport>
</template>
