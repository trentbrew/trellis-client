<script setup lang="ts">
  definePageMeta({ layout: 'default' })
  const route = useRoute()
  const { wp } = useWorkspacePath()

  const params = new URLSearchParams({ type: 'file' })
  const category = route.query.category
  if (typeof category === 'string' && category.trim()) {
    params.set('category', category.trim())
  }

  navigateTo(wp(`/workspace/browse?${params.toString()}`), { replace: true })
</script>
<template><div /></template>
