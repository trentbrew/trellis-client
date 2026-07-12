<script lang="ts" setup>
  import { CAMPUS_ZONE_LIST } from '~/lib/campus-zones'

  const props = withDefaults(
    defineProps<{
      /** Inline omnibar chip — compact spacing */
      embedded?: boolean
    }>(),
    { embedded: false },
  )

  const { zone, runtimeLabel } = useCampusLocationLabel()
  const { mode: adapterMode, isCloud } = useAdapterStatus()
  const workspacePath = useWorkspacePath()

  const zoneMenuOpen = ref(false)

  function goToZone(meta: (typeof CAMPUS_ZONE_LIST)[number]) {
    zoneMenuOpen.value = false
    void navigateTo(workspacePath.wp(meta.homePath))
  }

  watch(
    zone,
    (z) => {
      if (!import.meta.client) return
      document.documentElement.dataset.campusZone = z.kind
    },
    { immediate: true },
  )

  onUnmounted(() => {
    if (!import.meta.client) return
    delete document.documentElement.dataset.campusZone
  })
</script>

<template>
  <UiDropdownMenu v-model:open="zoneMenuOpen">
    <UiTooltip>
      <UiTooltipTrigger as-child>
        <UiDropdownMenuTrigger
          :class="[
            'inline-flex items-center gap-0.5 rounded-sm transition-colors outline-none focus-visible:ring-1 focus-visible:ring-ring',
            'text-muted-foreground hover:text-foreground data-[state=open]:text-foreground',
            embedded ? 'px-0.5 -mx-0.5 text-xs' : 'text-xs',
          ]"
          :title="`${zone.label} — walk to another room`"
          :aria-label="`Zone: ${zone.label}. Choose a room.`"
          @click.stop
          @pointerdown.stop>
          <Icon
            :name="zoneMenuOpen ? 'lucide:folder-open-dot' : zone.icon"
            class="size-3.5 shrink-0" />
          <span class="truncate max-w-[100px]">{{ zone.label }}</span>
          <Icon
            name="lucide:chevron-down"
            class="h-3 w-3 shrink-0 opacity-60 transition-transform duration-150"
            :class="zoneMenuOpen ? 'rotate-180 opacity-80' : ''" />
          <span class="sr-only">Toggle zone menu</span>
        </UiDropdownMenuTrigger>
      </UiTooltipTrigger>
      <UiTooltipContent side="bottom" :side-offset="8" class="max-w-xs">
        <div class="space-y-1 text-xs">
          <div class="font-medium">{{ zone.label }}</div>
          <div v-if="!isCloud" class="text-muted-foreground">Runtime: {{ runtimeLabel }}</div>
          <div class="text-muted-foreground">Walk to another room in your facility.</div>
          <div v-if="!isCloud" class="text-muted-foreground">Adapter: {{ adapterMode }}</div>
        </div>
      </UiTooltipContent>
    </UiTooltip>

    <UiDropdownMenuContent align="start" :side-offset="6" class="w-52 z-200">
      <div class="px-2 py-1.5 text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
        Walk to room
      </div>
      <p class="px-2 pb-1.5 text-[10px] text-muted-foreground leading-snug">
        Navigate to a zone home. Mutations still tag the zone of the page you're on.
      </p>
      <UiDropdownMenuItem
        v-for="z in CAMPUS_ZONE_LIST"
        :key="z.kind"
        class="flex items-center gap-2 cursor-pointer"
        @click="goToZone(z)">
        <Icon :name="z.icon" class="h-3.5 w-3.5 shrink-0" />
        <span class="flex-1">{{ z.label }}</span>
        <Icon
          v-if="z.kind === zone.kind"
          name="lucide:check"
          class="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      </UiDropdownMenuItem>
    </UiDropdownMenuContent>
  </UiDropdownMenu>
</template>
