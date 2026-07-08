<script setup lang="ts">
  import SlideThumbPreview from './SlideThumbPreview.vue'

  const props = defineProps<{
    deckId: string
  }>()

  const { slides, slidesLoading } = useDeckProjection(toRef(props, 'deckId'))

  const firstSlide = computed(() => slides.value[0] ?? null)
</script>

<template>
  <div class="relative aspect-video w-full overflow-hidden bg-[#0d0d11]">
    <SlideThumbPreview
      v-if="firstSlide"
      :slide="firstSlide"
      :index="0"
      class="h-full" />
    <div
      v-else-if="slidesLoading"
      class="flex h-full items-center justify-center text-muted-foreground/40">
      <Icon name="lucide:loader-2" class="h-5 w-5 animate-spin" />
    </div>
    <div v-else class="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground/40">
      <Icon name="lucide:presentation" class="h-8 w-8" />
      <span class="text-[10px] uppercase tracking-wide">Empty deck</span>
    </div>
  </div>
</template>
