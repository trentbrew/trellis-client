<script lang="ts" setup>
/**
 * Wrapper component that only renders children for workspace owners
 */
const { isOwner } = useAdminUI()
</script>

<template>
  <slot v-if="isOwner" />
</template>
