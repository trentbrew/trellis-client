<script lang="ts" setup>
  import { parseFullPath } from '~/config/routes'

  // Using facilities composable with generic app terminology
  const { facilities: apps, currentFacility: currentApp, selectFacility: selectApp, isLoading } = useFacilities()
  const { roleConfig, userRole } = useUserRole()
  const { workspace } = useContext()

  const canSwitchApp = computed(() => userRole.value === 'super_admin')
  const { currentOrganization: currentWorkspace } = useOrganizations()
  const route = useRoute()
  const router = useRouter()

  const searchQuery = ref('')

  const getLocationLabel = (location?: { city: string; state: string; region?: string }) => {
    if (!location) return ''
    return `${location.city}, ${location.state}`
  }

  const filteredApps = computed(() => {
    if (!searchQuery.value.trim()) return apps.value

    const query = searchQuery.value.toLowerCase()
    return apps.value.filter((app) => {
      return (
        app.name.toLowerCase().includes(query) ||
        app.location?.city.toLowerCase().includes(query) ||
        app.location?.state.toLowerCase().includes(query)
      )
    })
  })

  const handleSelect = (appId: string) => {
    const app = apps.value.find((a) => a.id === appId)
    if (!app) return

    selectApp(appId)
    searchQuery.value = ''

    // Navigate to [workspace]/[app]/path
    if (app?.slug && (currentWorkspace.value?.slug || workspace.value)) {
      const workspaceSlug = currentWorkspace.value?.slug || workspace.value
      const { cleanPath } = parseFullPath(route.path)
      const subPath = cleanPath.startsWith('/app') ? cleanPath.replace(/^\/app/, '') : cleanPath
      router.push(`/${workspaceSlug}/${app.slug}${subPath}`)
    }
  }
</script>

<template>
  <UiDropdownMenu :disabled="!canSwitchApp">
    <UiDropdownMenuTrigger as-child>
      <button
        class="flex items-center justify-between gap-1.5 rounded-md px-2 py-1 transition-all duration-200 w-fit max-w-[280px] group"
        :class="[canSwitchApp ? 'hover:bg-muted/50' : 'cursor-default']">
        <div class="flex items-center gap-2 min-w-0">
          <Icon name="lucide:app-window" class="text-muted-foreground/60 h-4 w-4 shrink-0" />
          <span v-if="isLoading" class="text-muted-foreground text-xs leading-none">Loading...</span>
          <span v-else class="text-foreground text-xs font-medium truncate leading-none">
            {{ currentApp?.name || 'Select App' }}
          </span>

          <span
            v-if="roleConfig && userRole === 'admin'"
            class="font-black uppercase text-[9px] tracking-[0.05em] flex items-center bg-primary/10 border border-primary/20 py-0.5 px-2 rounded-full text-primary shadow-none shrink-0 ml-1">
            <Icon :name="roleConfig.icon" class="h-3 w-3 mr-1.5 opacity-80" />
            {{ roleConfig.label }}
          </span>
        </div>
        <Icon
          v-if="canSwitchApp"
          name="lucide:chevrons-up-down"
          class="text-muted-foreground/75 h-3.5 w-3.5 shrink-0 group-hover:text-muted-foreground/60 transition-colors ml-0.5" />
      </button>
    </UiDropdownMenuTrigger>
    <UiDropdownMenuContent align="start" :side-offset="8" class="w-[280px]">
      <div class="px-2 py-2">
        <div class="relative">
          <Icon name="lucide:search" class="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search apps..."
            class="w-full bg-background/0 py-1.5 pl-8 pr-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
        </div>
      </div>
      <UiDropdownMenuSeparator />
      <div class="max-h-[300px] overflow-y-auto">
        <template v-if="apps.length === 0">
          <div class="px-2 py-4 text-center text-sm text-muted-foreground">
            <p>No apps available</p>
            <p class="text-xs mt-1">Contact your administrator for access</p>
          </div>
        </template>
        <template v-else-if="filteredApps.length === 0">
          <div class="px-2 py-4 text-center text-sm text-muted-foreground">
            <p>No apps found</p>
            <p class="text-xs mt-1">Try a different search term</p>
          </div>
        </template>
        <UiDropdownMenuItem
          v-for="app in filteredApps"
          :key="app.id"
          class="gap-3 rounded"
          @click="handleSelect(app.id)">
          <div
            class="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-muted/50">
            <Icon name="lucide:app-window" class="h-4 w-4 text-muted-foreground" />
          </div>
          <div class="flex flex-1 flex-col">
            <span class="truncate">{{ app.name }}</span>
            <span class="text-muted-foreground text-xs">{{ getLocationLabel(app.location) }}</span>
          </div>
          <Icon v-if="app.id === currentApp?.id" name="lucide:check" class="text-primary h-4 w-4 shrink-0" />
        </UiDropdownMenuItem>
      </div>
    </UiDropdownMenuContent>
  </UiDropdownMenu>
</template>
