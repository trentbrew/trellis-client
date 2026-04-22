<script lang="ts" setup>
  /**
   * RailNavItem — A single icon + optional active-label link on the navigation
   * rail. Encapsulates the reactive unread badge so the parent `IconRail` can
   * `v-for` over routes without instantiating composables inside the loop.
   */
  import type { RouteConfig } from '~/config/routes'

  const props = defineProps<{
    route: Pick<RouteConfig, 'path' | 'label' | 'icon'>
    isActive: boolean
    isBottom: boolean
    isInEditMode: boolean
  }>()

  // Reactive badge computed once per component instance — re-evaluates when
  // notifications arrive via SSE (see `useRouteBadge`).
  const badge = useRouteBadge(() => props.route.path)
</script>

<template>
  <AppNavLink
    :to="route.path"
    class="group relative flex items-center justify-center rounded-full transition-all duration-200 ease-out overflow-visible"
    :class="[
      isBottom && isActive ? 'h-9 px-4 gap-2' : 'h-9 w-9',
      isActive
        ? isInEditMode
          ? 'bg-accent-foreground/10 text-accent-foreground/80'
          : 'bg-rail-foreground/10 text-foreground'
        : isInEditMode
          ? 'text-accent-foreground/70 hover:bg-accent-foreground/10 hover:text-accent-foreground'
          : 'text-rail-foreground/70 hover:bg-rail-foreground/10 hover:text-rail-foreground',
    ]">
    <Icon :name="route.icon" class="h-4.5 w-4.5 opacity-60 shrink-0" />
    <Transition
      enter-active-class="transition-all duration-200 ease-out"
      enter-from-class="opacity-0 max-w-0"
      enter-to-class="opacity-100 max-w-24"
      leave-active-class="transition-all duration-150 ease-in"
      leave-from-class="opacity-100 max-w-24"
      leave-to-class="opacity-0 max-w-0">
      <span v-if="isBottom && isActive" class="text-xs font-bold tracking-tight whitespace-nowrap overflow-hidden">
        {{ route.label }}
      </span>
    </Transition>
    <RailBadge :badge="badge" />
  </AppNavLink>
</template>
