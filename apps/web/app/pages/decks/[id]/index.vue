<script setup lang="ts">
  import DeckProjectionFrame from '~/components/deck/DeckProjectionFrame.vue'
  import { deckEntityIdFromSlug, deckSlugFromEntityId } from '~/lib/deck-routes'

  definePageMeta({
    layout: 'default',
    middleware: ['auth'],
    pageTransition: { name: 'deck-vantage', mode: 'out-in' },
  })

  const route = useRoute()
  const deckId = computed(() => {
    const p = route.params.id
    const slug = Array.isArray(p) ? p[0] : p
    return slug ? deckEntityIdFromSlug(String(slug)) : ''
  })

  const deckSlug = computed(() => deckSlugFromEntityId(deckId.value))

  useHead({ title: () => `${deckSlug.value} | Deck` })
</script>

<template>
  <Page variant="canvas" :fill-height="true" hide-sidebar>
    <DeckProjectionFrame v-if="deckId" :deck-id="deckId" class="h-full min-h-0" />
  </Page>
</template>
