<script setup lang="ts">
  defineProps<{
    refreshing: boolean
    syncLabel: string
  }>()

  const emit = defineEmits<{
    refresh: []
  }>()
</script>

<template>
  <div class="flex items-center gap-2 px-6 py-2.5 border-b border-border bg-muted/20">
    <span
      class="inline-flex items-center rounded-full border border-border bg-background px-2.5 py-1 text-[11px] text-muted-foreground opacity-55 cursor-not-allowed"
      aria-disabled="true"
      title="Filters coming in M1">
      Labels ▾
    </span>
    <span
      class="inline-flex items-center rounded-full border border-border bg-background px-2.5 py-1 text-[11px] text-muted-foreground opacity-55 cursor-not-allowed"
      aria-disabled="true"
      title="Filters coming in M1">
      Assignee ▾
    </span>
    <div class="flex-1" />
    <UiButton variant="outline" size="sm" class="h-7 text-xs" :disabled="refreshing" @click="emit('refresh')">
      <Icon name="lucide:refresh-cw" class="h-3.5 w-3.5 mr-1" :class="refreshing ? 'animate-spin' : ''" />
      Refresh
    </UiButton>
    <span v-if="syncLabel" class="text-[11px] text-muted-foreground tabular-nums">Last sync {{ syncLabel }}</span>
  </div>
</template>
