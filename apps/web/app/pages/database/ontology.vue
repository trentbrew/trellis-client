<script setup lang="ts">
  /** Legacy redirect: /database/ontology → /ontologies/graph */
  definePageMeta({ title: 'Ontology Graph', icon: 'lucide:git-branch', middleware: ['auth'] })

  const { wp } = useWorkspacePath()
  onMounted(() => navigateTo(wp('/ontologies/graph'), { replace: true }))
</script>

<template>
  <div class="flex h-full items-center justify-center">
    <Icon name="lucide:loader-2" class="h-8 w-8 animate-spin text-muted-foreground" />
  </div>
</template>
