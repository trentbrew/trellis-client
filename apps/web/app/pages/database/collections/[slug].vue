<script setup lang="ts">
  // Legacy redirect: /database/collections/:slug → /collections/:slug
  definePageMeta({
    middleware: ['auth'],
  })

  const route = useRoute()
  const { wp } = useWorkspacePath()

  onMounted(() => {
    const slug = route.params.slug as string
    const query = route.query
    navigateTo({ path: wp(`/collections/${slug}`), query }, { replace: true })
  })
</script>

<template>
  <div class="flex h-full items-center justify-center">
    <Icon name="lucide:loader-2" class="h-8 w-8 animate-spin text-muted-foreground" />
  </div>
</template>
