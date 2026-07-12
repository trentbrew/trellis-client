<script lang="ts" setup>
  import type { BreadcrumbItem } from '~/components/Ui/Breadcrumbs.vue'
  import { getCleanPath } from '~/config/routes'
  import { getFileBrowseFacet, parseFileCategoryParam } from '~/lib/file-browse-categories'

  const route = useRoute()
  const { user } = useInstantAuth()
  const { mode: adapterMode, entityBackend, ontologyBackend, isCloud } = useAdapterStatus()
  const { breadcrumbs } = useRoutes()
  const workspacePath = useWorkspacePath()
  const { getEntityConfig } = useOntologyRegistry()

  const { zone, rootLabel, runtimeLabel, showRoot } = useCampusLocationLabel()

  const rootIcon = computed(() =>
    user.value ? 'lucide:circle-user' : isCloud.value ? 'lucide:cloud' : 'lucide:hard-drive',
  )

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

  const projection = computed(() => {
    const crumbs = breadcrumbs.value
    if (!crumbs.length) return null
    const last = crumbs[crumbs.length - 1]
    if (!last?.label?.trim()) return null
    if (browseTypeCrumb.value && last.label.toLowerCase() === 'browse') {
      return { label: last.label, path: workspacePath.wp('/workspace/browse') }
    }
    return { label: last.label, path: last.path ? workspacePath.wp(last.path) : undefined }
  })

  const isBrowseHome = computed(() => {
    const cleanPath = getCleanPath(route.path)
    return cleanPath === '/workspace/browse' || cleanPath === '/workspace/browse/'
  })

  const showProjection = computed(() => {
    if (!projection.value) return false
    if (projection.value.label.toLowerCase() === zone.value.label.toLowerCase()) return false
    const label = projection.value.label.toLowerCase()
    if (isBrowseHome.value && !browseTypeParam.value && label === 'browse') return false
    if (browseTypeCrumb.value && label === 'browse') return false
    return true
  })

  const breadcrumbItems = computed<BreadcrumbItem[]>(() => {
    const items: BreadcrumbItem[] = []
    if (showRoot.value) {
      items.push({ label: rootLabel.value, icon: rootIcon.value, slot: 'root' })
    }
    items.push({ slot: 'zone' })
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
        link: browseFileCategoryParam.value ? workspacePath.wp('/workspace/browse?type=file') : undefined,
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
</script>

<template>
  <UiBreadcrumbs
    :items="breadcrumbItems"
    class="campus-context-breadcrumb shrink-0 w-auto text-xs text-muted-foreground app-region-no-drag gap-2.5 sm:gap-3">
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

    <template #zone>
      <CampusZonePicker />
    </template>

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
