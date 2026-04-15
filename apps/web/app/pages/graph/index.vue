<script setup lang="ts">
  // Redirect /graph to /graph/visualization, preserving the org prefix.
  const { wp } = useWorkspacePath()
  await navigateTo(wp('/graph/visualization'), { replace: true })
</script>

<template>
  <div />
</template>
