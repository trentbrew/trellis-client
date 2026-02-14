<script setup lang="ts">
  import type { Entity } from '~/types/entity'
  import { ENTITY_TYPE_OPTIONS } from '~/types/entity'
  import { formatYmdLocal, todayYmdLocal } from '~/utils/date'

  const props = defineProps<{
    items: Entity[]
    label: string
    formatTime: (_t?: string) => string
  }>()

  const emit = defineEmits<{
    itemClick: [id: string]
    toggleComplete: [id: string]
  }>()

  const expanded = ref(false)

  const visibleItems = computed(() => {
    if (expanded.value) return props.items
    return props.items.slice(0, 5)
  })

  const hiddenCount = computed(() => Math.max(0, props.items.length - 5))

  // Group items: today vs tomorrow
  const todayStr = todayYmdLocal(new Date())
  const tomorrowStr = (() => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    return formatYmdLocal(d)
  })()

  function itemGroup(item: Entity): 'today' | 'tomorrow' | 'later' {
    if (item.startDate === todayStr) return 'today'
    if (item.startDate === tomorrowStr) return 'tomorrow'
    return 'later'
  }

  function typeIcon(type: string) {
    return ENTITY_TYPE_OPTIONS.find((t) => t.value === type)?.icon || 'lucide:circle'
  }

  const priorityDots: Record<string, string> = {
    critical: 'bg-red-500',
    high: 'bg-orange-500',
    medium: 'bg-amber-500',
    low: 'bg-blue-500',
  }

  function timeDisplay(item: Entity): string {
    if ('startTime' in item && item.startTime) {
      return props.formatTime(item.startTime)
    }
    return ''
  }

  function isTask(item: Entity): boolean {
    return item.type === 'task'
  }

  function isCompleted(item: Entity): boolean {
    return isTask(item) && (item as any).taskStatus === 'completed'
  }
</script>

<template>
  <div v-if="items.length > 0">
    <!-- Today's items -->
    <template v-for="(item, i) in visibleItems" :key="item.id">
      <!-- Section divider when crossing day boundary -->
      <div
        v-if="i === 0 || itemGroup(visibleItems[i - 1]!) !== itemGroup(item)"
        :class="[
          'flex items-center gap-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/50',
          i > 0 ? 'mt-4 pt-3 border-t border-border/30' : '',
        ]">
        <template v-if="itemGroup(item) === 'today'">
          {{ label }}
        </template>
        <template v-else-if="itemGroup(item) === 'tomorrow'">
          Tomorrow
        </template>
        <template v-else>
          Upcoming
        </template>
      </div>

      <!-- Item row -->
      <div
        role="button"
        tabindex="0"
        class="group flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left transition-colors hover:bg-muted/30 cursor-pointer"
        @click="emit('itemClick', item.id)"
        @keydown.enter="emit('itemClick', item.id)">
        <!-- Checkbox (tasks only) or type icon -->
        <button
          v-if="isTask(item)"
          type="button"
          :class="[
            'flex size-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
            isCompleted(item)
              ? 'border-emerald-500 bg-emerald-500 text-white'
              : 'border-muted-foreground/25 group-hover:border-primary/50',
          ]"
          @click.stop="emit('toggleComplete', item.id)">
          <Icon v-if="isCompleted(item)" name="lucide:check" class="size-2.5" />
        </button>
        <Icon
          v-else
          :name="typeIcon(item.type)"
          class="size-4 shrink-0 text-muted-foreground/40" />

        <!-- Time -->
        <span v-if="timeDisplay(item)" class="w-16 shrink-0 text-xs tabular-nums text-muted-foreground/60">
          {{ timeDisplay(item) }}
        </span>

        <!-- Title -->
        <span
          :class="[
            'flex-1 truncate text-sm',
            isCompleted(item) ? 'text-muted-foreground line-through' : 'text-foreground/90',
          ]">
          {{ item.title }}
        </span>

        <!-- Priority dot -->
        <span
          v-if="item.priority && item.priority !== 'medium'"
          :class="[
            'h-1.5 w-1.5 rounded-full shrink-0',
            priorityDots[item.priority] || '',
          ]" />

        <!-- Category -->
        <span class="hidden text-[10px] text-muted-foreground/40 group-hover:inline shrink-0">
          {{ item.category }}
        </span>
      </div>
    </template>

    <!-- Expand / collapse -->
    <button
      v-if="hiddenCount > 0 && !expanded"
      type="button"
      class="mt-1 flex items-center gap-1 px-2 py-1 text-[11px] text-muted-foreground/50 hover:text-muted-foreground transition-colors"
      @click="expanded = true">
      <Icon name="lucide:chevron-down" class="size-3" />
      <span>{{ hiddenCount }} more</span>
    </button>
    <button
      v-else-if="expanded && hiddenCount > 0"
      type="button"
      class="mt-1 flex items-center gap-1 px-2 py-1 text-[11px] text-muted-foreground/50 hover:text-muted-foreground transition-colors"
      @click="expanded = false">
      <Icon name="lucide:chevron-up" class="size-3" />
      <span>Show less</span>
    </button>
  </div>

  <!-- Empty state -->
  <div v-else class="flex flex-col items-center justify-center py-8 text-center">
    <Icon name="lucide:sun" class="size-8 text-muted-foreground/15 mb-2" />
    <p class="text-xs text-muted-foreground/40">Nothing coming up</p>
  </div>
</template>
