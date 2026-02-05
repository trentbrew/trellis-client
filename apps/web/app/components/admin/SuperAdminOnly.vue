<script lang="ts" setup>
/**
 * Wrapper component that only renders children for super_admin users
 */
const { isSuperAdmin } = useAdminUI()
</script>

<template>
  <slot v-if="isSuperAdmin" />
</template>
