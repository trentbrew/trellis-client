<script lang="ts" setup>
  /**
   * Generic Entity Summary Panel
   *
   * Blank placeholder that fills the content area for entity types
   * without a dedicated content panel (e.g. payment, trip, sprint,
   * milestone, budget). Will become the home for customizable
   * per-entity summaries / dashboards in a future iteration.
   */
  defineProps<{
    modelValue: any
    mode: 'view' | 'create' | 'edit'
  }>()

  defineEmits<{
    'update:modelValue': [value: any]
  }>()
</script>

<template>
  <div class="flex-1 flex items-center justify-center p-8 text-muted-foreground/40">
    <div class="flex flex-col items-center gap-2 select-none">
      <Icon name="lucide:layout-dashboard" class="h-8 w-8" />
      <span class="text-xs tracking-wide">Summary</span>
    </div>
  </div>
</template>
