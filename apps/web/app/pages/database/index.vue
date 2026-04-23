<script setup lang="ts">
  /**
   * Legacy redirect: /database → /ontologies.
   * The Database umbrella was renamed to Ontologies to match the TQL vocabulary
   * (CLI/MCP/API all use "ontology"). Record browsing lives in /collections.
   */
  definePageMeta({
    title: 'Ontologies',
    icon: 'lucide:shapes',
    middleware: ['auth'],
  })

  const { wp } = useWorkspacePath()

  onMounted(() => {
    navigateTo(wp('/ontologies'), { replace: true })
  })
</script>

<template>
  <div class="flex h-full items-center justify-center">
    <Icon name="lucide:loader-2" class="h-8 w-8 animate-spin text-muted-foreground" />
  </div>
</template>
