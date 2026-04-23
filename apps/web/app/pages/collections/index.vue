<script setup lang="ts">
  // Bare /collections root has no landing page — bounce users to the Ontologies
  // dashboard which now hosts schema management, and let typed record browsing
  // happen via /collections/[slug].
  definePageMeta({
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
