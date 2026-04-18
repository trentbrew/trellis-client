<script setup lang="ts">
  import { useGraphTypesSidebar, colorTokenToHex } from '~/composables/useGraphTypesSidebar'

  const { state, isVisible, toggle, toggleAll } = useGraphTypesSidebar()

  const allOn = computed(() => state.value.entries.every((e) => isVisible(e.type)))
</script>

<template>
  <div class="flex flex-col overflow-hidden">
    <div class="flex items-center justify-between px-3 py-2 border-b border-sidebar-border/60 shrink-0">
      <p class="text-[11px] font-medium text-sidebar-foreground/70 uppercase tracking-wide">Types</p>
      <button
        class="text-[10px] text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors"
        @click="toggleAll">
        {{ allOn ? 'Hide all' : 'Show all' }}
      </button>
    </div>
    <div class="flex-1 overflow-y-auto py-1">
      <label
        v-for="t in state.entries"
        :key="t.type"
        class="flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-sidebar-accent/40 transition-colors"
        :class="{ 'opacity-40': !isVisible(t.type) }">
        <input
          type="checkbox"
          :checked="isVisible(t.type)"
          class="h-3.5 w-3.5 rounded border-sidebar-border shrink-0 accent-primary"
          @change="toggle(t.type)" />
        <span
          class="inline-flex h-5 w-5 items-center justify-center rounded shrink-0"
          :style="{ background: colorTokenToHex(t.color) + '22', color: colorTokenToHex(t.color) }">
          <Icon :name="t.icon" class="h-3 w-3" />
        </span>
        <span class="text-xs flex-1 truncate capitalize">{{ t.label }}</span>
        <span class="text-[10px] text-sidebar-foreground/50 tabular-nums shrink-0">{{ t.count }}</span>
      </label>
    </div>
  </div>
</template>
