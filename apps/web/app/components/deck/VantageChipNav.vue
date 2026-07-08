<script setup lang="ts">
  import {
    activeDeckVantageFromPath,
    deckEditorPathFromEntityId,
    deckPresentPathFromEntityId,
    deckSorterPathFromEntityId,
    deckThumbPathFromEntityId,
  } from '~/lib/deck-routes'
  import { useDeckVantageTransition } from '~/composables/useDeckVantageTransition'

  const props = defineProps<{
    deckId: string
    activeIndex: number
  }>()

  const route = useRoute()
  const { enterPresent } = useDeckVantageTransition()
  const { wp, wpNavigate } = useWorkspacePath()

  const activeVantage = computed(() => activeDeckVantageFromPath(route.path))

  const chips = computed(() => [
    { id: 'thumb' as const, label: 'Thumb', href: wp(deckThumbPathFromEntityId(props.deckId, props.activeIndex)) },
    { id: 'sorter' as const, label: 'Sorter', href: wp(deckSorterPathFromEntityId(props.deckId, props.activeIndex)) },
    { id: 'editor' as const, label: 'Editor', href: wp(deckEditorPathFromEntityId(props.deckId, props.activeIndex)) },
    { id: 'present' as const, label: 'Present', href: null },
  ])

  function goPresent() {
    enterPresent()
    void wpNavigate(deckPresentPathFromEntityId(props.deckId, props.activeIndex))
  }
</script>

<template>
  <div role="tablist" aria-label="Deck vantage" class="flex flex-wrap gap-1">
    <NuxtLink
      v-for="chip in chips.filter((c) => c.id !== 'present')"
      :key="chip.id"
      :to="chip.href!"
      role="tab"
      class="rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide no-underline transition-colors"
      :class="
        activeVantage === chip.id
          ? 'border-violet-500/50 bg-violet-500/15 text-violet-300'
          : 'border-border text-muted-foreground hover:text-foreground'
      "
      :aria-current="activeVantage === chip.id ? 'page' : undefined"
    >
      {{ chip.label }}
    </NuxtLink>
    <button
      type="button"
      role="tab"
      class="rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide"
      :class="
        activeVantage === 'present'
          ? 'border-violet-500/50 bg-violet-500/15 text-violet-300'
          : 'border-border text-muted-foreground hover:text-foreground'
      "
      @click="goPresent"
    >
      Present
    </button>
  </div>
</template>
