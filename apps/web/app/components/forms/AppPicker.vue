<script lang="ts" setup>
  import type { Application } from '~/types/database'

  const router = useRouter()
  const route = useRoute()
  const { applications, currentApp, organizations } = useInstantData()
  const { getRoleInfo, isOwnedByMe, getMemberCount } = useOrgRoles()

  const createAppOpen = ref(false)

  const orderedApplications = computed(() => {
    return (applications.value || []).slice().sort((a, b) => a.name.localeCompare(b.name))
  })

  const ownedApps = computed(() => orderedApplications.value.filter((a) => isOwnedByMe(a.orgId)))
  const sharedApps = computed(() => orderedApplications.value.filter((a) => !isOwnedByMe(a.orgId)))

  const currentAppRole = computed(() => {
    const orgId = currentApp.value?.orgId
    if (!orgId) return null
    return getRoleInfo(orgId)
  })

  const selectApp = async (app: Application) => {
    currentApp.value = app
    const orgForApp = organizations.value.find((o) => o.id === app.orgId)
    await router.replace({
      query: {
        ...route.query,
        app: app.slug,
        ...(orgForApp?.slug ? { org: orgForApp.slug } : {}),
      },
    })
  }
</script>

<template>
  <div class="flex items-center group">
    <UiDropdownMenu>
      <UiDropdownMenuTrigger as-child>
        <button
          class="flex items-center justify-between gap-1.5 rounded-md px-2 py-1 transition-all duration-200 w-fit group/trigger hover:bg-muted/50">
          <Icon name="lucide:box" class="text-muted-foreground/60 h-3.5 w-3.5 shrink-0" />
          <span class="text-foreground text-xs font-medium leading-none">
            {{ currentApp?.name || 'Select App' }}
          </span>
          <UiBadge
            v-if="currentAppRole"
            variant="secondary"
            size="sm"
            class="ml-1 text-[9px] px-1.5 py-0 h-4"
            :class="currentAppRole.color">
            {{ currentAppRole.label }}
          </UiBadge>
          <Icon
            name="lucide:chevrons-up-down"
            class="text-muted-foreground/75 h-3.5 w-3.5 shrink-0 group-hover/trigger:text-muted-foreground/60 transition-colors ml-0.5" />
        </button>
      </UiDropdownMenuTrigger>
      <UiDropdownMenuContent align="start" :side-offset="8" class="w-[320px]">
        <div class="max-h-[300px] overflow-y-auto">
          <!-- Owned by me -->
          <template v-if="ownedApps.length > 0">
            <UiDropdownMenuLabel class="text-[10px] text-muted-foreground/70 uppercase tracking-wider font-semibold px-2 py-1">
              Owned by me
            </UiDropdownMenuLabel>
            <UiDropdownMenuItem
              v-for="app in ownedApps"
              :key="app.id"
              class="gap-2 rounded justify-between"
              @click="selectApp(app)">
              <div class="flex items-center gap-2 flex-1 min-w-0">
                <Icon v-if="app.icon" :name="app.icon" class="h-4 w-4 shrink-0 text-muted-foreground" />
                <Icon v-else name="lucide:folder" class="h-4 w-4 shrink-0 text-muted-foreground" />
                <span class="truncate">{{ app.name }}</span>
              </div>
              <div class="flex items-center gap-1.5 shrink-0">
                <span class="text-[10px] text-muted-foreground/60 tabular-nums flex items-center gap-0.5">
                  <Icon name="lucide:users" class="h-3 w-3" />
                  {{ getMemberCount(app.orgId) }}
                </span>
                <UiBadge
                  variant="secondary"
                  size="sm"
                  class="text-[9px] px-1.5 py-0 h-4"
                  :class="getRoleInfo(app.orgId).color">
                  {{ getRoleInfo(app.orgId).label }}
                </UiBadge>
                <Icon v-if="app.id === currentApp?.id" name="lucide:check" class="text-primary h-4 w-4" />
              </div>
            </UiDropdownMenuItem>
          </template>

          <!-- Shared with me -->
          <template v-if="sharedApps.length > 0">
            <UiDropdownMenuSeparator v-if="ownedApps.length > 0" />
            <UiDropdownMenuLabel class="text-[10px] text-muted-foreground/70 uppercase tracking-wider font-semibold px-2 py-1">
              Shared with me
            </UiDropdownMenuLabel>
            <UiDropdownMenuItem
              v-for="app in sharedApps"
              :key="app.id"
              class="gap-2 rounded justify-between"
              @click="selectApp(app)">
              <div class="flex items-center gap-2 flex-1 min-w-0">
                <Icon v-if="app.icon" :name="app.icon" class="h-4 w-4 shrink-0 text-muted-foreground" />
                <Icon v-else name="lucide:folder" class="h-4 w-4 shrink-0 text-muted-foreground" />
                <span class="truncate">{{ app.name }}</span>
              </div>
              <div class="flex items-center gap-1.5 shrink-0">
                <span class="text-[10px] text-muted-foreground/60 tabular-nums flex items-center gap-0.5">
                  <Icon name="lucide:users" class="h-3 w-3" />
                  {{ getMemberCount(app.orgId) }}
                </span>
                <UiBadge
                  variant="secondary"
                  size="sm"
                  class="text-[9px] px-1.5 py-0 h-4"
                  :class="getRoleInfo(app.orgId).color">
                  {{ getRoleInfo(app.orgId).label }}
                </UiBadge>
                <Icon v-if="app.id === currentApp?.id" name="lucide:check" class="text-primary h-4 w-4" />
              </div>
            </UiDropdownMenuItem>
          </template>

          <div v-if="orderedApplications.length === 0" class="px-2 py-4 text-center text-sm text-muted-foreground">
            No apps found
          </div>
        </div>
        <UiDropdownMenuSeparator />
        <UiDropdownMenuItem class="gap-2" @click="createAppOpen = true">
          <Icon name="lucide:plus" class="h-4 w-4" />
          <span>Create App</span>
        </UiDropdownMenuItem>
      </UiDropdownMenuContent>
    </UiDropdownMenu>

    <CreateAppDialog
      :open="createAppOpen"
      @update:open="createAppOpen = $event" />
  </div>
</template>
