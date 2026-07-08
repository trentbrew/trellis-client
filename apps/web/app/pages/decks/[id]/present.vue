<script setup lang="ts">
  import DeckPresentShell from '~/components/deck/DeckPresentShell.vue'
  import { deckEntityIdFromSlug, deckSlugFromEntityId } from '~/lib/deck-routes'

  definePageMeta({
    layout: 'fullscreen',
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
</script>

<template>
  <DeckPresentShell
    v-if="deckId"
    :deck-id="deckId"
    :deck-slug="deckSlug"
    :initial-slide-index="slideIndex"
  />
</template>
