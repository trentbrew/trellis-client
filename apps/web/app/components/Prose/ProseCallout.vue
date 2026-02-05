<script lang="ts" setup>
  defineProps<{
    variant?: 'default' | 'info' | 'success' | 'warning' | 'error'
    icon?: string
    title?: string
  }>()

  const variantStyles = {
    default: 'border-border bg-muted text-foreground',
    info: 'border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-100',
    success:
      'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-100',
    warning: 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100',
    error: 'border-red-200 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-100',
  }
</script>

<template>
  <div :class="['my-6 rounded-lg border p-4', variantStyles[variant || 'default']]">
    <div v-if="title || icon" class="flex items-center gap-2 mb-2 font-semibold">
      <Icon v-if="icon" :name="icon" class="h-5 w-5" />
      <span v-if="title">{{ title }}</span>
    </div>
    <div class="prose prose-slate dark:prose-invert max-w-none">
      <slot />
    </div>
  </div>
</template>
