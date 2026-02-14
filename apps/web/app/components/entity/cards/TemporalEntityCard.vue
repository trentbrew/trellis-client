<script setup lang="ts">
  import type { Entity } from '~/types/entity'
  import { getEntityTypeConfig } from '~/config/entityRegistry'

  const props = defineProps<{
    item: Entity
  }>()

  defineEmits<{
    click: []
  }>()

  const config = computed(() => getEntityTypeConfig(props.item.type as any))

  const priorityColors: Record<string, string> = {
    critical: 'bg-red-500',
    high: 'bg-orange-500',
    medium: 'bg-yellow-500',
    low: 'bg-blue-500',
  }

  const statusColors: Record<string, string> = {
    'pending': 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
    'in-progress': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    'on-track': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    'due-soon': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    'overdue': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    'completed': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    'planning': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    'booked': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    'active': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    'cancelled': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    'paid': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    'draft': 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
    'closed': 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
    'over-budget': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  }

  const priorityStripe = computed(() => {
    const p = (props.item as any).priority
    return priorityColors[p] || 'bg-muted'
  })

  const itemStatus = computed(() => {
    const i = props.item as any
    return i.taskStatus || i.tripStatus || i.paymentStatus || i.sprintStatus || i.budgetStatus || i.eventType || ''
  })

  const isCompleted = computed(() => {
    const i = props.item as any
    return i.taskStatus === 'completed' || (i.achieved === true)
  })

  const formatDate = (d: string) => {
    try { return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) }
    catch { return d }
  }

  // Type-specific display value (amount for budgets/payments, velocity for sprints)
  const metricDisplay = computed(() => {
    const i = props.item as any
    if (i.type === 'budget' || i.type === 'payment') {
      const currency = i.currency || '$'
      const amount = i.amount
      return amount != null ? `${currency} ${amount.toLocaleString()}` : null
    }
    if (i.type === 'sprint' && i.velocity) {
      return `${i.velocity} pts`
    }
    return null
  })
</script>

<template>
  <UiCard
    class="relative overflow-hidden hover:shadow-lg transition-all duration-200 cursor-pointer group border-border/50"
    @click="$emit('click')">
    <!-- Priority stripe -->
    <div :class="['absolute top-0 left-0 w-1 h-full rounded-l-xl', priorityStripe]" />

    <UiCardHeader class="pb-2 pl-5">
      <div class="flex items-start justify-between gap-2">
        <div class="flex items-center gap-2 min-w-0">
          <div :class="['flex h-7 w-7 items-center justify-center rounded-lg', `bg-${config.color}-500/10`]">
            <Icon :name="config.icon" :class="['h-3.5 w-3.5', `text-${config.color}-500`]" />
          </div>
          <span v-if="(item as any).category" class="rounded-full px-1.5 py-0.5 text-[10px] font-medium bg-muted text-muted-foreground truncate">
            {{ (item as any).category }}
          </span>
        </div>
        <span v-if="itemStatus" :class="['rounded-full px-1.5 py-0.5 text-[10px] font-medium shrink-0', statusColors[itemStatus] || 'bg-muted text-muted-foreground']">
          {{ itemStatus }}
        </span>
      </div>
      <UiCardTitle
        class="text-base mt-2 line-clamp-1 group-hover:text-primary transition-colors"
        :class="{ 'line-through text-muted-foreground': isCompleted }">
        {{ item.title }}
      </UiCardTitle>
    </UiCardHeader>

    <UiCardContent class="pt-0 pl-5 space-y-2">
      <!-- Metric (amount / velocity) -->
      <p v-if="metricDisplay" class="text-lg font-semibold">{{ metricDisplay }}</p>

      <!-- Description -->
      <p v-if="item.description" class="text-sm text-muted-foreground line-clamp-2">{{ item.description }}</p>

      <!-- Sprint goal -->
      <p v-if="(item as any).sprintGoal" class="text-sm text-muted-foreground line-clamp-2">{{ (item as any).sprintGoal }}</p>

      <!-- Footer: date + tags -->
      <div class="flex items-center justify-between text-xs text-muted-foreground border-t border-border/50 pt-2">
        <div class="flex items-center gap-1.5">
          <Icon name="lucide:calendar" class="h-3 w-3 text-muted-foreground/60" />
          <span v-if="(item as any).startDate">{{ formatDate((item as any).startDate) }}</span>
          <template v-if="(item as any).endDate">
            <span class="text-muted-foreground/40">→</span>
            <span>{{ formatDate((item as any).endDate) }}</span>
          </template>
        </div>
        <div class="flex items-center gap-1">
          <span v-for="tag in (item.tags || []).slice(0, 2)" :key="tag" class="bg-muted/80 px-1.5 py-0.5 rounded-md text-[10px] font-medium">
            #{{ tag }}
          </span>
          <span v-if="(item.tags || []).length > 2" class="text-[10px] text-muted-foreground/60">
            +{{ item.tags.length - 2 }}
          </span>
        </div>
      </div>
    </UiCardContent>
  </UiCard>
</template>
