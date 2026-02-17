<script lang="ts" setup>
  import type { Application } from '~/types/database'

  const router = useRouter()
  const route = useRoute()
  const { applications, currentApp, organizations } = useInstantData()
  const { getRoleInfo } = useOrgRoles()

  const getColorClass = (color: string) => {
    return color + ' text-white'
  }

  const orderedApplications = computed(() => {
    return (applications.value || []).slice().sort((a, b) => a.name.localeCompare(b.name))
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
  <UiDropdownMenu>
    <UiDropdownMenuTrigger as-child>
      <button class="hover:bg-accent/10 flex items-center gap-2 rounded-md px-2 py-1.5 text-left transition">
        <!-- <div
          class="bg-foreground/10 text-secondary-foreground flex h-6 w-6 shrink-0 items-center justify-center rounded text-xs font-semibold"
        >
          <Icon v-if="currentApp?.icon" :name="currentApp.icon" class="h-5 w-5 opacity-50" />
          <Icon v-else name="lucide:folder" class="h-5 w-5 text-foreground" />
        </div> -->
        <Icon name="lucide:box" class="text-muted-foreground h-3.5 w-3.5 shrink-0" />
        <span class="text-foreground text-sm font-medium">{{ currentApp?.name || 'Select App' }}</span>
        <Icon name="lucide:chevrons-up-down" class="text-muted-foreground h-3.5 w-3.5 shrink-0" />
      </button>
    </UiDropdownMenuTrigger>
    <UiDropdownMenuContent align="start" :side-offset="8" class="w-[320px]">
      <UiDropdownMenuLabel>Apps</UiDropdownMenuLabel>
      <UiDropdownMenuSeparator />
      <div class="max-h-[300px] overflow-y-auto">
        <UiDropdownMenuItem v-for="app in orderedApplications" :key="app.id" class="gap-3" @click="selectApp(app)">
          <div
            class="flex h-6 w-6 shrink-0 items-center justify-center rounded text-xs font-semibold"
            :class="getColorClass(app.color)">
            <Icon v-if="app.icon" :name="app.icon" class="h-5 w-5" />
            <Icon v-else name="lucide:folder" class="h-5 w-5 text-secondary-foreground/50" />
          </div>
          <div class="flex flex-1 flex-col min-w-0">
            <span class="truncate">{{ app.name }}</span>
            <span class="text-muted-foreground text-xs truncate">{{ app.description }}</span>
          </div>
          <div class="flex items-center gap-1.5 shrink-0">
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
      </div>
      <UiDropdownMenuSeparator />
      <UiDropdownMenuItem icon="lucide:plus">Create application</UiDropdownMenuItem>
    </UiDropdownMenuContent>
  </UiDropdownMenu>
</template>
