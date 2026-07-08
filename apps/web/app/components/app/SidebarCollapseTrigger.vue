<script setup lang="ts">
  import AnimatedIconsMenu from '~/components/animated-icons/Menu.vue'
  import { getCleanPath } from '~/config/routes'

  /** Global rollout flag — canvas routes opt in via meta.sidebarCollapsible */
  const SHOW_SIDEBAR_COLLAPSE_TRIGGER = false

  const props = withDefaults(
    defineProps<{
      /** Inline in a toolbar row vs. straddling the sidebar/content seam when collapsed */
      variant?: 'inline' | 'edge'
    }>(),
    {
      variant: 'inline',
    },
  )

  const route = useRoute()
  const { findRoute } = useRoutes()
  const sidebarCollapse = useSidebarCollapse()

  const isCanvasDetailRoute = computed(() => {
    const clean = getCleanPath(route.path)
    return /^\/canvases\/[^/]+$/.test(clean)
  })

  const routeAllowsCollapse = computed(() => {
    const config = findRoute(route.path)
    return config?.meta?.sidebarCollapsible === true || isCanvasDetailRoute.value
  })

  const showTrigger = computed(
    () => (SHOW_SIDEBAR_COLLAPSE_TRIGGER || routeAllowsCollapse.value) && !sidebarCollapse.isForcedCollapsed.value,
  )

  const label = computed(() =>
    sidebarCollapse.isCollapsed.value ? 'Expand sidebar' : 'Collapse sidebar',
  )

  const buttonClass = computed(() => {
    if (props.variant === 'edge') {
      return [
        'absolute right-0 top-2.5 z-30 flex h-7 w-7 translate-x-1/2 items-center justify-center',
        'rounded-full border border-border bg-card text-muted-foreground shadow-sm',
        'transition-colors hover:bg-muted hover:text-foreground',
      ]
    }

    return [
      'flex h-8 w-8 shrink-0 items-center justify-center rounded-md',
      'border border-border bg-card/50 text-muted-foreground backdrop-blur-md',
      'transition-colors hover:bg-muted hover:text-foreground',
    ]
  })
</script>

<template>
  <ClientOnly v-if="showTrigger">
    <UiTooltip>
      <UiTooltipTrigger as-child>
        <button
          type="button"
          data-sidebar="trigger"
          data-testid="sidebar-collapse-trigger"
          :aria-label="label"
          :class="buttonClass"
          @click="sidebarCollapse.toggle()">
          <AnimatedIconsMenu :open="sidebarCollapse.isCollapsed.value" :size="14" />
        </button>
      </UiTooltipTrigger>
      <UiTooltipContent side="bottom" :side-offset="6">
        {{ label }}
      </UiTooltipContent>
    </UiTooltip>
  </ClientOnly>
</template>
