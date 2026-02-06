<script lang="ts" setup>
  import { parseFullPath } from '~/config/routes'

  const { organizations, currentOrganization, selectOrganization } = useOrganizations()
  const { roleConfig, userRole } = useUserRole()
  const { selectedYear } = useYear()

  const canSwitchOrganization = computed(() => userRole.value === 'super_admin')
  const { facilities } = useFacilities()
  const route = useRoute()
  const router = useRouter()

  const searchQuery = ref('')

  const filteredOrganizations = computed(() => {
    if (!searchQuery.value.trim()) return organizations.value

    const query = searchQuery.value.toLowerCase()
    return organizations.value.filter((org) => {
      return org.name.toLowerCase().includes(query) || org.slug.toLowerCase().includes(query)
    })
  })

  const handleSelect = (organizationId: string) => {
    const org = organizations.value.find((o) => o.id === organizationId)
    if (!org) return

    selectOrganization(organizationId)
    searchQuery.value = ''

    // If we're in a facility context, we need to update the URL and potentially the facility
    const { cleanPath } = parseFullPath(route.path)
    if (cleanPath.startsWith('/facility')) {
      // Find the first facility for this new organization
      const orgFacilities = facilities.value.filter((f) => f.organizationId === organizationId)
      const targetFacilitySlug = orgFacilities[0]?.slug || 'unknown'
      const subPath = cleanPath.replace(/^\/facility/, '')
      router.push(`/${org.slug}/${selectedYear.value}/${targetFacilitySlug}${subPath}`)
    }
  }
</script>

<template>
  <div class="flex items-center">
    <UiDropdownMenu :disabled="!canSwitchOrganization">
      <UiDropdownMenuTrigger as-child>
        <button
          class="flex items-center justify-between gap-1.5 rounded-md px-2 py-1 transition-all duration-200 w-fit group"
          :class="[canSwitchOrganization ? 'hover:bg-muted/50' : 'cursor-default']">
          <div class="flex items-center gap-2 min-w-0">
            <Icon name="lucide:building-2" class="text-muted-foreground/60 h-4 w-4 shrink-0" />
            <span
              v-if="currentOrganization"
              class="text-foreground text-xs font-medium truncate leading-none min-w-fit">
              {{ currentOrganization.name }}
            </span>
            <span v-else class="text-muted-foreground text-xs leading-none">Select Org</span>

            <span
              v-if="
                roleConfig && (userRole === 'admin' || userRole === 'super_admin' || userRole === 'corporate_admin')
              "
              class="font-black uppercase text-[9px] tracking-[0.05em] flex items-center bg-primary/10 border border-primary/20 py-0.5 px-2 rounded-full text-primary shadow-none shrink-0 ml-1">
              <Icon :name="roleConfig.icon" class="h-3 w-3 mr-1.5 opacity-80" />
              {{ roleConfig.label }}
            </span>
          </div>
          <Icon
            name="lucide:chevrons-up-down"
            class="text-muted-foreground/75 h-3.5 w-3.5 shrink-0 group-hover:text-muted-foreground/60 transition-colors ml-0.5" />
        </button>
      </UiDropdownMenuTrigger>
      <UiDropdownMenuContent align="start" :side-offset="8" class="w-[280px]">
        <div class="flex items-center gap-2 px-2 py-1.5">
          <Icon name="lucide:search" class="text-muted-foreground h-4 w-4 shrink-0" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search organizations..."
            class="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
        </div>
        <UiDropdownMenuSeparator />
        <div class="max-h-[300px] overflow-y-auto">
          <UiDropdownMenuItem
            v-for="org in filteredOrganizations"
            :key="org.id"
            class="gap-3 rounded"
            @click="handleSelect(org.id)">
            <Icon name="lucide:boxes" class="text-muted-foreground h-4 w-4 shrink-0" />
            <div class="flex-1 min-w-0">
              <div class="font-medium truncate">{{ org.name }}</div>
              <div v-if="org.description" class="text-xs text-muted-foreground truncate">
                {{ org.description }}
              </div>
            </div>
            <Icon v-if="org.id === currentOrganization?.id" name="lucide:check" class="text-primary h-4 w-4 shrink-0" />
          </UiDropdownMenuItem>
          <div v-if="filteredOrganizations.length === 0" class="px-2 py-4 text-center text-sm text-muted-foreground">
            No organizations found
          </div>
        </div>
        <UiDropdownMenuSeparator />
        <UiDropdownMenuItem class="gap-2">
          <Icon name="lucide:plus" class="h-4 w-4" />
          <span>New Organization</span>
        </UiDropdownMenuItem>
      </UiDropdownMenuContent>
    </UiDropdownMenu>
  </div>
</template>
