<script setup lang="ts">
  import DeckThumbShell from '~/components/deck/DeckThumbShell.vue'
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

  const slideIndex = computed(() => {
    const raw = route.query.slide
    const n = Number(Array.isArray(raw) ? raw[0] : raw)
    return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0
  })

  useHead({ title: () => `${deckSlug.value} · Thumb | Deck` })
</script>

<template>
  <Page variant="canvas" :fill-height="true" hide-sidebar>
    <DeckThumbShell v-if="deckId" :deck-id="deckId" :initial-slide-index="slideIndex" class="h-full min-h-0" />
  </Page>
</template>
