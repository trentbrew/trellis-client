<script lang="ts" setup>
/**
 * Wrapper component that only renders children for owner-role users
 */
const { isOwnerRole } = useAdminUI()
</script>

<template>
  <slot v-if="isOwnerRole" />
</template>
