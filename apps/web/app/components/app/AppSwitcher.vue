<script lang="ts" setup>
  import type { Application, WorldAccessLevel } from '~/types/database'

  const router = useRouter()
  const route = useRoute()
  const { applications, currentApp, organizations } = useInstantData()
  const { getRoleInfo, isOwnedByMe, getMemberCount } = useOrgRoles()

  const orderedApplications = computed(() => {
    return (applications.value || []).slice().sort((a, b) => a.name.localeCompare(b.name))
  })

  const accessLevelConfig: Record<WorldAccessLevel, { icon: string; class: string }> = {
    open: { icon: 'lucide:globe', class: 'text-emerald-500/60' },
    closed: { icon: 'lucide:lock', class: 'text-amber-500/60' },
    private: { icon: 'lucide:eye-off', class: 'text-red-500/60' },
  }

  const getAccessIcon = (app: Application) => {
    const level = (app as any).accessLevel as WorldAccessLevel | undefined
    if (!level || level === 'open') return null
    return accessLevelConfig[level]
  }

  const ownedApps = computed(() => orderedApplications.value.filter((a) => isOwnedByMe(a.orgId)))
  const sharedApps = computed(() => orderedApplications.value.filter((a) => !isOwnedByMe(a.orgId)))

  const { wp } = useWorkspacePath()

  const selectApp = async (app: Application) => {
    currentApp.value = app
    const orgForApp = organizations.value.find((o) => o.id === app.orgId)

    // Update query params for context sync
    await router.replace({
      query: {
        ...route.query,
        app: app.slug,
        ...(orgForApp?.slug ? { org: orgForApp.slug } : {}),
      },
    })

    // Navigate to the welcome page for the new world
    await nextTick()
    await navigateTo(wp('/workspace/welcome'))
  }
</script>

<template>
  <UiDropdownMenu>
    <UiDropdownMenuTrigger as-child>
      <button class="hover:bg-accent/10 flex items-center gap-2 rounded-md px-2 py-1.5 text-left transition">
        <Icon name="lucide:box" class="text-muted-foreground h-3.5 w-3.5 shrink-0" />
        <span class="text-foreground text-sm font-medium">{{ currentApp?.name || 'Select App' }}</span>
        <Icon name="lucide:chevrons-up-down" class="text-muted-foreground h-3.5 w-3.5 shrink-0" />
      </button>
    </UiDropdownMenuTrigger>
    <UiDropdownMenuContent align="start" :side-offset="8" class="w-[320px]">
      <div class="max-h-[300px] overflow-y-auto">
        <!-- Owned by me -->
        <template v-if="ownedApps.length > 0">
          <UiDropdownMenuLabel class="text-[10px] text-muted-foreground/70 uppercase tracking-wider font-semibold px-2 py-1">
            Owned by me
          </UiDropdownMenuLabel>
          <UiDropdownMenuItem v-for="app in ownedApps" :key="app.id" class="gap-3" @click="selectApp(app)">
            <Icon v-if="app.icon" :name="app.icon" class="h-4 w-4 shrink-0 text-muted-foreground" />
            <Icon v-else name="lucide:folder" class="h-4 w-4 shrink-0 text-muted-foreground" />
            <div class="flex flex-1 flex-col min-w-0">
              <span class="flex items-center gap-1 truncate">
                {{ app.name }}
                <Icon v-if="getAccessIcon(app)" :name="getAccessIcon(app)!.icon" class="h-3 w-3 shrink-0" :class="getAccessIcon(app)!.class" />
              </span>
              <span v-if="app.description" class="text-muted-foreground text-xs truncate">{{ app.description }}</span>
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
          <UiDropdownMenuItem v-for="app in sharedApps" :key="app.id" class="gap-3" @click="selectApp(app)">
            <Icon v-if="app.icon" :name="app.icon" class="h-4 w-4 shrink-0 text-muted-foreground" />
            <Icon v-else name="lucide:folder" class="h-4 w-4 shrink-0 text-muted-foreground" />
            <div class="flex flex-1 flex-col min-w-0">
              <span class="flex items-center gap-1 truncate">
                {{ app.name }}
                <Icon v-if="getAccessIcon(app)" :name="getAccessIcon(app)!.icon" class="h-3 w-3 shrink-0" :class="getAccessIcon(app)!.class" />
              </span>
              <span v-if="app.description" class="text-muted-foreground text-xs truncate">{{ app.description }}</span>
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
      </div>
      <UiDropdownMenuSeparator />
      <UiDropdownMenuItem icon="lucide:plus">Create application</UiDropdownMenuItem>
    </UiDropdownMenuContent>
  </UiDropdownMenu>
</template>
