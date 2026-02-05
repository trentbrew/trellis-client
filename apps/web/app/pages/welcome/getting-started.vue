<script lang="ts" setup>
  definePageMeta({
    middleware: ['auth'],
  })
</script>

<template>
  <Page
    variant="prose"
    subtitle="Welcome"
    title="Getting started"
    description="The workflow we're building toward."
    show-back-button>
    <div class="border-border bg-card rounded-xl border p-6">
      <div class="space-y-2">
        <div class="text-foreground font-medium">Soon:</div>
        <div class="text-muted-foreground text-sm">
          Org selection, app creation, page creation/management, and persistence via IndexedDB.
        </div>
      </div>
    </div>
  </Page>
</template>
