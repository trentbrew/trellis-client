<script setup lang="ts">
  definePageMeta({
    middleware: ['auth'],
  })

  await navigateTo('/components/gantt', { replace: true })
</script>

<template>
  <Page variant="canvas" :fill-height="true">
    <div class="flex h-full items-center justify-center">
      <Icon name="lucide:loader-2" class="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  </Page>
</template>
