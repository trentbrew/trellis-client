<script lang="ts" setup>
  definePageMeta({
    middleware: ['auth'],
  })
</script>

<template>
  <Page
    variant="prose"
    subtitle="Welcome"
    title="What this app is"
    description="A form builder with spatial flows, branching logic, and workspace structure."
    show-back-button>
    <div class="prose prose-sm max-w-none">
      <p>
        This project is intentionally being rebuilt from a minimal foundation. The goal is to ship a clean,
        understandable core before reintroducing feature surfaces.
      </p>
      <p>You’ll see navigation stay extremely small until IndexedDB-backed org/app/page management lands.</p>
    </div>
  </Page>
</template>
