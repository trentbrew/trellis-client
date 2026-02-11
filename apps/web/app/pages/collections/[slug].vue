<script setup lang="ts">
  // Legacy redirect: /collections/:slug → /database/collections/:slug
  definePageMeta({
    middleware: ['auth'],
  })

  const route = useRoute()

  onMounted(() => {
    const slug = route.params.slug as string
    navigateTo(`/database/collections/${slug}`, { replace: true })
  })
</script>

<template>
  <div class="flex h-full items-center justify-center">
    <Icon name="lucide:loader-2" class="h-8 w-8 animate-spin text-muted-foreground" />
  </div>
</template>
