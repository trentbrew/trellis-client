<script setup lang="ts">
  definePageMeta({
    layout: 'default',
  })

  useHead({
    title: 'Help & Support | Platform Sandbox',
  })
</script>

<template>
  <Page
    variant="prose"
    subtitle="Help"
    title="Help & Support"
    description="Get help and support for Platform Sandbox."
    icon="lucide:help-circle"
    icon-class="text-blue-300">
    <div class="rounded-xl border border-dashed border-border bg-muted/30 p-12 text-center">
      <Icon name="lucide:help-circle" class="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
      <h3 class="mt-4 text-lg font-medium">Coming Soon</h3>
      <p class="mt-2 text-sm text-muted-foreground">Help documentation and support resources will live here.</p>
    </div>
  </Page>
</template>
