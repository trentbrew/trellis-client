<script setup lang="ts">
  defineProps<{
    title: string
    icon?: string
    iconColor?: string
    badge?: number
    badgeColor?: string
    items: Array<{
      id: string
      title: string
      status?: string
      priority?: string
      date?: string
      type?: string
      category?: string
    }>
    showPriority?: boolean
    showDate?: boolean
    showCheckbox?: boolean
    emptyMessage?: string
    emptyIcon?: string
  }>()

  const emit = defineEmits<{
    itemClick: [id: string]
    toggleComplete: [id: string]
  }>()

  const priorityColors: Record<string, string> = {
    critical: 'text-red-500',
    high: 'text-orange-500',
    medium: 'text-amber-500',
    low: 'text-blue-500',
  }

  const priorityIcons: Record<string, string> = {
    critical: 'lucide:alert-octagon',
    high: 'lucide:arrow-up',
    medium: 'lucide:minus',
    low: 'lucide:arrow-down',
  }

  const statusClasses: Record<string, string> = {
    pending: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
    'in-progress': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    overdue: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    completed: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
  }
</script>

<template>
  <div class="rounded-xl border border-border bg-card flex flex-col h-full">
    <div class="flex items-center justify-between px-5 pt-5 pb-3 shrink-0">
      <div class="flex items-center gap-2">
        <Icon v-if="icon" :name="icon" :class="['size-4', iconColor || 'text-muted-foreground/60']" />
        <span class="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{{ title }}</span>
      </div>
      <span
        v-if="badge !== undefined && badge > 0"
        :class="[
          'text-[10px] rounded-full px-2 py-0.5 font-medium',
          badgeColor || 'bg-muted text-muted-foreground',
        ]">
        {{ badge }}
      </span>
    </div>

    <div v-if="items.length === 0" class="flex-1 flex flex-col items-center justify-center px-5 pb-5 text-center">
      <Icon :name="emptyIcon || 'lucide:check-circle'" class="size-8 text-muted-foreground/20 mb-2" />
      <p class="text-xs text-muted-foreground/60">{{ emptyMessage || 'Nothing here' }}</p>
    </div>

    <div v-else class="flex-1 overflow-y-auto px-2 pb-2">
      <div
        v-for="item in items"
        :key="item.id"
        class="flex items-center gap-2.5 rounded-lg px-3 py-2.5 hover:bg-muted/50 transition-colors cursor-pointer group"
        @click="emit('itemClick', item.id)">
        <button
          v-if="showCheckbox"
          type="button"
          :class="[
            'flex size-4.5 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
            item.status === 'completed'
              ? 'border-emerald-500 bg-emerald-500 text-white'
              : 'border-muted-foreground/30 group-hover:border-primary',
          ]"
          @click.stop="emit('toggleComplete', item.id)">
          <Icon v-if="item.status === 'completed'" name="lucide:check" class="size-2.5" />
        </button>

        <Icon
          v-if="showPriority && item.priority"
          :name="priorityIcons[item.priority] || 'lucide:minus'"
          :class="['size-3.5 shrink-0', priorityColors[item.priority] || 'text-muted-foreground']" />

        <div class="flex-1 min-w-0">
          <p
            :class="[
              'text-sm truncate',
              item.status === 'completed' ? 'line-through text-muted-foreground' : 'text-foreground',
            ]">
            {{ item.title }}
          </p>
        </div>

        <span v-if="showDate && item.date" class="text-[10px] text-muted-foreground shrink-0">
          {{ item.date }}
        </span>

        <span
          v-if="item.status && item.status !== 'completed'"
          :class="[
            'rounded-full px-1.5 py-0.5 text-[9px] font-medium shrink-0 capitalize hidden group-hover:inline',
            statusClasses[item.status] || 'bg-muted text-muted-foreground',
          ]">
          {{ item.status }}
        </span>
      </div>
    </div>
  </div>
</template>
