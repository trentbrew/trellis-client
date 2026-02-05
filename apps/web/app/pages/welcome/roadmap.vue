<script lang="ts" setup>
  definePageMeta({
    middleware: ['auth'],
  })
</script>

<template>
  <Page variant="prose" subtitle="Welcome" title="Roadmap" description="What we'll wire up next." show-back-button>
    <div class="border-border bg-card rounded-xl border p-6">
      <div class="space-y-3">
        <div class="text-foreground font-medium">Next milestones</div>
        <div class="text-muted-foreground text-sm">Org + app selection stored in IndexedDB</div>
        <div class="text-muted-foreground text-sm">Page creation & management stored in IndexedDB</div>
        <div class="text-muted-foreground text-sm">Flow builder wired to persisted page data</div>
      </div>
    </div>
  </Page>
</template>
