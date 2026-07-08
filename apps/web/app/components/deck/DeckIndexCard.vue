<script setup lang="ts">
  import DeckIndexCardPreview from './DeckIndexCardPreview.vue'
  import { deckPathFromEntityId, deckSlugFromEntityId } from '~/lib/deck-routes'
  import type { Entity } from '~/types/entity'

  const props = defineProps<{
    deck: Entity
  }>()

  const { wp } = useWorkspacePath()
  const cardRef = ref<HTMLElement | null>(null)
  const previewActive = ref(false)

  let observer: IntersectionObserver | null = null

  onMounted(async () => {
    if (typeof IntersectionObserver === 'undefined') {
      previewActive.value = true
      return
    }
    await nextTick()
    const el = cardRef.value
    if (!el) return
    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            previewActive.value = true
            observer?.disconnect()
            observer = null
            break
          }
        }
      },
      { rootMargin: '120px' },
    )
    observer.observe(el)
  })

  onUnmounted(() => {
    observer?.disconnect()
    observer = null
  })

  const title = computed(() => props.deck.title || deckSlugFromEntityId(props.deck.id))
  const slug = computed(() => deckSlugFromEntityId(props.deck.id))
</script>

<template>
  <div ref="cardRef" class="h-full">
    <NuxtLink
      :to="wp(deckPathFromEntityId(deck.id))"
      class="group flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all hover:ring-1 hover:ring-violet-500/30"
      data-testid="deck-index-card">
      <div class="overflow-hidden border-b border-border">
        <DeckIndexCardPreview v-if="previewActive" :deck-id="deck.id" />
        <div v-else class="aspect-video w-full animate-pulse bg-muted/30" />
      </div>
      <div class="flex min-w-0 flex-col gap-0.5 p-3">
        <p class="truncate text-sm font-medium text-foreground group-hover:text-violet-300 transition-colors">
          {{ title }}
        </p>
        <p class="truncate font-data text-[11px] text-muted-foreground">{{ slug }}</p>
      </div>
    </NuxtLink>
  </div>
</template>
