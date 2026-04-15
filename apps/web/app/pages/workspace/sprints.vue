<script setup lang="ts">
  definePageMeta({ layout: 'default' })
  const { wp } = useWorkspacePath()
  navigateTo(wp('/workspace/browse?type=sprint'), { replace: true })
</script>
<template><div /></template>
