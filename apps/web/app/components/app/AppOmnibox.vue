<script lang="ts" setup>
  import { getSidebarSection } from '~/config/routes'
  import type { RouteConfig } from '~/config/routes'

  const commandDialog = useCommandDialog()
  const routes = useRoutes()
  const appNavigate = useAppNavigate()
  const { wp } = useWorkspacePath()
  const { sendMessage } = useAgent()
  const { setRightSidebarOpen } = useRightSidebarWidth()

  const query = ref('')
  const activeIndex = ref(0)
  const isSubmitting = ref(false)
  const inputRef = ref<HTMLInputElement | null>(null)

  // Curated agent prompts shown when the query is empty.
  const chips = [
    { label: 'Summarize this page', icon: 'lucide:file-text', prompt: 'Summarize the page I am currently viewing.' },
    { label: 'Show my tasks', icon: 'lucide:check-square', prompt: 'Show me all of my open tasks.' },
    { label: 'What changed today?', icon: 'lucide:activity', prompt: 'What changed in my workspace today?' },
    { label: 'Create a note', icon: 'lucide:plus-square', prompt: 'Create a new note titled "Untitled".' },
  ]

  // Normalize + filter routes into grouped sections
  const normalized = computed(() => {
    const q = query.value.trim().toLowerCase()
    const groups = new Map<string, { label: string; icon?: string; routes: RouteConfig[] }>()

    routes.commandPaletteRoutes.value.forEach((routeItem) => {
      if (!routeItem?.path) return

      if (q) {
        const haystack = [routeItem.label, routeItem.meta?.subtitle, routeItem.searchKeywords?.join(' ')]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        if (!haystack.includes(q)) return
      }

      const section = getSidebarSection(routeItem.path)
      const key = section?.label || 'Other'
      if (!groups.has(key)) {
        groups.set(key, { label: key, icon: section?.icon, routes: [] })
      }
      groups.get(key)!.routes.push(routeItem)
    })

    return Array.from(groups.values())
  })

  const flat = computed<RouteConfig[]>(() => normalized.value.flatMap((g) => g.routes))

  // Ensure activeIndex stays in range as results change
  watch(flat, (list) => {
    if (activeIndex.value >= list.length) activeIndex.value = 0
  })

  // Reset + focus when opened, clear when closed
  watch(
    () => commandDialog.isOpen.value,
    async (open) => {
      if (open) {
        query.value = ''
        activeIndex.value = 0
        await nextTick()
        inputRef.value?.focus()
      } else {
        query.value = ''
      }
    },
  )

  const close = () => {
    commandDialog.close()
  }

  const openTrigger = () => {
    commandDialog.open()
  }

  const navigateToResult = async (result: RouteConfig) => {
    if (!result?.path) return
    close()
    await appNavigate.navigate(wp(result.path))
  }

  const askAgent = async (prompt: string) => {
    const text = prompt.trim()
    if (!text || isSubmitting.value) return
    isSubmitting.value = true
    try {
      close()
      setRightSidebarOpen(true)
      await sendMessage(text)
    } finally {
      isSubmitting.value = false
    }
  }

  const handleInputKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      close()
      return
    }

    if (event.key === 'Enter') {
      event.preventDefault()
      // ⌘↵ or Ctrl+↵ → send to agent
      if (event.metaKey || event.ctrlKey) {
        if (query.value.trim()) askAgent(query.value)
        return
      }
      // ↵ → navigate to highlighted result (or ask agent if no results)
      const result = flat.value[activeIndex.value]
      if (result) {
        navigateToResult(result)
      } else if (query.value.trim()) {
        askAgent(query.value)
      }
      return
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      if (flat.value.length) activeIndex.value = (activeIndex.value + 1) % flat.value.length
      return
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      if (flat.value.length) activeIndex.value = (activeIndex.value - 1 + flat.value.length) % flat.value.length
      return
    }
  }

  // Find the flat index for a given result so we can highlight the hovered row
  const indexOfResult = (route: RouteConfig) => flat.value.indexOf(route)
</script>

<template>
  <!-- Compact header trigger -->
  <div class="flex flex-1 justify-center min-w-0 app-region-no-drag">
    <button
      type="button"
      aria-label="Search or ask the agent"
      :aria-expanded="commandDialog.isOpen.value"
      class="relative w-full max-w-[500px] min-w-0 h-8 pl-9 pr-14 rounded-full bg-muted/30 hover:bg-muted/60 hover:border-border/40 text-xs text-left text-muted-foreground/70 outline-none transition-colors flex items-center border border-border"
      @click="openTrigger">
      <Icon
        name="lucide:search"
        class="h-4 w-4 text-muted-foreground/70 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
      <span>Search or ask anything…</span>
      <UiKbd
        class="absolute right-2 top-1/2 -translate-y-1/2 bg-muted/60 border-none text-[10px] h-5 px-1.5 pointer-events-none">
        ⌘K
      </UiKbd>
    </button>
  </div>

  <!-- Immersive overlay -->
  <Teleport to="body">
    <Transition name="omnibox">
      <div
        v-if="commandDialog.isOpen.value"
        class="fixed inset-0 z-100 flex items-start justify-center pt-[15vh] px-4"
        role="dialog"
        aria-modal="true"
        aria-label="Omnibox">
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-background/60 backdrop-blur-md" @click="close" />

        <!-- Card -->
        <div
          class="omnibox-card relative w-full max-w-[640px] max-h-[70vh] flex flex-col rounded-2xl border border-border/60 bg-popover/95 shadow-2xl overflow-hidden"
          @click.stop>
          <!-- Prompt input -->
          <div class="relative flex items-center px-5 pt-5 pb-4 border-b border-border/40">
            <Icon
              :name="isSubmitting ? 'lucide:loader-2' : 'lucide:sparkles'"
              class="h-5 w-5 text-primary/80 shrink-0 mr-3"
              :class="{ 'animate-spin': isSubmitting }" />
            <input
              ref="inputRef"
              v-model="query"
              type="text"
              autocomplete="off"
              spellcheck="false"
              :disabled="isSubmitting"
              placeholder="Search pages, or ask the agent anything…"
              class="flex-1 bg-transparent border-none outline-none text-base text-foreground placeholder:text-muted-foreground/60 disabled:opacity-60"
              @keydown="handleInputKeydown" />
          </div>

          <!-- Body -->
          <div class="flex-1 min-h-0 overflow-y-auto">
            <!-- Chips when query is empty -->
            <div v-if="!query.trim()" class="p-5">
              <div class="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 mb-3">
                Ask the agent
              </div>
              <div class="grid grid-cols-2 gap-2">
                <button
                  v-for="chip in chips"
                  :key="chip.label"
                  type="button"
                  class="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-border/40 bg-muted/20 hover:bg-muted/60 hover:border-border/80 transition-colors text-left text-xs text-foreground/90"
                  @click="askAgent(chip.prompt)">
                  <Icon :name="chip.icon" class="h-3.5 w-3.5 text-primary/80 shrink-0" />
                  <span class="truncate">{{ chip.label }}</span>
                </button>
              </div>
            </div>

            <!-- Results -->
            <div v-if="query.trim() && flat.length" class="py-2">
              <template v-for="group in normalized" :key="group.label">
                <div class="px-4 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                  {{ group.label }}
                </div>
                <button
                  v-for="route in group.routes"
                  :key="route.path"
                  type="button"
                  class="w-full flex items-center gap-3 px-4 py-2 text-left transition-colors"
                  :class="
                    indexOfResult(route) === activeIndex
                      ? 'bg-accent/70 text-accent-foreground'
                      : 'text-foreground/85 hover:bg-accent/30'
                  "
                  @mouseenter="activeIndex = indexOfResult(route)"
                  @click="navigateToResult(route)">
                  <Icon :name="route.icon || 'lucide:circle'" class="h-4 w-4 shrink-0 opacity-80" />
                  <span class="flex-1 truncate text-sm">{{ route.label }}</span>
                  <span v-if="route.meta?.subtitle" class="text-[10px] text-muted-foreground/70 truncate max-w-[120px]">
                    {{ route.meta.subtitle }}
                  </span>
                  <UiKbd v-if="routes.getRouteBadge(route)" class="bg-muted/60 border-none text-[10px] h-5 px-1.5">
                    {{ routes.getRouteBadge(route) }}
                  </UiKbd>
                </button>
              </template>
            </div>

            <!-- Empty state with agent hint -->
            <div
              v-if="query.trim() && !flat.length"
              class="flex flex-col items-center justify-center py-10 px-6 text-center">
              <div class="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                <Icon name="lucide:sparkles" class="h-5 w-5 text-primary/80" />
              </div>
              <div class="text-sm text-foreground/90 mb-1">No matches for "{{ query }}"</div>
              <div class="text-xs text-muted-foreground mb-4">Ask the agent instead?</div>
              <button
                type="button"
                class="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs hover:bg-primary/90 transition-colors"
                @click="askAgent(query)">
                <Icon name="lucide:send" class="h-3.5 w-3.5" />
                Ask agent
                <UiKbd class="bg-primary-foreground/10 border-none text-[10px] h-5 px-1.5 text-primary-foreground">
                  ⌘↵
                </UiKbd>
              </button>
            </div>
          </div>

          <!-- Footer keymap hints -->
          <div
            class="shrink-0 flex items-center justify-between px-4 py-2 border-t border-border/40 text-[10px] text-muted-foreground/70 bg-muted/20">
            <div class="flex items-center gap-3">
              <span class="flex items-center gap-1">
                <UiKbd class="bg-muted/60 border-none h-4 px-1.5 text-[9px]">↵</UiKbd>
                Search
              </span>
              <span class="flex items-center gap-1">
                <UiKbd class="bg-muted/60 border-none h-4 px-1.5 text-[9px]">⌘↵</UiKbd>
                Ask agent
              </span>
              <span class="flex items-center gap-1">
                <UiKbd class="bg-muted/60 border-none h-4 px-1.5 text-[9px]">↑↓</UiKbd>
                Navigate
              </span>
            </div>
            <span class="flex items-center gap-1">
              <UiKbd class="bg-muted/60 border-none h-4 px-1.5 text-[9px]">Esc</UiKbd>
              Close
            </span>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
  .omnibox-enter-active,
  .omnibox-leave-active {
    transition:
      opacity 180ms ease,
      transform 180ms cubic-bezier(0.16, 1, 0.3, 1);
  }
  .omnibox-enter-active .omnibox-card,
  .omnibox-leave-active .omnibox-card {
    transition:
      opacity 180ms ease,
      transform 180ms cubic-bezier(0.16, 1, 0.3, 1);
  }
  .omnibox-enter-from,
  .omnibox-leave-to {
    opacity: 0;
  }
  .omnibox-enter-from .omnibox-card,
  .omnibox-leave-to .omnibox-card {
    opacity: 0;
    transform: translateY(-8px) scale(0.98);
  }
</style>
