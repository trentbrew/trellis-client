<script lang="ts" setup>
  import { useAppNavigate } from '~/composables/useAppNavigate'

  interface LayoutTemplate {
    id: string
    name: string
    description: string
    category: string
    preview: string
    icon: string
  }

  const props = defineProps<{
    template: LayoutTemplate
  }>()

  const emit = defineEmits<{
    preview: [template: LayoutTemplate]
  }>()

  const appNavigate = useAppNavigate()

  const handleClick = async (e: MouseEvent | KeyboardEvent) => {
    // For keyboard events, always navigate
    if (e.type === 'keydown') {
      await appNavigate.navigate(props.template.preview)
      emit('preview', props.template)
      return
    }

    // For mouse events, allow new-tab/middle-click behavior to work normally
    const mouseEvent = e as MouseEvent
    if (
      mouseEvent.button !== 0 ||
      mouseEvent.metaKey ||
      mouseEvent.ctrlKey ||
      mouseEvent.shiftKey ||
      mouseEvent.altKey
    ) {
      // For non-standard clicks, emit event so parent can handle it
      emit('preview', props.template)
      return
    }

    mouseEvent.preventDefault()
    // Use the transition-enabled navigation
    await appNavigate.navigate(props.template.preview, mouseEvent)
    // Also emit for any parent listeners
    emit('preview', props.template)
  }
</script>

<template>
  <div
    class="border-border bg-card group relative cursor-pointer overflow-hidden rounded-xl border transition hover:border-primary/50 hover:shadow-lg focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2"
    role="button"
    tabindex="0"
    @click="handleClick"
    @keydown.enter="handleClick"
    @keydown.space.prevent="handleClick"
  >
    <div class="bg-muted/50 flex aspect-video items-center justify-center">
      <Icon
        :name="template.icon"
        class="text-muted-foreground/50 h-12 w-12 transition-transform group-hover:scale-110"
      />
    </div>
    <div class="space-y-3 p-4">
      <div class="flex items-start justify-between gap-2">
        <div class="space-y-1">
          <h3 class="text-foreground text-sm font-semibold transition-colors group-hover:text-primary">
            {{ template.name }}
          </h3>
          <p class="text-muted-foreground text-xs">{{ template.description }}</p>
        </div>
      </div>
      <div class="flex items-center justify-between">
        <span class="bg-accent text-accent-foreground rounded-full px-2 py-0.5 text-[10px] font-medium">
          {{ template.category }}
        </span>
        <div
          class="text-muted-foreground flex items-center gap-1.5 text-xs transition-colors group-hover:text-foreground"
        >
          <Icon name="lucide:eye" class="h-3.5 w-3.5" />
          Preview
        </div>
      </div>
    </div>
  </div>
</template>
