<script setup lang="ts">
  definePageMeta({
    middleware: ['auth'],
  })
</script>

<template>
  <Page
    variant="browse"
    title="Schema presets"
    subtitle="Schema Layer"
    description="Reusable field sets and collection templates"
    icon="lucide:layers">
    <div class="flex h-full items-center justify-center">
      <div class="text-center">
        <Icon name="lucide:layers" class="text-muted-foreground mx-auto mb-4 h-16 w-16" />
        <h2 class="mb-2 text-2xl font-bold">Coming Soon</h2>
        <p class="text-muted-foreground">Preset collections, fields, and JSON-LD contexts</p>
      </div>
    </div>
  </Page>
</template>
