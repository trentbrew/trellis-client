<script setup lang="ts">
  /** Legacy redirect: /database/explorer → /ontologies/explorer */
  definePageMeta({ title: 'Entity Explorer', icon: 'lucide:search', middleware: ['auth'] })

  const { wp } = useWorkspacePath()
  onMounted(() => navigateTo(wp('/ontologies/explorer'), { replace: true }))
</script>

<template>
  <div class="flex h-full items-center justify-center">
    <Icon name="lucide:loader-2" class="h-8 w-8 animate-spin text-muted-foreground" />
  </div>
</template>
