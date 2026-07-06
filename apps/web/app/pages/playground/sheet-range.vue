<script setup lang="ts">
  import { __setSSEConnectedForTests } from '~/composables/useTrellisSSE'

  definePageMeta({
    title: 'Sheet Range Playground',
    middleware: ['auth'],
  })

  const content = ref(
    '<div data-type="sheet-range" data-sheet-id="entity:sheet-q3-runway" data-range="A2:E3" data-title="Q3 runway excerpt"></div>',
  )

  if (import.meta.dev) {
    onMounted(() => {
      ;(window as Window & { __trellisSetSSE?: (v: boolean) => void }).__trellisSetSSE = (v: boolean) =>
        __setSSEConnectedForTests(v)
    })
  }
</script>

<template>
  <Page :full-width="true">
    <div class="container max-w-4xl py-8">
      <header class="mb-6">
        <p class="text-xs uppercase tracking-widest text-muted-foreground">Playground · sheetRange atom</p>
        <h1 class="text-2xl font-semibold">Sheet range block</h1>
        <p class="mt-1 text-sm text-muted-foreground">
          Read-only preview of a live sheetRange transclusion (requires q3-runway seed).
        </p>
      </header>
      <div class="pointer-events-none rounded-xl border border-border bg-card p-4">
        <UiRichTextEditor v-model="content" :embeds="true" seamless />
      </div>
    </div>
  </Page>
</template>
