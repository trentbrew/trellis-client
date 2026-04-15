<script setup lang="ts">
  definePageMeta({ layout: 'default' })
  const { wp } = useWorkspacePath()
  navigateTo(wp('/workspace/browse?type=file'), { replace: true })
</script>
<template><div /></template>
