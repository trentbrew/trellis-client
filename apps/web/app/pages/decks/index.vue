<script setup lang="ts">
  definePageMeta({
    layout: 'default',
    middleware: ['auth'],
  })

  useHead({ title: 'Decks' })

  const { decks } = useDeckList()
  const { loading } = useEntities()
  const { createDeck, creating } = useCreateDeck()
</script>

<template>
  <Page variant="browse" title="Decks" icon="lucide:presentation">
    <template #actions>
      <UiButton size="sm" :disabled="creating" @click="createDeck()">
        <Icon :name="creating ? 'lucide:loader-2' : 'lucide:plus'" :class="['h-4 w-4', creating && 'animate-spin']" />
        New deck
      </UiButton>
    </template>

    <template v-if="loading">
      <div class="flex h-48 items-center justify-center text-muted-foreground">
        <Icon name="lucide:loader-2" class="h-6 w-6 animate-spin" />
      </div>
    </template>

    <template v-else-if="decks.length === 0">
      <div class="flex flex-col items-center justify-center gap-4 py-24 text-muted-foreground">
        <Icon name="lucide:presentation" class="h-10 w-10 opacity-25" />
        <div class="space-y-1 text-center">
          <p class="text-sm font-medium text-foreground">No decks yet</p>
          <p class="text-xs max-w-sm">
            Create a graph-native deck from the toolbar, Quick Create (+), or seed the YC S26 demo.
          </p>
        </div>
        <div class="flex flex-wrap items-center justify-center gap-2">
          <UiButton size="sm" :disabled="creating" @click="createDeck()">
            <Icon name="lucide:plus" class="h-4 w-4" />
            New deck
          </UiButton>
          <p class="text-[11px] text-muted-foreground">
            Demo:
            <code class="rounded bg-muted px-1 py-0.5 font-data">bun apps/web/scripts/seed-deck-demo.mjs</code>
          </p>
        </div>
      </div>
    </template>

    <div
      v-else
      class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      data-testid="deck-index-grid">
      <DeckIndexCard v-for="deck in decks" :key="deck.id" :deck="deck" />
    </div>
  </Page>
</template>
