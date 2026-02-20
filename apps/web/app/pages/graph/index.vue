<script setup lang="ts">
  // Redirect /graph to /graph/dashboard, preserving the org prefix.
  const { wp } = useWorkspacePath()
  await navigateTo(wp('/graph/dashboard'), { replace: true })
</script>

<template>
  <div />
</template>
