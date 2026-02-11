<script setup lang="ts">
  import type { TimelineDay } from '~/composables/useDashboardInsights'

  const props = defineProps<{
    days: TimelineDay[]
    todayIndex: number
  }>()

  const emit = defineEmits<{
    dayClick: [day: TimelineDay]
  }>()

  const hoveredIndex = ref<number | null>(null)

  const maxDensity = computed(() => {
    const max = Math.max(...props.days.map((d) => d.total))
    return max || 1
  })

  function barHeight(day: TimelineDay): string {
    const minH = 4
    const maxH = 36
    const h = minH + (day.total / maxDensity.value) * (maxH - minH)
    return `${Math.round(h)}px`
  }

  function barColor(day: TimelineDay): string {
    if (day.total === 0) return 'bg-muted-foreground/10'
    if (day.events > day.tasks && day.events > day.payments) return 'bg-violet-500/70'
    if (day.payments > 0 && day.payments >= day.tasks) return 'bg-amber-500/70'
    return 'bg-blue-500/70'
  }

  function barGlow(day: TimelineDay): string {
    if (!day.isToday) return ''
    return 'ring-1 ring-primary/40'
  }
</script>

<template>
  <div class="w-full">
    <!-- Day cells -->
    <div class="flex items-end gap-1">
      <div
        v-for="(day, i) in days"
        :key="day.date"
        class="group relative flex flex-1 flex-col items-center cursor-pointer"
        @mouseenter="hoveredIndex = i"
        @mouseleave="hoveredIndex = null"
        @click="emit('dayClick', day)">
        <!-- Tooltip -->
        <Transition
          enter-active-class="transition duration-150 ease-out"
          enter-from-class="opacity-0 translate-y-1"
          enter-to-class="opacity-100 translate-y-0"
          leave-active-class="transition duration-100 ease-in"
          leave-from-class="opacity-100"
          leave-to-class="opacity-0">
          <div
            v-if="hoveredIndex === i"
            class="absolute -top-20 z-10 rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-lg whitespace-nowrap">
            <p class="font-medium text-foreground">{{ day.label }}</p>
            <div v-if="day.total === 0" class="text-muted-foreground mt-0.5">Nothing scheduled</div>
            <div v-else class="mt-1 space-y-0.5 text-muted-foreground">
              <div v-if="day.tasks" class="flex items-center gap-1.5">
                <span class="h-1.5 w-1.5 rounded-full bg-blue-500" />
                {{ day.tasks }} task{{ day.tasks === 1 ? '' : 's' }}
              </div>
              <div v-if="day.events" class="flex items-center gap-1.5">
                <span class="h-1.5 w-1.5 rounded-full bg-violet-500" />
                {{ day.events }} event{{ day.events === 1 ? '' : 's' }}
              </div>
              <div v-if="day.payments" class="flex items-center gap-1.5">
                <span class="h-1.5 w-1.5 rounded-full bg-amber-500" />
                {{ day.payments }} payment{{ day.payments === 1 ? '' : 's' }}
              </div>
            </div>
          </div>
        </Transition>

        <!-- Bar -->
        <div
          :class="[
            'w-full rounded-sm transition-all duration-300',
            barColor(day),
            barGlow(day),
            hoveredIndex === i ? 'opacity-100 scale-x-110' : day.isPast ? 'opacity-50' : 'opacity-80',
          ]"
          :style="{ height: barHeight(day), minHeight: '4px' }" />

        <!-- Today marker -->
        <div
          v-if="day.isToday"
          class="mt-1.5 h-1 w-1 rounded-full bg-primary" />

        <!-- Weekday label -->
        <span
          :class="[
            'mt-1 text-[9px] leading-none select-none',
            day.isToday ? 'text-primary font-semibold' : 'text-muted-foreground/50',
          ]">
          {{ day.weekday.charAt(0) }}
        </span>
      </div>
    </div>
  </div>
</template>
