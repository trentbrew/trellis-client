<script setup lang="ts">
  const { wp } = useWorkspacePath()
</script>

<template>
  <NuxtLink
    :to="wp('/decks')"
    class="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
    aria-label="Back to all decks"
    data-testid="deck-back-nav">
    <Icon name="lucide:arrow-left" class="h-3.5 w-3.5 shrink-0" />
    <span class="hidden sm:inline">Decks</span>
  </NuxtLink>
</template>
