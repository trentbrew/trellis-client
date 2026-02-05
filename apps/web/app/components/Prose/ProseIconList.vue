<script lang="ts" setup>
  defineProps<{
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
  <p :class="['text-xl font-semibold leading-relaxed', variantStyles[variant || 'default']]">
    <slot />
  </p>
</template>
