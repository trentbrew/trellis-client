<script setup lang="ts">
  defineProps<{
    title: string
    items: Array<{
      id: string
      title: string
      time?: string
      endTime?: string
      category?: string
      type: string
    }>
    formatTime: (t?: string) => string
    emptyMessage?: string
  }>()

  const emit = defineEmits<{
    itemClick: [id: string]
  }>()

  const categoryColors: Record<string, string> = {
    work: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    personal: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    health: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
    meeting: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
    appointment: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
    general: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  }
</script>

<template>
  <div class="rounded-xl border border-border bg-card flex flex-col h-full">
    <div class="flex items-center gap-2 px-5 pt-5 pb-3 shrink-0">
      <Icon name="lucide:calendar" class="size-4 text-blue-500" />
      <span class="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{{ title }}</span>
    </div>

    <div v-if="items.length === 0" class="flex-1 flex flex-col items-center justify-center px-5 pb-5 text-center">
      <Icon name="lucide:calendar-check" class="size-8 text-muted-foreground/20 mb-2" />
      <p class="text-xs text-muted-foreground/60">{{ emptyMessage || 'No events scheduled' }}</p>
    </div>

    <div v-else class="flex-1 overflow-y-auto px-2 pb-2 space-y-0.5">
      <div
        v-for="item in items"
        :key="item.id"
        class="flex items-center gap-3 rounded-lg px-3 py-3 hover:bg-muted/50 transition-colors cursor-pointer"
        @click="emit('itemClick', item.id)">
        <div class="w-16 shrink-0 text-center">
          <p class="text-sm font-semibold text-foreground">{{ formatTime(item.time) }}</p>
          <p v-if="item.endTime" class="text-[10px] text-muted-foreground">{{ formatTime(item.endTime) }}</p>
        </div>
        <div class="w-px h-8 bg-blue-400 dark:bg-blue-500 shrink-0 rounded-full" />
        <div class="flex-1 min-w-0">
          <p class="font-medium text-sm truncate">{{ item.title }}</p>
          <span
            v-if="item.category"
            :class="[
              'rounded-full px-1.5 py-0.5 text-[10px] font-medium',
              categoryColors[item.category] || 'bg-muted text-muted-foreground',
            ]">
            {{ item.category }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
