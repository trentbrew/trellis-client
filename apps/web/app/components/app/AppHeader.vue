<script lang="ts" setup>
  import { getCleanPath } from '~/config/routes'

  const routes = useRoutes()
  const route = useRoute()
  const commandDialog = useCommandDialog()
  const pinnedItems = usePinnedItems()
  const sidebarCollapse = useSidebarCollapse()
  const { currentApp, updateCollection: updateCollectionData, getCollectionBySlug } = useInstantData()
  const { userRole: _userRole } = useUserRole()
  const isResizing = useState<boolean>('isSidebarResizing', () => false)

  // Reactive collection based on current route
  const currentCollection = computed(() => {
    const cleanPath = getCleanPath(route.path)
    if (!cleanPath.startsWith('/collections/')) return null
    const slug = cleanPath.split('/collections/')[1]
    if (!slug || !currentApp.value) return null
    return getCollectionBySlug(currentApp.value.id, slug)
  })

  const collectionSchemaSheetOpen = useState<boolean>('collectionSchemaSheetOpen', () => false)
  const collectionRefreshNonce = useState<number>('collectionRefreshNonce', () => 0)
  const collectionNeedsSetup = useState<boolean>('collectionNeedsSetup', () => false)

  const canEditCollectionSchema = computed(() => currentCollection.value?.type === 'database')
  const showCollectionActions = computed(() => currentCollection.value && !collectionNeedsSetup.value)

  const openSchemaEditor = () => {
    if (!canEditCollectionSchema.value) return
    collectionSchemaSheetOpen.value = true
  }

  const refreshCollection = () => {
    collectionRefreshNonce.value = collectionRefreshNonce.value + 1
  }

  watch(
    () => route.path,
    (path) => {
      if (path.startsWith('/collections/')) return
      collectionSchemaSheetOpen.value = false
    },
    { immediate: true },
  )

  const _updatePublished = async (isPublished: boolean) => {
    if (!currentCollection.value) return
    await updateCollectionData(currentCollection.value.id, { isPublished })
  }

  const getElapsedTime = (lastSaved: Date) => {
    const now = new Date()
    const diffMs = now.getTime() - lastSaved.getTime()
    const diffSecs = Math.floor(diffMs / 1000)
    const diffMins = Math.floor(diffSecs / 60)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)
    const diffMonths = Math.floor(diffDays / 30)
    const diffYears = Math.floor(diffMonths / 12)

    if (diffYears > 0) return `${diffYears} year${diffYears > 1 ? 's' : ''}`
    if (diffMonths > 0) return `${diffMonths} month${diffMonths > 1 ? 's' : ''}`
    if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''}`
    if (diffHours > 0) return `${diffHours} hr${diffHours > 1 ? 's' : ''}`
    if (diffMins > 0) return `${diffMins} min${diffMins > 1 ? 's' : ''}`
    return 'just now'
  }

  // Get save state (shared singleton)
  const saveState = useCollectionSaveState()
  const isSaving = saveState.isSaving
  const lastSaved = saveState.lastSaved

  const _isCurrentPagePinned = computed(() => {
    return pinnedItems.isPinned(getCleanPath(route.path))
  })

  const _togglePinCurrentPage = () => {
    pinnedItems.togglePin(getCleanPath(route.path))
  }

  // No watch needed - currentCollection is reactive via computed()

  // Mock notifications with sidebar-aligned ontology
  const notifications = ref([
    {
      id: 1,
      title: 'High Severity Alert',
      message: 'Critical system update required for facility security.',
      time: '5m ago',
      variant: 'destructive',
      icon: 'lucide:alert-triangle',
      unread: true,
      to: '/security/updates',
    },
    {
      id: 2,
      title: 'Maintenance Warning',
      message: 'Scheduled maintenance for the data center tomorrow at 2 AM.',
      time: '1h ago',
      variant: 'warning',
      icon: 'lucide:clock',
      unread: true,
      to: '/infrastructure/maintenance',
    },
    {
      id: 3,
      title: 'Successful Backup',
      message: 'All facility records have been successfully backed up to the cloud.',
      time: '3h ago',
      variant: 'success',
      icon: 'lucide:check-circle',
      unread: false,
      to: '/data/backups',
    },
    {
      id: 4,
      title: 'New User Onboarded',
      message: 'A new staff member has been added to the system.',
      time: '5h ago',
      variant: 'default',
      icon: 'lucide:user-plus',
      unread: false,
      to: '/users/management',
    },
  ])

  const unreadCount = computed(() => notifications.value.filter((n) => n.unread).length)

  const notificationBadgeVariant = computed(() => {
    if (notifications.value.some((n) => n.unread && n.variant === 'destructive')) return 'destructive'
    if (notifications.value.some((n) => n.unread && n.variant === 'warning')) return 'warning'
    if (notifications.value.some((n) => n.unread && n.variant === 'success')) return 'success'
    return 'default'
  })

  const markAllAsRead = () => {
    notifications.value = notifications.value.map((n) => ({ ...n, unread: false }))
  }

  const handleNotificationClick = (notification: any) => {
    notification.unread = false
    if (notification.to) {
      navigateTo(notification.to)
    }
  }
</script>

<template>
  <!-- App Header: Navigation shell (matches icon rail) -->
  <header class="border-rail-border bg-rail border-b flex h-16 shrink-0 items-center gap-0 p-0 overflow-hidden">
    <!-- Year/Facility Pickers + Breadcrumbs (white area) -->
    <nav class="flex flex-1 items-center gap-0.5 text-sm px-4">
      <!-- Sidebar Toggle -->
      <UiTooltip>
        <UiTooltipTrigger as-child>
          <UiButton
            variant="ghost"
            size="icon-sm"
            class="text-muted-foreground hover:text-foreground mr-2"
            :aria-label="sidebarCollapse.isCollapsed.value ? 'Expand sidebar' : 'Collapse sidebar'"
            @click="sidebarCollapse.toggle()">
            <Icon name="lucide:menu" class="h-4 w-4" />
          </UiButton>
        </UiTooltipTrigger>
        <UiTooltipContent side="bottom">
          {{ sidebarCollapse.isCollapsed.value ? 'Expand sidebar' : 'Collapse sidebar' }}
        </UiTooltipContent>
      </UiTooltip>

      <!-- Organization Picker -->
      <ClientOnly>
        <OrganizationPicker />
      </ClientOnly>

      <span class="text-muted-foreground/30 mx-1">
        /
      </span>

      <!-- App Picker -->
      <ClientOnly>
        <AppPicker />
      </ClientOnly>

      <span class="text-muted-foreground/50 mx-2">/</span>

      <!-- Facility Switcher -->
      <ClientOnly>
        <FacilitySwitcher />
      </ClientOnly>
      <!-- Path breadcrumbs -->
      <template v-for="(item, i) in routes.breadcrumbs.value" :key="i">
        <template v-if="item?.label">
          <span class="text-muted-foreground/50 mx-3">/</span>
          <AppNavLink
            v-if="item.path && i !== routes.breadcrumbs.value.length - 1"
            :to="item.path"
            class="text-muted-foreground hover:text-foreground transition-colors">
            {{ item.label }}
          </AppNavLink>
          <span v-else class="text-foreground/90 font-medium">
            {{ item.label }}
          </span>
        </template>
      </template>

      <div v-if="showCollectionActions" class="flex items-center gap-1 ml-2">
        <UiButton
          v-if="canEditCollectionSchema"
          variant="ghost"
          size="icon-sm"
          class="text-muted-foreground hover:text-foreground"
          @click="openSchemaEditor">
          <Icon name="lucide:settings" class="h-4 w-4" />
        </UiButton>
        <UiButton
          variant="ghost"
          size="icon-sm"
          class="text-muted-foreground hover:text-foreground"
          @click="refreshCollection">
          <Icon name="lucide:refresh-cw" class="h-4 w-4" />
        </UiButton>
      </div>
    </nav>
    <div class="flex items-center mr-4 gap-3">
      <!-- Save Status -->
      <UiSheet>
        <UiSheetTrigger as-child>
          <button
            v-if="currentCollection && (isSaving || lastSaved)"
            class="flex items-center gap-2 text-xs text-muted-foreground mr-2 hover:text-foreground transition-colors">
            <div v-if="isSaving" class="flex items-center gap-1">
              <Icon name="lucide:loader-2" class="h-3 w-3 animate-spin" />
              <span>Saving...</span>
            </div>
            <div v-else-if="lastSaved" class="flex items-center gap-2">
              <span>Edited {{ getElapsedTime(lastSaved) }} ago</span>
            </div>
          </button>
        </UiSheetTrigger>
        <UiSheetContent side="right">
          <UiSheetHeader>
            <UiSheetTitle>Change History</UiSheetTitle>
            <UiSheetDescription>This feature is in progress</UiSheetDescription>
          </UiSheetHeader>
          <div class="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <Icon name="lucide:history" class="h-12 w-12 mb-4 opacity-50" />
            <p class="text-sm">Change log coming soon</p>
          </div>
        </UiSheetContent>
      </UiSheet>

      <!-- Global Search -->
      <UiButton
        variant="ghost"
        size="sm"
        class="text-muted-foreground hover:text-foreground border border-border/40 hover:bg-muted/40 bg-card gap-2 px-4 min-w-[200px]"
        @click="commandDialog.open()">
        <Icon name="lucide:search" class="h-4 w-4" />
        <span class="text-xs font-semibold">Search...</span>
        <UiKbd class="bg-muted/40 border-border/50 text-muted-foreground text-[10px]">⌘K</UiKbd>
      </UiButton>

      <!-- Notifications Button -->
      <UiDropdownMenu>
        <UiDropdownMenuTrigger as-child>
          <UiButton
            variant="ghost"
            size="icon-sm"
            class="text-muted-foreground hover:text-foreground relative transition-transform active:scale-95">
            <Icon name="lucide:bell" class="h-4 w-4" />
            <Motion
              v-if="unreadCount > 0"
              :initial="{ scale: 0, opacity: 0 }"
              :animate="{ scale: 1, opacity: 1 }"
              :transition="isResizing ? { duration: 0 } : undefined"
              class="absolute -top-1 -right-1 flex h-4.5 w-4.5 items-center justify-center rounded-full text-[10px] font-bold ring-2 ring-card"
              :class="[
                notificationBadgeVariant === 'destructive'
                  ? 'bg-destructive text-destructive-foreground'
                  : notificationBadgeVariant === 'warning'
                    ? 'bg-warning text-warning-foreground'
                    : notificationBadgeVariant === 'success'
                      ? 'bg-success text-success-foreground'
                      : 'bg-primary text-primary-foreground',
              ]">
              {{ unreadCount }}
            </Motion>
          </UiButton>
        </UiDropdownMenuTrigger>
        <UiDropdownMenuContent align="end" class="w-[400px] p-0 overflow-hidden shadow-2xl border-border/50">
          <div class="p-4 border-b bg-muted/20 flex items-center justify-between">
            <div>
              <UiDropdownMenuLabel class="p-0 font-bold text-base tracking-tight">Notifications</UiDropdownMenuLabel>
              <p class="text-[11px] text-muted-foreground leading-none mt-1">
                You have {{ unreadCount }} unread messages
              </p>
            </div>
            <UiButton
              variant="ghost"
              size="xs"
              class="text-[10px] h-7 px-3 font-semibold hover:bg-primary/10 hover:text-primary transition-colors"
              @click="markAllAsRead">
              Mark all as read
            </UiButton>
          </div>
          <div class="max-h-[480px] overflow-y-auto custom-scrollbar">
            <template v-if="notifications.length > 0">
              <div
                v-for="notification in notifications"
                :key="notification.id"
                class="relative flex cursor-pointer gap-4 border-b p-4 transition-all duration-300 group last:border-0"
                :class="[
                  notification.unread
                    ? notification.variant === 'destructive'
                      ? 'bg-destructive/6 hover:bg-destructive/8'
                      : notification.variant === 'warning'
                        ? 'bg-warning/6 hover:bg-warning/8'
                        : notification.variant === 'success'
                          ? 'bg-success/6 hover:bg-success/8'
                          : 'bg-primary/6 hover:bg-primary/8'
                    : 'bg-transparent hover:bg-muted/30',
                ]"
                @click="handleNotificationClick(notification)">
                <!-- Indicator Bar -->
                <div
                  v-if="notification.unread"
                  class="absolute left-0 top-2 bottom-2 w-1 rounded-r-full transition-all duration-300 group-hover:w-1.5"
                  :class="[
                    notification.variant === 'destructive'
                      ? 'bg-destructive'
                      : notification.variant === 'warning'
                        ? 'bg-warning'
                        : notification.variant === 'success'
                          ? 'bg-success'
                          : 'bg-primary',
                  ]"></div>

                <!-- Icon Container -->
                <div
                  class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-sm ring-1 transition-all duration-300 group-hover:scale-110 group-hover:rotate-3"
                  :class="[
                    notification.variant === 'destructive'
                      ? 'bg-destructive/20 text-destructive ring-destructive/30 shadow-destructive/10'
                      : notification.variant === 'warning'
                        ? 'bg-warning/20 text-warning ring-warning/30 shadow-warning/10'
                        : notification.variant === 'success'
                          ? 'bg-success/20 text-success ring-success/30 shadow-success/10'
                          : 'bg-primary/20 text-primary ring-primary/30 shadow-primary/10',
                  ]">
                  <Icon :name="notification.icon" class="h-5 w-5" />
                </div>

                <div class="flex-1 min-w-0 space-y-1.5">
                  <div class="flex items-center justify-between">
                    <span
                      class="text-sm font-semibold tracking-tight truncate transition-colors duration-300"
                      :class="notification.unread ? 'text-foreground' : 'text-muted-foreground/80'">
                      {{ notification.title }}
                    </span>
                    <span
                      class="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest tabular-nums whitespace-nowrap ml-2">
                      {{ notification.time }}
                    </span>
                  </div>
                  <p
                    class="text-xs text-muted-foreground line-clamp-2 leading-relaxed opacity-90 group-hover:opacity-100 transition-opacity">
                    {{ notification.message }}
                  </p>

                  <div class="pt-1 flex items-center justify-between">
                    <div class="flex items-center gap-2">
                      <span
                        class="rounded-md px-1.5 py-0.5 text-[9px] font-black uppercase tracking-[0.1em] shadow-xs ring-1"
                        :class="[
                          notification.variant === 'destructive'
                            ? 'bg-destructive/15 text-destructive ring-destructive/30'
                            : notification.variant === 'warning'
                              ? 'bg-warning/15 text-warning ring-warning/30'
                              : notification.variant === 'success'
                                ? 'bg-success/15 text-success ring-success/30'
                                : 'bg-muted text-muted-foreground ring-border/50',
                        ]">
                        {{ notification.variant === 'default' ? 'system' : notification.variant }}
                      </span>
                    </div>

                    <UiButton
                      v-if="notification.to"
                      variant="ghost"
                      size="xs"
                      class="h-7 px-2.5 text-[10px] font-black uppercase tracking-wider text-primary hover:bg-primary/10 opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 transition-all duration-300 active:scale-95"
                      @click.stop="handleNotificationClick(notification)">
                      Open
                      <Icon name="lucide:chevron-right" class="ml-1 h-3.5 w-3.5" />
                    </UiButton>
                  </div>
                </div>
              </div>
            </template>
            <div v-else class="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <div class="relative mb-4">
                <Icon name="lucide:bell" class="h-12 w-12 opacity-10" />
                <Icon name="lucide:check" class="absolute -bottom-1 -right-1 h-5 w-5 text-emerald-500 opacity-50" />
              </div>
              <p class="text-sm font-bold tracking-tight">All caught up!</p>
              <p class="text-xs opacity-60">No new notifications for you</p>
            </div>
          </div>
          <div v-if="notifications.length > 0" class="p-3 border-t bg-muted/5 text-center">
            <UiButton
              variant="ghost"
              size="sm"
              class="w-full text-xs font-bold text-muted-foreground hover:text-primary transition-colors hover:bg-primary/5"
              @click="navigateTo('/notifications')">
              View all activity
            </UiButton>
          </div>
        </UiDropdownMenuContent>
      </UiDropdownMenu>

      <!-- Activity Button -->
      <UiSheet>
        <UiSheetTrigger as-child>
          <UiButton variant="ghost" size="icon-sm" class="text-muted-foreground hover:text-foreground">
            <Icon name="lucide:activity" class="h-4 w-4" />
          </UiButton>
        </UiSheetTrigger>
        <UiSheetContent side="right">
          <UiSheetHeader>
            <UiSheetTitle>Activity</UiSheetTitle>
            <UiSheetDescription>Recent activity and updates</UiSheetDescription>
          </UiSheetHeader>
          <div class="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <Icon name="lucide:activity" class="h-12 w-12 mb-4 opacity-50" />
            <p class="text-sm">Activity feed coming soon</p>
          </div>
        </UiSheetContent>
      </UiSheet>
    </div>
  </header>
</template>
