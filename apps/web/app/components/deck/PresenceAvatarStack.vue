<script setup lang="ts">
  import type { DeckViewer } from '~/composables/useDeckPresence'

  defineProps<{
    viewers: DeckViewer[]
  }>()
</script>

<template>
  <div class="flex items-center" aria-label="Collaborators viewing deck">
    <span
      v-for="(v, i) in viewers.slice(0, 4)"
      :key="v.id"
      class="flex size-6 items-center justify-center rounded-full border-2 border-background font-mono text-[8px] font-semibold"
      :class="i > 0 ? '-ml-2' : ''"
      :style="{ background: v.self ? 'var(--presence-self, #8b5cf6)' : 'var(--presence-remote, #f59e0b)', color: v.self ? '#fff' : '#111' }"
      :title="v.self ? 'You' : v.label"
    >
      {{ v.label }}
    </span>
    <span
      v-if="viewers.length > 4"
      class="-ml-2 flex size-6 items-center justify-center rounded-full border-2 border-background bg-muted font-mono text-[8px] text-muted-foreground"
    >
      +{{ viewers.length - 4 }}
    </span>
  </div>
</template>
