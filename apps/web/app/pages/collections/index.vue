<script setup lang="ts">
  // Legacy redirect: /collections → /database
  definePageMeta({
    middleware: ['auth'],
  })

  const route = useRoute()

  onMounted(() => {
    // Redirect /collections to /database, preserving any sub-path
    const subPath = route.path.replace(/^\/collections/, '')
    if (subPath && subPath !== '/') {
      navigateTo(`/database/collections${subPath}`, { replace: true })
    } else {
      navigateTo('/database', { replace: true })
    }
  })
</script>

<template>
  <div class="flex h-full items-center justify-center">
    <Icon name="lucide:loader-2" class="h-8 w-8 animate-spin text-muted-foreground" />
  </div>
</template>
