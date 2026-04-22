<script lang="ts" setup>
  /**
   * RailBadge — iOS-style unread count pill rendered on top of a rail icon.
   *
   * Positions absolutely in the top-right corner of its parent (which must
   * be `position: relative`). Tuned to visually match the iOS notification
   * badge: bright red, rounded, small sans-serif numeric label, with a
   * subtle ring for contrast against colored app icons.
   *
   * Uses a `<Transition>` with scale+opacity for a soft pop when the count
   * appears or updates, matching native iOS micro-interactions.
   */
  import type { BadgeConfig } from '~/config/routes'

  const props = defineProps<{
    /**
     * Badge configuration — typically produced by `useRouteBadge(path)`.
     * Null means hide the badge (no DOM element rendered).
     */
    badge: BadgeConfig | null
    /**
     * Compact mode — shrinks the pill for dense rail layouts. Default is the
     * standard rail size.
     */
    compact?: boolean
  }>()

  const labelText = computed(() => {
    if (!props.badge) return ''
    return String(props.badge.label ?? '')
  })
</script>

<template>
  <Transition
    enter-active-class="transition-all duration-200 ease-out"
    enter-from-class="opacity-0 scale-50"
    enter-to-class="opacity-100 scale-100"
    leave-active-class="transition-all duration-150 ease-in"
    leave-from-class="opacity-100 scale-100"
    leave-to-class="opacity-0 scale-50">
    <span
      v-if="badge && labelText"
      :class="[
        'pointer-events-none absolute z-20 flex items-center justify-center rounded-full bg-red-500 font-semibold text-white shadow-sm ring-2 ring-card tabular-nums leading-none',
        compact
          ? 'min-w-[14px] h-[14px] text-[9px] px-[3px] -top-0.5 -right-0.5'
          : 'min-w-[16px] h-[16px] text-[10px] px-[4px] -top-0.5 -right-0.5',
      ]"
      :aria-label="`${labelText} unread`">
      {{ labelText }}
    </span>
  </Transition>
</template>
