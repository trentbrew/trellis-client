<script lang="ts" setup>
/**
 * Wrapper component that only renders children for admin+ users
 */
const { isAdmin } = useAdminUI()
</script>

<template>
  <slot v-if="isAdmin" />
</template>
