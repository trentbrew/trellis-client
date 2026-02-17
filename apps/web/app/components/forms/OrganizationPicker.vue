<script lang="ts" setup>
  const { organizations, currentOrganization, selectOrganization } = useOrganizations()
  const { getRoleInfo } = useOrgRoles()

  const searchQuery = ref('')
  const createOrgOpen = ref(false)

  const filteredOrganizations = computed(() => {
    if (!searchQuery.value.trim()) return organizations.value

    const query = searchQuery.value.toLowerCase()
    return organizations.value.filter((org) => {
      return org.name.toLowerCase().includes(query) || org.slug.toLowerCase().includes(query)
    })
  })

  const getPlanLabel = (plan?: string) => {
    switch (plan) {
      case 'pro':
      case 'enterprise':
        return 'PRO'
      case 'free':
      default:
        return 'FREE'
    }
  }

  const getBadgeForOrg = (orgId: string) => {
    const org = organizations.value.find((o) => o.id === orgId)
    const roleInfo = getRoleInfo(orgId)
    const isOrgAdmin = roleInfo.role === 'owner' || roleInfo.role === 'admin'

    if (isOrgAdmin) {
      const plan = org?.plan || 'free'
      return {
        label: getPlanLabel(plan),
        color: 'bg-muted text-muted-foreground',
      }
    }

    return {
      label: 'Member',
      color: 'bg-muted text-muted-foreground',
    }
  }

  const currentOrgRole = computed(() => {
    if (!currentOrganization.value) return null
    return getBadgeForOrg(currentOrganization.value.id)
  })

  const handleSelect = (organizationId: string) => {
    const org = organizations.value.find((o) => o.id === organizationId)
    if (!org) return

    selectOrganization(organizationId)
    searchQuery.value = ''
  }
</script>

<template>
  <div class="flex items-center">
    <UiDropdownMenu>
      <UiDropdownMenuTrigger as-child>
        <button
          class="flex items-center justify-between gap-1.5 rounded-md px-2 py-1 transition-all duration-200 w-fit group hover:bg-muted/50">
          <div class="flex items-center gap-2 min-w-0">
            <Icon name="lucide:boxes" class="text-muted-foreground/60 h-4 w-4 shrink-0" />
            <span
              v-if="currentOrganization"
              class="text-foreground text-xs font-medium truncate leading-none min-w-fit">
              {{ currentOrganization.name }}
            </span>
            <span v-else class="text-muted-foreground text-xs leading-none">Select Org</span>
            <UiBadge
              v-if="currentOrgRole"
              variant="secondary"
              size="sm"
              class="text-[9px] px-1.5 py-0 h-4 shrink-0"
              :class="currentOrgRole.color">
              {{ currentOrgRole.label }}
            </UiBadge>
          </div>
          <Icon
            name="lucide:chevrons-up-down"
            class="text-muted-foreground/75 h-3.5 w-3.5 shrink-0 group-hover:text-muted-foreground/60 transition-colors ml-0.5" />
        </button>
      </UiDropdownMenuTrigger>
      <UiDropdownMenuContent align="start" :side-offset="8" class="w-[340px]">
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
            <div class="flex items-center gap-1.5 shrink-0">
              <UiBadge
                variant="secondary"
                size="sm"
                class="text-[9px] px-1.5 py-0 h-4"
                :class="getBadgeForOrg(org.id).color">
                {{ getBadgeForOrg(org.id).label }}
              </UiBadge>
              <Icon v-if="org.id === currentOrganization?.id" name="lucide:check" class="text-primary h-4 w-4" />
            </div>
          </UiDropdownMenuItem>
          <div v-if="filteredOrganizations.length === 0" class="px-2 py-4 text-center text-sm text-muted-foreground">
            No organizations found
          </div>
        </div>
        <UiDropdownMenuSeparator />
        <UiDropdownMenuItem class="gap-2" @click="createOrgOpen = true">
          <Icon name="lucide:plus" class="h-4 w-4" />
          <span>New Organization</span>
        </UiDropdownMenuItem>
      </UiDropdownMenuContent>
    </UiDropdownMenu>

    <CreateOrganizationDialog
      :open="createOrgOpen"
      @update:open="createOrgOpen = $event" />
  </div>
</template>
