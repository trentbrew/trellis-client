<script lang="ts" setup>
  import type { SlashCommandItem } from '~/lib/slash-command-extension'

  const props = defineProps<{
    items: SlashCommandItem[]
    command: (item: SlashCommandItem) => void
  }>()

  const selectedIndex = ref(0)
  const menuRef = ref<HTMLElement | null>(null)

  // Group items by their group field
  const groupedItems = computed(() => {
    const groups: { label: string; items: SlashCommandItem[] }[] = []
    const seen = new Map<string, SlashCommandItem[]>()

    for (const item of props.items) {
      const g = item.group || 'Other'
      if (!seen.has(g)) {
        const arr: SlashCommandItem[] = []
        seen.set(g, arr)
        groups.push({ label: g, items: arr })
      }
      seen.get(g)!.push(item)
    }
    return groups
  })

  watch(
    () => props.items,
    () => {
      selectedIndex.value = 0
    },
  )

  // Scroll selected item into view
  watch(selectedIndex, () => {
    nextTick(() => {
      const selectedElement = menuRef.value?.querySelector('.slash-command-item.is-selected')
      if (selectedElement) {
        selectedElement.scrollIntoView({
          block: 'nearest',
          behavior: 'auto',
        })
      }
    })
  })

  function selectItem(index: number) {
    const item = props.items[index]
    if (item) {
      props.command(item)
    }
  }

  function onKeyDown(event: KeyboardEvent): boolean {
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      selectedIndex.value = (selectedIndex.value + props.items.length - 1) % props.items.length
      return true
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      selectedIndex.value = (selectedIndex.value + 1) % props.items.length
      return true
    }

    if (event.key === 'Enter') {
      event.preventDefault()
      selectItem(selectedIndex.value)
      return true
    }

    return false
  }

  defineExpose({ onKeyDown })
</script>

<template>
  <div ref="menuRef" class="slash-command-menu">
    <template v-if="items.length">
      <template v-for="group in groupedItems" :key="group.label">
        <div class="slash-command-group-label">{{ group.label }}</div>
        <button
          v-for="item in group.items"
          :key="item.id"
          class="slash-command-item"
          :class="{ 'is-selected': items.indexOf(item) === selectedIndex }"
          @click="selectItem(items.indexOf(item))"
          @mouseenter="selectedIndex = items.indexOf(item)">
          <div class="slash-command-icon">
            <Icon :name="item.icon" class="h-4 w-4" />
          </div>
          <div class="slash-command-text">
            <span class="slash-command-label">{{ item.label }}</span>
            <span class="slash-command-description">{{ item.description }}</span>
          </div>
        </button>
      </template>
    </template>
    <div v-else class="slash-command-empty">
      No results
    </div>
  </div>
</template>

<style scoped>
  .slash-command-menu {
    background: var(--popover);
    border: 1px solid var(--border);
    border-radius: 0.5rem;
    box-shadow: 0 4px 24px rgb(0 0 0 / 0.12), 0 1px 4px rgb(0 0 0 / 0.08);
    max-height: 320px;
    overflow-y: auto;
    padding: 0.25rem;
    min-width: 240px;
  }

  .slash-command-group-label {
    color: var(--muted-foreground);
    font-size: 0.65rem;
    font-weight: 600;
    letter-spacing: 0.05em;
    padding: 0.375rem 0.5rem 0.125rem;
    text-transform: uppercase;
  }

  .slash-command-item {
    align-items: center;
    border-radius: 0.375rem;
    cursor: pointer;
    display: flex;
    gap: 0.625rem;
    padding: 0.375rem 0.5rem;
    text-align: left;
    width: 100%;
    border: none;
    background: none;
  }

  .slash-command-item:hover,
  .slash-command-item.is-selected {
    background: var(--accent);
  }

  .slash-command-icon {
    align-items: center;
    background: var(--muted);
    border-radius: 0.375rem;
    color: var(--muted-foreground);
    display: flex;
    flex-shrink: 0;
    height: 2rem;
    justify-content: center;
    width: 2rem;
  }

  .slash-command-text {
    display: flex;
    flex-direction: column;
    gap: 0;
    min-width: 0;
  }

  .slash-command-label {
    color: var(--foreground);
    font-size: 0.8125rem;
    font-weight: 500;
    line-height: 1.25;
  }

  .slash-command-description {
    color: var(--muted-foreground);
    font-size: 0.6875rem;
    line-height: 1.25;
  }

  .slash-command-empty {
    color: var(--muted-foreground);
    font-size: 0.75rem;
    padding: 0.75rem;
    text-align: center;
  }
</style>
