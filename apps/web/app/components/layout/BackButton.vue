<script setup lang="ts">
  import { useAppNavigate } from '~/composables/useAppNavigate'

  const route = useRoute()
  const appNavigate = useAppNavigate()

  const goBack = async () => {
    const pathSegments = route.path.split('/').filter(Boolean)
    if (pathSegments.length > 2) {
      const parentPath = `/${pathSegments.slice(0, -1).join('/')}`
      await appNavigate.navigate(parentPath)
    }
  }
</script>

<template>
  <button
    class="text-muted-foreground hover:text-foreground mr-2 -ml-1 inline-flex h-6 w-6 items-center justify-center rounded-md transition-colors"
    aria-label="Go back"
    @click="goBack"
  >
    <Icon name="lucide:arrow-left" class="h-4 w-4" />
  </button>
</template>
