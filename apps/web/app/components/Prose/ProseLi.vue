<script lang="ts" setup>
  defineProps<{
    icon?: string
    variant?: 'default' | 'info' | 'success' | 'warning' | 'error'
  }>()

  const variantStyles = {
    default: 'text-foreground',
    info: 'text-sky-600 dark:text-sky-400',
    success: 'text-emerald-600 dark:text-emerald-400',
    warning: 'text-amber-600 dark:text-amber-400',
    error: 'text-red-600 dark:text-red-400',
  }
</script>

<template>
  <li :class="['flex items-start gap-2 py-1', variantStyles[variant || 'default']]">
    <Icon v-if="icon" :name="icon" class="mt-0.5 h-4 w-4 shrink-0" />
    <span class="flex-1">
      <slot />
    </span>
  </li>
</template>
