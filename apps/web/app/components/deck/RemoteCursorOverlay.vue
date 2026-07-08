<script setup lang="ts">
  import type { RemoteCursor } from '~/composables/useDeckPresence'

  defineProps<{
    cursor: RemoteCursor | null
  }>()
</script>

<template>
  <div
    v-if="cursor"
    class="pointer-events-none absolute z-20 transition-all duration-[120ms] ease-out"
    :style="{ left: `${cursor.xPct}%`, top: `${cursor.yPct}%` }"
    aria-hidden="true"
  >
    <svg class="size-3.5 drop-shadow" viewBox="0 0 24 24" fill="#fbbf24">
      <path d="M5 3l14 9-6 1-3 7z" />
    </svg>
    <span
      class="absolute left-3.5 top-2.5 whitespace-nowrap rounded-full bg-amber-400 px-1.5 py-0.5 font-mono text-[8px] text-black"
    >
      {{ cursor.label }}
    </span>
  </div>
</template>
