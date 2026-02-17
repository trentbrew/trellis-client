<script setup lang="ts">
  definePageMeta({ layout: 'default' })
  const { wp } = useWorkspacePath()
  navigateTo(wp('/workspace/documents'), { replace: true })
</script>

<template>
  <div />
</template>
