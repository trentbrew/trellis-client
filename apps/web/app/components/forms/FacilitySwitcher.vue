<script lang="ts" setup>
  import { parseFullPath } from '~/config/routes'

  const { facilities, currentFacility, selectFacility, isLoading } = useFacilities()
  const { roleConfig, userRole } = useUserRole()
  const { selectedYear } = useYear()

  const canSwitchFacility = computed(() => userRole.value === 'super_admin')
  const { currentOrganization } = useOrganizations()
  const route = useRoute()
  const router = useRouter()

  const searchQuery = ref('')

  const getLocationLabel = (location?: { city: string; state: string; region?: string }) => {
    if (!location) return ''
    return `${location.city}, ${location.state}`
  }

  const filteredFacilities = computed(() => {
    if (!searchQuery.value.trim()) return facilities.value

    const query = searchQuery.value.toLowerCase()
    return facilities.value.filter((facility) => {
      return (
        facility.name.toLowerCase().includes(query) ||
        facility.location?.city.toLowerCase().includes(query) ||
        facility.location?.state.toLowerCase().includes(query)
      )
    })
  })

  const handleSelect = (facilityId: string) => {
    const facility = facilities.value.find((f) => f.id === facilityId)
    if (!facility) return

    selectFacility(facilityId)
    searchQuery.value = ''

    // Navigate to [org]/[year]/[facility]/path path
    if (facility?.slug && currentOrganization.value?.slug) {
      const { cleanPath } = parseFullPath(route.path)
      const subPath = cleanPath.startsWith('/facility') ? cleanPath.replace(/^\/facility/, '') : cleanPath
      router.push(`/${currentOrganization.value.slug}/${selectedYear.value}/${facility.slug}${subPath}`)
    }
  }
</script>

<template>
  <UiDropdownMenu :disabled="!canSwitchFacility">
    <UiDropdownMenuTrigger as-child>
      <button
        class="flex items-center justify-between gap-1.5 rounded-md px-2 py-1 transition-all duration-200 w-fit max-w-[280px] group"
        :class="[canSwitchFacility ? 'hover:bg-muted/50' : 'cursor-default']">
        <div class="flex items-center gap-2 min-w-0">
          <Icon name="lucide:factory" class="text-muted-foreground/60 h-4 w-4 shrink-0" />
          <span v-if="isLoading" class="text-muted-foreground text-xs leading-none">Loading...</span>
          <span v-else class="text-foreground text-xs font-medium truncate leading-none">
            {{ currentFacility?.name || 'Select Facility' }}
          </span>

          <span
            v-if="roleConfig && userRole === 'facility_manager'"
            class="font-black uppercase text-[9px] tracking-[0.05em] flex items-center bg-primary/10 border border-primary/20 py-0.5 px-2 rounded-full text-primary shadow-none shrink-0 ml-1">
            <Icon :name="roleConfig.icon" class="h-3 w-3 mr-1.5 opacity-80" />
            {{ roleConfig.label }}
          </span>
        </div>
        <Icon
          v-if="canSwitchFacility"
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
            placeholder="Search facilities..."
            class="w-full bg-background/0 py-1.5 pl-8 pr-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
        </div>
      </div>
      <UiDropdownMenuSeparator />
      <div class="max-h-[300px] overflow-y-auto">
        <template v-if="facilities.length === 0">
          <div class="px-2 py-4 text-center text-sm text-muted-foreground">
            <p>No facilities available</p>
            <p class="text-xs mt-1">Contact your administrator for access</p>
          </div>
        </template>
        <template v-else-if="filteredFacilities.length === 0">
          <div class="px-2 py-4 text-center text-sm text-muted-foreground">
            <p>No facilities found</p>
            <p class="text-xs mt-1">Try a different search term</p>
          </div>
        </template>
        <UiDropdownMenuItem
          v-for="facility in filteredFacilities"
          :key="facility.id"
          class="gap-3 rounded"
          @click="handleSelect(facility.id)">
          <div
            class="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-muted/50">
            <Icon name="lucide:factory" class="h-4 w-4 text-muted-foreground" />
          </div>
          <div class="flex flex-1 flex-col">
            <span class="truncate">{{ facility.name }}</span>
            <span class="text-muted-foreground text-xs">{{ getLocationLabel(facility.location) }}</span>
          </div>
          <Icon v-if="facility.id === currentFacility?.id" name="lucide:check" class="text-primary h-4 w-4 shrink-0" />
        </UiDropdownMenuItem>
      </div>
    </UiDropdownMenuContent>
  </UiDropdownMenu>
</template>
