<script setup lang="ts">
/**
 * Legacy /activity → Lobby notification status feed (P1).
 * Does not affect /activity/* child routes (e.g. forms platform).
 */
definePageMeta({ middleware: ['auth'] })

await navigateTo('/lobby/activity', { replace: true })
</script>

<template>
  <div class="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">
    Redirecting to Lobby activity…
  </div>
</template>
