<script setup lang="ts">
  defineProps<{
    active: 'op-log' | 'issues'
  }>()
</script>

<template>
  <nav class="flex gap-1 border-b border-border" aria-label="Lab views">
    <NuxtLink
      to="/agent"
      class="flex items-center gap-1.5 px-3.5 py-2 text-sm border-b-2 -mb-px transition-colors"
      :class="active === 'op-log' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'"
      :aria-current="active === 'op-log' ? 'page' : undefined">
      <Icon name="lucide:activity" class="h-4 w-4" />
      Op log
    </NuxtLink>
    <NuxtLink
      to="/lab/issues"
      class="flex items-center gap-1.5 px-3.5 py-2 text-sm border-b-2 -mb-px transition-colors"
      :class="active === 'issues' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'"
      :aria-current="active === 'issues' ? 'page' : undefined">
      <Icon name="lucide:square-kanban" class="h-4 w-4" />
      Issues
    </NuxtLink>
  </nav>
</template>
