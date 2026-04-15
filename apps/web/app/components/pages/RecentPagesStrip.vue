<script setup lang="ts">
  const route = useRoute()
  const activePageId = computed(() => route.params.id as string)
  const { wp } = useWorkspacePath()

  const { recentIds, removePage } = useRecentPages()
  const { livePageTitle } = usePageNotes()
  const { getPage } = usePageNotes()
  const { showRecentPages } = useLayoutPreferences()

  function pageLabel(id: string): string {
    if (livePageTitle.value?.id === id) return livePageTitle.value.title || 'Untitled'
    const page = getPage(id)
    return page?.title || 'Untitled'
  }

  function handleClose(id: string, e: MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    removePage(id)
    // If closing the active page, navigate to the next available recent page
    if (id === activePageId.value) {
      const remaining = recentIds.value.filter((x) => x !== id)
      if (remaining.length) {
        navigateTo(wp(`/pages/${remaining[0]}`))
      }
    }
  }

  function handleAuxClick(id: string, e: MouseEvent) {
    // Middle-click removes from strip without navigating
    if (e.button === 1) {
      handleClose(id, e)
    }
  }
</script>

<template>
  <Transition name="strip-slide">
    <div v-if="showRecentPages && recentIds.length > 1" class="shrink-0 border-b border-border/50 bg-muted/20">
      <div class="flex items-center gap-0.5 px-3 py-1 overflow-x-auto scrollbar-none">
        <NuxtLink
          v-for="id in recentIds"
          :key="id"
          :to="wp(`/pages/${id}`)"
          class="group/chip flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] transition-colors shrink-0 max-w-[160px]"
          :class="
            id === activePageId
              ? 'bg-primary/10 text-primary font-medium'
              : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
          "
          @auxclick="handleAuxClick(id, $event)">
          <Icon name="lucide:file-text" class="h-3 w-3 shrink-0" />
          <span class="truncate">{{ pageLabel(id) }}</span>
          <button
            type="button"
            class="h-3.5 w-3.5 flex items-center justify-center rounded-sm opacity-0 group-hover/chip:opacity-100 transition-opacity hover:bg-muted-foreground/20 shrink-0 ml-0.5"
            tabindex="-1"
            aria-label="Close tab"
            @click="handleClose(id, $event)">
            <Icon name="lucide:x" class="h-2.5 w-2.5" />
          </button>
        </NuxtLink>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
  .strip-slide-enter-active,
  .strip-slide-leave-active {
    transition: all 0.2s ease;
    overflow: hidden;
  }
  .strip-slide-enter-from,
  .strip-slide-leave-to {
    max-height: 0;
    opacity: 0;
    padding-top: 0;
    padding-bottom: 0;
  }
  .strip-slide-enter-to,
  .strip-slide-leave-from {
    max-height: 40px;
    opacity: 1;
  }

  .scrollbar-none {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  .scrollbar-none::-webkit-scrollbar {
    display: none;
  }
</style>
