<script setup lang="ts">
  definePageMeta({
    middleware: ['auth'],
  })
</script>

<template>
  <Page
    variant="browse"
    title="Field types"
    subtitle="Schema Layer"
    description="Standardize scalar types, relations, and validations"
    icon="lucide:square-pen">
    <div class="flex h-full items-center justify-center">
      <div class="text-center">
        <Icon name="lucide:square-pen" class="text-muted-foreground mx-auto mb-4 h-16 w-16" />
        <h2 class="mb-2 text-2xl font-bold">Coming Soon</h2>
        <p class="text-muted-foreground">Shared field type registry and constraints</p>
      </div>
    </div>
  </Page>
</template>
