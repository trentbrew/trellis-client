<script setup lang="ts">
  interface Props {
    title?: string
    mode?: 'floating' | 'docked'
    initialPosition?: { x: number; y: number }
    minWidth?: number
    maxWidth?: number
  }

  const props = withDefaults(defineProps<Props>(), {
    mode: 'floating',
    initialPosition: () => ({ x: 20, y: 20 }),
    minWidth: 320,
    maxWidth: 480,
  })

  const emit = defineEmits<{
    close: []
    modeChange: [mode: 'floating' | 'docked']
  }>()

  const panelRef = ref<HTMLDivElement>()
  const headerRef = ref<HTMLDivElement>()

  const position = ref({ ...props.initialPosition })
  const isDragging = ref(false)
  const dragOffset = ref({ x: 0, y: 0 })

  const panelStyle = computed(() => {
    if (props.mode === 'docked') return {}

    return {
      left: `${position.value.x}px`,
      top: `${position.value.y}px`,
      minWidth: `${props.minWidth}px`,
      maxWidth: `${props.maxWidth}px`,
    }
  })

  function startDrag(e: MouseEvent) {
    if (props.mode === 'docked') return
    if (!panelRef.value) return

    isDragging.value = true
    const rect = panelRef.value.getBoundingClientRect()
    dragOffset.value = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    }

    document.addEventListener('mousemove', onDrag)
    document.addEventListener('mouseup', stopDrag)
  }

  function onDrag(e: MouseEvent) {
    if (!isDragging.value || !panelRef.value) return

    const panelRect = panelRef.value.getBoundingClientRect()

    let newX = e.clientX - dragOffset.value.x
    let newY = e.clientY - dragOffset.value.y

    // Constrain to viewport
    newX = Math.max(0, Math.min(newX, window.innerWidth - panelRect.width))
    newY = Math.max(0, Math.min(newY, window.innerHeight - panelRect.height))

    position.value = { x: newX, y: newY }
  }

  function stopDrag() {
    isDragging.value = false
    document.removeEventListener('mousemove', onDrag)
    document.removeEventListener('mouseup', stopDrag)
  }

  function toggleMode() {
    const newMode = props.mode === 'floating' ? 'docked' : 'floating'
    emit('modeChange', newMode)
  }

  onUnmounted(() => {
    document.removeEventListener('mousemove', onDrag)
    document.removeEventListener('mouseup', stopDrag)
  })
</script>

<template>
  <div
    ref="panelRef"
    :class="[
      'z-50 overflow-hidden rounded-lg border border-border bg-card shadow-xl',
      mode === 'floating' ? 'fixed' : 'relative w-full',
      isDragging ? 'cursor-grabbing select-none' : '',
    ]"
    :style="panelStyle">
    <!-- Header -->
    <div
      ref="headerRef"
      :class="[
        'flex items-center justify-between border-b border-border bg-muted/50 px-3 py-2',
        mode === 'floating' ? 'cursor-grab' : '',
      ]"
      @mousedown="startDrag">
      <div class="flex items-center gap-2">
        <Icon name="lucide:grip-vertical" class="size-4 text-muted-foreground" />
        <span v-if="title" class="text-sm font-medium">{{ title }}</span>
        <slot name="header-title" />
      </div>
      <div class="flex items-center gap-1">
        <slot name="header-actions" />
        <UiButton
          variant="ghost"
          size="icon"
          class="size-7"
          :title="mode === 'floating' ? 'Dock panel' : 'Float panel'"
          @click="toggleMode">
          <Icon :name="mode === 'floating' ? 'lucide:panel-right' : 'lucide:move'" class="size-3.5" />
        </UiButton>
        <UiButton variant="ghost" size="icon" class="size-7" title="Close" @click="emit('close')">
          <Icon name="lucide:x" class="size-3.5" />
        </UiButton>
      </div>
    </div>

    <!-- Content -->
    <div class="max-h-[60vh] overflow-y-auto">
      <slot />
    </div>

    <!-- Footer -->
    <div v-if="$slots.footer" class="border-t border-border bg-muted/30 px-3 py-2">
      <slot name="footer" />
    </div>
  </div>
</template>
