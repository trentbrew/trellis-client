<script setup lang="ts">
  import type { SlideDefinition } from '~/types/deck'
  import { effectiveLayoutId } from '~/lib/deck-layout'

  const props = defineProps<{
    slide: SlideDefinition
    index: number
    compact?: boolean
  }>()

  const layoutId = computed(() => effectiveLayoutId(props.slide.regions))

  function stripHtml(html: string | undefined): string {
    if (!html) return ''
    return html.replace(/<[^>]+>/g, '').trim()
  }

  const headline = computed(() => {
    return stripHtml(props.slide.regions.title) || props.slide.title || `Slide ${props.index + 1}`
  })

  const hasLiveData = computed(() => layoutId.value === 'live-data' && !!props.slide.regions.queryView?.query)
</script>

<template>
  <div
    class="relative aspect-video w-full overflow-hidden rounded-sm bg-[#0d0d11]"
    :class="compact ? 'text-[8px]' : 'text-[10px]'">
    <div class="flex h-full flex-col p-2">
      <template v-if="layoutId === 'title'">
        <div class="flex flex-1 flex-col items-center justify-center gap-1 px-1 text-center">
          <span class="line-clamp-2 font-semibold leading-tight text-foreground/90">{{ headline }}</span>
        </div>
      </template>
      <template v-else-if="hasLiveData">
        <div class="flex flex-1 flex-col justify-end gap-1">
          <span class="line-clamp-1 font-medium text-foreground/80">{{ headline }}</span>
          <div class="grid grid-cols-3 gap-0.5">
            <span v-for="n in 3" :key="n" class="h-2 rounded-sm bg-violet-500/25" />
          </div>
        </div>
      </template>
      <template v-else>
        <span class="line-clamp-1 font-medium text-foreground/80">{{ headline }}</span>
        <div class="mt-1 flex flex-1 flex-col justify-center gap-0.5">
          <span class="h-0.5 w-full rounded-sm bg-muted-foreground/30" />
          <span class="h-0.5 w-4/5 rounded-sm bg-muted/50" />
          <span class="h-0.5 w-3/5 rounded-sm bg-muted/40" />
        </div>
      </template>
    </div>
  </div>
</template>
