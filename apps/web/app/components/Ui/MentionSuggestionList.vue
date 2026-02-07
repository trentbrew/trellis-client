<script lang="ts" setup>
  import type { EntitySearchItem } from '~/composables/useEntitySearch'
  import { useEntitySearch } from '~/composables/useEntitySearch'

  const props = defineProps<{
    items: EntitySearchItem[]
    command: (item: EntitySearchItem) => void
  }>()

  const { getIcon, getColor, getLabel } = useEntitySearch()

  const selectedIndex = ref(0)

  watch(
    () => props.items,
    () => {
      selectedIndex.value = 0
    },
  )

  const selectItem = (index: number) => {
    const item = props.items[index]
    if (item) props.command(item)
  }

  const onKeyDown = (event: KeyboardEvent): boolean => {
    if (event.key === 'ArrowUp') {
      selectedIndex.value = (selectedIndex.value + props.items.length - 1) % props.items.length
      return true
    }
    if (event.key === 'ArrowDown') {
      selectedIndex.value = (selectedIndex.value + 1) % props.items.length
      return true
    }
    if (event.key === 'Enter') {
      selectItem(selectedIndex.value)
      return true
    }
    return false
  }

  defineExpose({ onKeyDown })
</script>

<template>
  <div
    v-if="items.length"
    class="z-50 w-72 max-h-64 overflow-y-auto rounded-lg border border-border bg-popover shadow-lg">
    <button
      v-for="(item, index) in items"
      :key="item.id"
      :class="[
        'w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors',
        index === selectedIndex ? 'bg-accent text-accent-foreground' : 'hover:bg-muted/50',
      ]"
      @click="selectItem(index)"
      @mouseenter="selectedIndex = index">
      <div :class="['w-6 h-6 rounded flex items-center justify-center shrink-0', getColor(item.type)]">
        <Icon :name="getIcon(item.type)" class="h-3 w-3" />
      </div>
      <div class="flex-1 min-w-0">
        <p class="text-xs font-medium truncate">{{ item.title || 'Untitled' }}</p>
      </div>
      <span class="shrink-0 text-[10px] font-medium text-muted-foreground bg-muted/60 rounded px-1.5 py-0.5">
        {{ getLabel(item.type) }}
      </span>
    </button>
  </div>
  <div v-else class="z-50 w-72 rounded-lg border border-border bg-popover shadow-lg px-4 py-3 text-center">
    <p class="text-xs text-muted-foreground">No entities found</p>
  </div>
</template>
