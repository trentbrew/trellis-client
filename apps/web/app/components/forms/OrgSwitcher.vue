<script lang="ts" setup>
  import type { Organization } from '~/types/database'

  const router = useRouter()
  const route = useRoute()
  const { organizations, currentOrg } = useInstantData()
  const { getRoleInfo, isOwnedByMe, getMemberCount } = useOrgRoles()

  const _getColorClass = (index: number) => {
    const colors = ['bg-primary text-primary-foreground', 'bg-sky-500 text-white', 'bg-emerald-500 text-white']
    return colors[index % colors.length]
  }

  // Organizations are now reactive - auto-updates from InstantDB
  watch(
    organizations,
    (orgs) => {
      if (orgs.length > 0 && !currentOrg.value) {
        currentOrg.value = orgs[0]!
      }
    },
    { immediate: true },
  )

  const ownedOrgs = computed(() => (organizations.value || []).filter((o) => isOwnedByMe(o.id)))
  const sharedOrgs = computed(() => (organizations.value || []).filter((o) => !isOwnedByMe(o.id)))

  const selectOrg = (org: Organization) => {
    currentOrg.value = org
    const nextQuery = { ...route.query } as Record<string, any>
    delete nextQuery.app
    void router.replace({
      query: {
        ...nextQuery,
        org: org.slug,
      },
    })
  }
</script>

<template>
  <UiDropdownMenu>
    <UiDropdownMenuTrigger as-child>
      <button class="hover:bg-accent/10 flex items-center gap-2 rounded-md px-2 py-1.5 text-left transition">
        <Icon name="lucide:boxes" class="text-muted-foreground h-3.5 w-3.5 shrink-0" />
        <span class="text-foreground text-xs font-medium">{{ currentOrg?.name || 'Select Org' }}</span>
        <Icon name="lucide:chevrons-up-down" class="text-muted-foreground h-3.5 w-3.5 shrink-0" />
      </button>
    </UiDropdownMenuTrigger>
    <UiDropdownMenuContent align="start" :side-offset="8" class="w-[340px]">
      <div class="max-h-[300px] overflow-y-auto">
        <!-- Owned by me -->
        <template v-if="ownedOrgs.length > 0">
          <UiDropdownMenuLabel class="text-[10px] text-muted-foreground/70 uppercase tracking-wider font-semibold px-2 py-1">
            Owned by me
          </UiDropdownMenuLabel>
          <UiDropdownMenuItem v-for="org in ownedOrgs" :key="org.id" class="gap-3" @click="selectOrg(org)">
            <Icon name="lucide:boxes" class="text-muted-foreground h-4 w-4 shrink-0" />
            <div class="flex flex-1 flex-col min-w-0">
              <span class="truncate">{{ org.name }}</span>
            </div>
            <div class="flex items-center gap-1.5 shrink-0">
              <span class="text-[10px] text-muted-foreground/60 tabular-nums flex items-center gap-0.5">
                <Icon name="lucide:users" class="h-3 w-3" />
                {{ getMemberCount(org.id) }}
              </span>
              <UiBadge
                variant="secondary"
                size="sm"
                class="text-[9px] px-1.5 py-0 h-4"
                :class="getRoleInfo(org.id).color">
                {{ getRoleInfo(org.id).label }}
              </UiBadge>
              <Icon v-if="org.id === currentOrg?.id" name="lucide:check" class="text-primary h-4 w-4" />
            </div>
          </UiDropdownMenuItem>
        </template>

        <!-- Shared with me -->
        <template v-if="sharedOrgs.length > 0">
          <UiDropdownMenuSeparator v-if="ownedOrgs.length > 0" />
          <UiDropdownMenuLabel class="text-[10px] text-muted-foreground/70 uppercase tracking-wider font-semibold px-2 py-1">
            Shared with me
          </UiDropdownMenuLabel>
          <UiDropdownMenuItem v-for="org in sharedOrgs" :key="org.id" class="gap-3" @click="selectOrg(org)">
            <Icon name="lucide:boxes" class="text-muted-foreground h-4 w-4 shrink-0" />
            <div class="flex flex-1 flex-col min-w-0">
              <span class="truncate">{{ org.name }}</span>
            </div>
            <div class="flex items-center gap-1.5 shrink-0">
              <span class="text-[10px] text-muted-foreground/60 tabular-nums flex items-center gap-0.5">
                <Icon name="lucide:users" class="h-3 w-3" />
                {{ getMemberCount(org.id) }}
              </span>
              <UiBadge
                variant="secondary"
                size="sm"
                class="text-[9px] px-1.5 py-0 h-4"
                :class="getRoleInfo(org.id).color">
                {{ getRoleInfo(org.id).label }}
              </UiBadge>
              <Icon v-if="org.id === currentOrg?.id" name="lucide:check" class="text-primary h-4 w-4" />
            </div>
          </UiDropdownMenuItem>
        </template>
      </div>
      <UiDropdownMenuSeparator />
      <UiDropdownMenuItem icon="lucide:plus">Create organization</UiDropdownMenuItem>
    </UiDropdownMenuContent>
  </UiDropdownMenu>
</template>
