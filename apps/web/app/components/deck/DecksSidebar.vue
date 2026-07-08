<script setup lang="ts">
  import { getCleanPath } from '~/config/routes'
  import { deckPathFromEntityId, deckSlugFromEntityId } from '~/lib/deck-routes'

  const { wp } = useWorkspacePath()
  const route = useRoute()
  const { decks } = useDeckList()
  const { loading } = useEntities()
  const { createDeck, creating } = useCreateDeck()

  const activeSlug = computed(() => {
    const clean = getCleanPath(route.path)
    const match = /^\/decks\/([^/]+)/.exec(clean)
    return match?.[1] ? decodeURIComponent(match[1]) : undefined
  })

  function deckLabel(deck: { id: string; title?: string }) {
    return deck.title || deckSlugFromEntityId(deck.id)
  }

  function isDeckActive(deckId: string) {
    if (!activeSlug.value) return false
    return deckSlugFromEntityId(deckId) === activeSlug.value
  }
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col overflow-hidden">
    <p class="shrink-0 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Decks</p>

    <div class="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
      <div v-if="loading" class="space-y-2 px-3">
        <div v-for="i in 4" :key="i" class="h-8 animate-pulse rounded-lg bg-muted/40" />
      </div>

      <p v-else-if="decks.length === 0" class="px-3 py-4 text-xs text-muted-foreground">No decks yet.</p>

      <nav v-else class="space-y-0.5 px-2 pb-2">
        <NuxtLink
          v-for="deck in decks"
          :key="deck.id"
          :to="wp(deckPathFromEntityId(deck.id))"
          class="group flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs transition-colors hover:bg-muted/60"
          :class="isDeckActive(deck.id) ? 'bg-violet-500/10 font-semibold text-foreground' : 'text-sidebar-foreground'">
          <Icon name="lucide:presentation" class="h-3.5 w-3.5 shrink-0 text-violet-400/80" />
          <span class="min-w-0 flex-1 truncate">{{ deckLabel(deck) }}</span>
        </NuxtLink>
      </nav>
    </div>

    <div class="mt-auto shrink-0 border-t border-border/40 p-2 pb-3">
      <UiButton class="w-full justify-center gap-2" size="sm" variant="secondary" :disabled="creating" @click="createDeck()">
        <Icon :name="creating ? 'lucide:loader-2' : 'lucide:plus'" :class="['h-4 w-4', creating && 'animate-spin']" />
        New deck
      </UiButton>
    </div>
  </div>
</template>
