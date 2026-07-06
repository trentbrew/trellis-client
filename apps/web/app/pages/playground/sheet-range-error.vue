<script setup lang="ts">
  definePageMeta({
    title: 'Sheet Range Error Playground',
    middleware: ['auth'],
  })

  const content = ref(
    '<div data-type="sheet-range" data-sheet-id="entity:sheet-missing" data-range="Z99:Z100" data-title="Invalid sheet"></div>',
  )
</script>

<template>
  <Page :full-width="true">
    <div class="container max-w-4xl py-8">
      <header class="mb-6">
        <p class="text-xs uppercase tracking-widest text-muted-foreground">Playground · sheetRange error</p>
        <h1 class="text-2xl font-semibold">Sheet range — error state</h1>
      </header>
      <div class="pointer-events-none rounded-xl border border-border bg-card p-4">
        <UiRichTextEditor v-model="content" :embeds="true" seamless />
      </div>
    </div>
  </Page>
</template>
