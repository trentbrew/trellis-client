<script setup lang="ts">
  /** Status pill with dot — sheet + collection display cells. */
  const props = defineProps<{
    label: string
    tone?: 'default' | 'ok' | 'limit' | 'over'
  }>()
</script>

<template>
  <span
    class="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px]"
    :class="{
      'border-border text-muted-foreground': !tone || tone === 'default',
      'border-border text-muted-foreground': tone === 'ok',
      'border-border text-muted-foreground': tone === 'limit',
      'border-destructive/45 text-red-300': tone === 'over',
    }"
  >
    <i
      v-if="tone && tone !== 'default'"
      class="size-1.5 shrink-0 rounded-full not-italic"
      :class="{
        'bg-success': tone === 'ok',
        'bg-warning': tone === 'limit',
        'bg-destructive': tone === 'over',
      }"
    />
    {{ label }}
  </span>
</template>
