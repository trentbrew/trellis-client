<script lang="ts" setup>
  import type { BreadcrumbItem } from '~/components/Ui/Breadcrumbs.vue'
  import { getCleanPath } from '~/config/routes'
  import { CAMPUS_ZONE_LIST, campusZoneMeta } from '~/lib/campus-zones'
  import { getFileBrowseFacet, parseFileCategoryParam } from '~/lib/file-browse-categories'

  const route = useRoute()
  const { user } = useInstantAuth()
  const { mode: adapterMode, entityBackend, ontologyBackend, isCloud } = useAdapterStatus()
  const { zoneId } = useZoneContext()
  const { breadcrumbs } = useRoutes()
  const { wp } = useWorkspacePath()
  const { getEntityConfig } = useOntologyRegistry()

  const runtimeLabel = computed(() => (isCloud.value ? 'InstantDB' : 'Local'))

  const rootLabel = computed(() => {
    const u = user.value as { name?: string; email?: string } | null
    const name = u?.name?.trim()
    if (name) return name
    const email = u?.email?.trim()
    if (email) {
      const prefix = email.includes('@') ? email.split('@')[0]! : email
      if (prefix) return prefix.charAt(0).toUpperCase() + prefix.slice(1)
    }
    return runtimeLabel.value
  })

  const rootIcon = computed(() => (user.value ? 'lucide:circle-user' : isCloud.value ? 'lucide:cloud' : 'lucide:hard-drive'))

  const zone = computed(() => campusZoneMeta(zoneId.value))
  const zoneMenuOpen = ref(false)

  /** Active browse type filter — e.g. `note` on `/workspace/browse?type=note`. */
  const browseTypeParam = computed(() => {
    const cleanPath = getCleanPath(route.path)
    if (!cleanPath.startsWith('/workspace/browse')) return null
    const type = route.query.type
    if (typeof type !== 'string' || !type.trim() || type === 'all') return null
    return type.trim()
  })

  const browseTypeCrumb = computed(() => {
    const type = browseTypeParam.value
    if (!type) return null
    const cfg = getEntityConfig(type)
    const label = cfg?.labelPlural ?? cfg?.label ?? type
    return { label, icon: cfg?.icon }
  })

  const browseFileCategoryParam = computed(() => {
    if (browseTypeParam.value !== 'file') return null
    const category = route.query.category
    if (typeof category !== 'string' || !category.trim() || category === 'all') return null
    const parsed = parseFileCategoryParam(category)
    if (parsed === 'all') return null
    const facet = getFileBrowseFacet(parsed)
    return facet ? { label: facet.labelPlural, icon: facet.icon } : null
  })

  /** Deepest route segment — projection label for this page. */
  const projection = computed(() => {
    const crumbs = breadcrumbs.value
    if (!crumbs.length) return null
    const last = crumbs[crumbs.length - 1]
    if (!last?.label?.trim()) return null

    // Browse + type filter: "Browse" stays linkable; type is appended separately.
    if (browseTypeCrumb.value && last.label.toLowerCase() === 'browse') {
      return { label: last.label, path: wp('/workspace/browse') }
    }

    return { label: last.label, path: last.path ? wp(last.path) : undefined }
  })

  const showProjection = computed(() => {
    if (!projection.value) return false
    return projection.value.label.toLowerCase() !== zone.value.label.toLowerCase()
  })

  const breadcrumbItems = computed<BreadcrumbItem[]>(() => {
    const items: BreadcrumbItem[] = [
      { label: rootLabel.value, icon: rootIcon.value, slot: 'root' },
      { slot: 'zone' },
    ]
    if (showProjection.value && projection.value) {
      items.push({
        label: projection.value.label,
        link: projection.value.path,
        disabled: !projection.value.path,
      })
    }
    if (browseTypeCrumb.value) {
      items.push({
        label: browseTypeCrumb.value.label,
        icon: browseTypeCrumb.value.icon,
        disabled: !browseFileCategoryParam.value,
        link: browseFileCategoryParam.value ? wp('/workspace/browse?type=file') : undefined,
      })
    }
    if (browseFileCategoryParam.value) {
      items.push({
        label: browseFileCategoryParam.value.label,
        icon: browseFileCategoryParam.value.icon,
        disabled: true,
      })
    }
    return items
  })

  function goToZone(meta: (typeof CAMPUS_ZONE_LIST)[number]) {
    zoneMenuOpen.value = false
    void navigateTo(wp(meta.homePath))
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
  <UiBreadcrumbs
    :items="breadcrumbItems"
    class="campus-context-breadcrumb shrink-0 w-auto text-xs text-muted-foreground app-region-no-drag gap-2.5 sm:gap-3">
    <!-- Root: runtime (local-first) -->
    <template #root>
      <UiTooltip>
        <UiTooltipTrigger as-child>
          <span class="group inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors cursor-default">
            <Icon :name="rootIcon" class="size-3.5 shrink-0" />
            <span class="truncate max-w-[120px]">{{ rootLabel }}</span>
          </span>
        </UiTooltipTrigger>
        <UiTooltipContent side="bottom" :side-offset="8" class="max-w-xs">
          <div class="space-y-1 text-xs">
            <div class="font-medium">{{ rootLabel }}</div>
            <div class="text-muted-foreground">Runtime: {{ runtimeLabel }}</div>
            <div class="text-muted-foreground">Your graph lives here first.</div>
            <div class="text-muted-foreground">Adapter: {{ adapterMode }}</div>
            <div class="text-muted-foreground">Entities: {{ entityBackend }}</div>
            <div class="text-muted-foreground">Ontologies: {{ ontologyBackend }}</div>
          </div>
        </UiTooltipContent>
      </UiTooltip>
    </template>

    <!-- Zone: room picker (icon dropdown pattern) -->
    <template #zone>
      <UiDropdownMenu v-model:open="zoneMenuOpen">
        <UiDropdownMenuTrigger
          class="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 rounded-sm px-0.5 -mx-0.5 transition-colors outline-none focus-visible:ring-1 focus-visible:ring-ring data-[state=open]:text-foreground"
          :title="`${zone.label} — walk to another room`"
          :aria-label="`Zone: ${zone.label}. Choose a room.`">
          <Icon
            :name="zoneMenuOpen ? 'lucide:folder-open-dot' : zone.icon"
            class="size-3.5 shrink-0" />
          <span>{{ zone.label }}</span>
          <Icon
            name="lucide:chevron-down"
            class="h-3 w-3 shrink-0 opacity-60 transition-transform duration-150"
            :class="zoneMenuOpen ? 'rotate-180 opacity-80' : ''" />
          <span class="sr-only">Toggle zone menu</span>
        </UiDropdownMenuTrigger>

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

    <!-- Projection crumb: campus-muted styling -->
    <template #link="{ item, isNotLastItem, index }">
      <NuxtLink
        v-if="item.label && item.link && !item.disabled"
        :to="item.link"
        class="text-xs truncate max-w-[140px] transition-colors text-muted-foreground hover:text-foreground">
        {{ item.label }}
      </NuxtLink>
      <span
        v-else-if="item.label"
        class="text-xs truncate max-w-[140px]"
        :class="isNotLastItem(index) ? 'text-muted-foreground' : 'text-foreground/90 font-normal'">
        {{ item.label }}
      </span>
    </template>

    <template #separator="{ index }">
      <CampusChromeDivider v-if="index < breadcrumbItems.length - 1" />
    </template>
  </UiBreadcrumbs>
</template>

<style scoped>
  @reference "~/assets/css/tailwind.css";

  .campus-context-breadcrumb :deep([data-slot='breadcrumb-item']) {
    @apply gap-2;
  }

  .campus-context-breadcrumb :deep([data-slot='breadcrumb-icon']) {
    @apply size-3.5 text-muted-foreground/70;
  }
</style>
