<script setup lang="ts">
  definePageMeta({
    layout: 'default',
  })

  onMounted(() => {
    navigateTo('/workspace/today')
  })
</script>

<template>
  <Page variant="canvas" :fill-height="true">
    <div class="flex h-full items-center justify-center">
      <Icon name="lucide:loader-2" class="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  </Page>
</template>
