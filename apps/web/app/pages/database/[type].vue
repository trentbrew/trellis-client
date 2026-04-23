<script setup lang="ts">
  /**
   * Legacy redirect: /database/[type] → /ontologies/[type]
   *
   * This used to be the record browser. Record browsing now lives in
   * /collections/[type] and the per-type workspace pages; the slug route
   * under /ontologies focuses exclusively on schema editing.
   */
  definePageMeta({ title: 'Schema Editor', icon: 'lucide:shapes', middleware: ['auth'] })

  const route = useRoute()
  const { wp } = useWorkspacePath()

  onMounted(() => {
    const type = String(route.params.type || '')
    navigateTo(wp(`/ontologies/${type}`), { replace: true })
  })
</script>

<template>
  <div class="flex h-full items-center justify-center">
    <Icon name="lucide:loader-2" class="h-8 w-8 animate-spin text-muted-foreground" />
  </div>
</template>
