<script setup lang="ts">
  import type { PulseState } from '~/composables/useDashboardInsights'

  defineProps<{
    state: PulseState
    message: string
  }>()

  const stateConfig = {
    calm: {
      gradient: 'from-emerald-500/8 via-emerald-500/4 to-transparent',
      dot: 'bg-emerald-500/60',
      text: 'text-muted-foreground',
    },
    active: {
      gradient: 'from-blue-500/10 via-blue-500/5 to-transparent',
      dot: 'bg-blue-500/70',
      text: 'text-muted-foreground',
    },
    attention: {
      gradient: 'from-amber-500/12 via-amber-500/5 to-transparent',
      dot: 'bg-amber-500/80',
      text: 'text-amber-200/80',
    },
    urgent: {
      gradient: 'from-red-500/15 via-red-500/6 to-transparent',
      dot: 'bg-red-500',
      text: 'text-red-300/80',
    },
  } as const
</script>

<template>
  <div class="relative overflow-hidden rounded-xl">
    <!-- Ambient gradient background -->
    <div
      :class="[
        'absolute inset-0 bg-linear-to-r transition-all duration-1000',
        stateConfig[state].gradient,
      ]" />

    <!-- Content -->
    <div class="relative flex items-center gap-3 px-4 py-3">
      <!-- Pulse dot -->
      <span class="relative flex h-2 w-2 shrink-0">
        <span
          v-if="state !== 'calm'"
          :class="[
            'absolute inline-flex h-full w-full animate-ping rounded-full opacity-75',
            stateConfig[state].dot,
          ]" />
        <span
          :class="[
            'relative inline-flex h-2 w-2 rounded-full',
            stateConfig[state].dot,
          ]" />
      </span>

      <!-- Message -->
      <p :class="['text-sm', stateConfig[state].text]">
        {{ message }}
      </p>
    </div>
  </div>
</template>
