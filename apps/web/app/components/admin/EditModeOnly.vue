<script lang="ts" setup>
/**
 * Wrapper component that only renders children when edit mode is enabled
 * AND user has permission to see admin controls
 */
const { showBuilderUI } = useAdminUI()
</script>

<template>
  <slot v-if="showBuilderUI" />
</template>
