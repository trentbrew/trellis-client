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

  const isGoal = computed(() => props.item.type === 'goal')

  const categoryColors: Record<string, string> = {
    work: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    personal: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    general: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  }

  const priorityColors: Record<string, string> = {
    critical: 'text-red-500',
    high: 'text-orange-500',
    medium: 'text-yellow-500',
    low: 'text-blue-500',
  }

  const statusColors: Record<string, string> = {
    active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    archived: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
    completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    'on-hold': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  }

  const formatDate = (d: string) => {
    try { return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) }
    catch { return d }
  }

  const progressPercent = computed(() => {
    const i = props.item as any
    if (i.targetValue && i.targetValue > 0) {
      return Math.min(100, Math.round(((i.currentValue ?? 0) / i.targetValue) * 100))
    }
    if (i.progress != null) {
      return Math.round(i.progress * 100)
    }
    return null
  })
</script>

<template>
  <UiCard
    class="relative overflow-hidden hover:shadow-lg transition-all duration-200 cursor-pointer group border-border/50"
    @click="$emit('click')">

    <UiCardHeader class="pb-2">
      <div class="flex items-start justify-between gap-2">
        <div class="flex items-center gap-2 min-w-0">
          <div :class="['flex h-7 w-7 items-center justify-center rounded-lg', `bg-${config.color}-500/10`]">
            <Icon :name="config.icon" :class="['h-3.5 w-3.5', `text-${config.color}-500`]" />
          </div>
          <span
            v-if="(item as any).category"
            :class="['rounded-full px-1.5 py-0.5 text-[10px] font-medium', categoryColors[(item as any).category] || 'bg-muted text-muted-foreground']">
            {{ (item as any).category }}
          </span>
        </div>
        <div class="flex items-center gap-2">
          <span v-if="(item as any).priority" :class="['text-xs font-medium', priorityColors[(item as any).priority] || 'text-muted-foreground']">
            {{ (item as any).priority }}
          </span>
          <span
            v-if="(item as any).status"
            :class="['rounded-full px-1.5 py-0.5 text-[10px] font-medium', statusColors[(item as any).status] || 'bg-muted text-muted-foreground']">
            {{ (item as any).status }}
          </span>
        </div>
      </div>
      <UiCardTitle class="text-base mt-2 line-clamp-1 group-hover:text-primary transition-colors">
        {{ item.title }}
      </UiCardTitle>
    </UiCardHeader>

    <UiCardContent class="pt-0 space-y-2">
      <!-- Description -->
      <p v-if="item.description" class="text-sm text-muted-foreground line-clamp-2">{{ item.description }}</p>

      <!-- Goal: progress bar -->
      <div v-if="isGoal && progressPercent != null" class="space-y-1">
        <div class="flex items-center justify-between text-xs text-muted-foreground">
          <span>{{ (item as any).metric || 'Progress' }}</span>
          <span>{{ progressPercent }}%</span>
        </div>
        <div class="h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div class="h-full rounded-full bg-emerald-500 transition-all" :style="{ width: `${progressPercent}%` }" />
        </div>
      </div>

      <!-- General progress (projects, etc.) -->
      <div v-else-if="progressPercent != null" class="space-y-1">
        <div class="flex items-center justify-between text-xs text-muted-foreground">
          <span>Progress</span>
          <span>{{ progressPercent }}%</span>
        </div>
        <div class="h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div class="h-full rounded-full bg-primary transition-all" :style="{ width: `${progressPercent}%` }" />
        </div>
      </div>

      <!-- Footer: date range + tags -->
      <div class="flex items-center justify-between text-xs text-muted-foreground border-t border-border/50 pt-2">
        <div class="flex items-center gap-1.5">
          <template v-if="(item as any).startDate">
            <span>{{ formatDate((item as any).startDate) }}</span>
            <template v-if="(item as any).endDate">
              <span class="text-muted-foreground/40">→</span>
              <span>{{ formatDate((item as any).endDate) }}</span>
            </template>
          </template>
          <span v-else-if="isGoal && (item as any).targetDate">
            Due {{ formatDate((item as any).targetDate) }}
          </span>
        </div>
        <div class="flex items-center gap-1">
          <span v-for="tag in (item.tags || []).slice(0, 2)" :key="tag" class="bg-muted/80 px-1.5 py-0.5 rounded-md text-[10px] font-medium">
            #{{ tag }}
          </span>
        </div>
      </div>
    </UiCardContent>
  </UiCard>
</template>
