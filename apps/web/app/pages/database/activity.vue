<script setup lang="ts">
  /** Legacy redirect: /database/activity → /ontologies/activity */
  definePageMeta({ title: 'Activity Log', icon: 'lucide:scroll-text', middleware: ['auth'] })

  const { wp } = useWorkspacePath()
  onMounted(() => navigateTo(wp('/ontologies/activity'), { replace: true }))
</script>

<template>
  <div class="flex h-full items-center justify-center">
    <Icon name="lucide:loader-2" class="h-8 w-8 animate-spin text-muted-foreground" />
  </div>
</template>
