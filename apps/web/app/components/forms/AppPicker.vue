<script lang="ts" setup>
  import type { Application } from '~/types/database'

  const router = useRouter()
  const route = useRoute()
  const { applications, currentApp, organizations } = useInstantData()

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
            v-if="currentApp"
            :variant="currentApp.isPublic ? 'outline' : 'secondary'"
            size="sm"
            class="ml-1 text-[9px] px-1.5 py-0 h-4">
            {{ currentApp.isPublic ? 'Public' : 'Private' }}
          </UiBadge>
          <Icon
            name="lucide:chevrons-up-down"
            class="text-muted-foreground/75 h-3.5 w-3.5 shrink-0 group-hover/trigger:text-muted-foreground/60 transition-colors ml-0.5" />
        </button>
      </UiDropdownMenuTrigger>
      <UiDropdownMenuContent align="start" :side-offset="8" class="w-[220px]">
        <UiDropdownMenuLabel class="text-xs text-muted-foreground">Select App</UiDropdownMenuLabel>
        <UiDropdownMenuSeparator />
        <div class="max-h-[300px] overflow-y-auto">
          <UiDropdownMenuItem
            v-for="app in orderedApplications"
            :key="app.id"
            class="gap-2 rounded justify-between"
            @click="selectApp(app)">
            <div class="flex items-center gap-2 flex-1 min-w-0">
              <Icon v-if="app.icon" :name="app.icon" class="h-4 w-4 shrink-0 text-muted-foreground" />
              <Icon v-else name="lucide:folder" class="h-4 w-4 shrink-0 text-muted-foreground" />
              <span class="truncate">{{ app.name }}</span>
            </div>
            <div class="flex items-center gap-1.5 shrink-0">
              <UiBadge
                :variant="app.isPublic ? 'outline' : 'secondary'"
                size="sm"
                class="text-[9px] px-1.5 py-0 h-4">
                {{ app.isPublic ? 'Public' : 'Private' }}
              </UiBadge>
              <Icon v-if="app.id === currentApp?.id" name="lucide:check" class="text-primary h-4 w-4" />
            </div>
          </UiDropdownMenuItem>
        </div>
        <UiDropdownMenuSeparator />
        <UiDropdownMenuItem class="gap-2">
          <Icon name="lucide:plus" class="h-4 w-4" />
          <span>Create App</span>
        </UiDropdownMenuItem>
      </UiDropdownMenuContent>
    </UiDropdownMenu>
  </div>
</template>
