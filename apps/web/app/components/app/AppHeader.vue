<script lang="ts" setup>
  import { getCleanPath } from '~/config/routes'

  const props = withDefaults(defineProps<{
    aboveSidebar?: boolean
  }>(), {
    aboveSidebar: false,
  })

  const routes = useRoutes()
  const route = useRoute()
  const commandDialog = useCommandDialog()
  const pinnedItems = usePinnedItems()
  const sidebarCollapse = useSidebarCollapse()
  const { currentApp, updateCollection: updateCollectionData, getCollectionBySlug } = useInstantData()
  const { userRole: _userRole, roleConfig } = useUserRole()
  const { isInEditMode, toggleEditMode, canToggleEditMode, canManageMembers, isAdmin: _isAdmin } = useAdminUI()
  const { onlineCount, totalMembers, members: workspaceMembers, isUserOnline } = usePresence()
  const isResizing = useState<boolean>('isSidebarResizing', () => false)

  // User avatar and auth
  const { user, signOut } = useInstantAuth()

  const getInitials = (value: string) => {
    const cleaned = value.trim()
    if (!cleaned) return 'U'
    const emailPrefix = cleaned.includes('@') ? cleaned.split('@')[0]! : cleaned
    const parts = emailPrefix.split(/[\s._-]+/g).filter(Boolean)
    const first = parts[0]?.[0] ?? 'U'
    const second = parts[1]?.[0] ?? parts[0]?.[1] ?? ''
    return `${first}${second}`.toUpperCase().slice(0, 2)
  }

  const workspaceUsers = computed(() => {
    // Current user + other members
    const all = []

    // Add current user first
    if (user.value) {
      all.push({
        id: user.value.id,
        name: (user.value as any).name || (user.value as any).email || 'You',
        avatar: avatarUrl.value,
        initials: initials.value,
        isOnline: true,
        isMe: true
      })
    }

    // Add other active members
    const others = (workspaceMembers.value || [])
      .filter(m => m.userId !== user.value?.id)
      .map(m => ({
        id: m.userId,
        name: m.name || m.email || 'Member',
        avatar: m.avatar,
        initials: getInitials(m.name || m.email || 'M'),
        isOnline: m.userId ? isUserOnline(m.userId) : false,
        isMe: false
      }))

    return [...all, ...others].slice(0, 5) // Limit to top 5
  })

  const initials = computed(() => {
    const email = (user.value as any)?.email
    const name = (user.value as any)?.name
    return getInitials(name || email || 'User')
  })

  const userDisplayName = computed(() => {
    const u = user.value as any
    return u?.name || u?.email || 'User'
  })

  const avatarUrl = computed(() => {
    const u = user.value as any
    const candidate = u?.picture || u?.photoURL || u?.avatarUrl || u?.imageUrl || u?.imageURL || u?.profileImageUrl
    return typeof candidate === 'string' && candidate.trim() ? candidate.trim() : null
  })

  const handleLogout = async () => {
    await signOut()
    await navigateTo('/auth/login')
  }

  // Invite dialog
  const inviteDialogOpen = ref(false)

  // Reactive collection based on current route
  const currentCollection = computed(() => {
    const cleanPath = getCleanPath(route.path)
    if (!cleanPath.startsWith('/database/collections/')) return null
    const slug = cleanPath.split('/database/collections/')[1]
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
      if (path.startsWith('/database/collections/')) return
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
  <header class="bg-card/0 border-b flex h-16 shrink-0 items-center gap-0 p-0 overflow-hidden sticky top-0 z-10">
    <!-- Year/Facility Pickers + Breadcrumbs (white area) -->
    <nav class="flex flex-1 items-center gap-0.5 text-xs px-4 bg-transparent">
      <!-- Sidebar Toggle -->
      <UiTooltip>
        <UiTooltipTrigger as-child>
          <UiButton
            variant="ghost"
            size="icon-sm"
            class="text-muted-foreground hover:text-foreground mr-2 ml-1"
            :aria-label="sidebarCollapse.isCollapsed.value ? 'Expand sidebar' : 'Collapse sidebar'"
            @click="sidebarCollapse.toggle()">
            <Icon name="lucide:menu" class="h-4 w-4" />
          </UiButton>
        </UiTooltipTrigger>
        <UiTooltipContent side="bottom">
          {{ sidebarCollapse.isCollapsed.value ? 'Expand sidebar' : 'Collapse sidebar' }}
        </UiTooltipContent>
      </UiTooltip>

      <!-- Organization Picker (all authenticated users) -->
      <ClientOnly>
        <OrganizationPicker />
      </ClientOnly>

      <span class="text-muted-foreground/30 mx-1">
        /
      </span>

      <!-- Workspace Picker (all members) -->
      <ClientOnly>
        <AppPicker />
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
    <div class="flex items-center mr-4 gap-2">
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

      <!-- Global Search (shown when header spans above sidebar) -->
      <UiButton
        v-if="props.aboveSidebar"
        variant="ghost"
        class="rounded-full text-muted-foreground/50 hover:text-foreground border border-border hover:bg-muted/40 bg-transparent gap-2 px-4 min-w-[250px] flex items-center justify-between"
        @click="commandDialog.open()">
        <div class="flex items-center gap-2">
          <Icon name="lucide:search" class="h-4 w-4" />
          <span class="text-xs font-semibold">Find...</span>
        </div>
        <UiKbd class="bg-muted/40 border-border/50 text-muted-foreground text-[12px] font-mono">⌘ K</UiKbd>
      </UiButton>

      <!-- Workspace Members & Presence -->
      <div v-if="workspaceUsers.length > 0" class="flex items-center ml-auto mr-2">
        <div class="flex items-center rounded-full border border-border bg-background/50 p-1 shadow-sm transition-colors hover:bg-background/80">
          <div class="flex -space-x-1.5 px-0.5">
            <UiTooltip v-for="u in workspaceUsers" :key="u.id">
              <UiTooltipTrigger as-child>
                <div class="relative">
                  <UiAvatar class="size-6 ring-2 ring-background grayscale-[0.3] transition-all hover:grayscale-0 hover:scale-110 cursor-pointer">
                    <UiAvatarImage v-if="u.avatar" :src="u.avatar" :alt="u.name" />
                    <UiAvatarFallback class="text-[9px] font-bold">{{ u.initials }}</UiAvatarFallback>
                  </UiAvatar>
                  <span
                    v-if="u.isOnline"
                    class="absolute bottom-0 right-0 h-2 w-2 rounded-full border border-background bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                  />
                </div>
              </UiTooltipTrigger>
              <UiTooltipContent side="bottom" class="flex flex-col gap-0.5">
                <span class="font-bold text-xs">{{ u.name }}</span>
                <span class="text-[10px] text-muted-foreground">{{ u.isOnline ? 'Online now' : 'Away' }} {{ u.isMe ? '(You)' : '' }}</span>
              </UiTooltipContent>
            </UiTooltip>
          </div>
          <div class="px-3 border-l ml-1.5 flex flex-col justify-center h-5">
            <p class="text-[10px] leading-none font-bold text-foreground/80">
              {{ onlineCount }} <span class="text-muted-foreground font-medium uppercase tracking-tighter">Online</span>
            </p>
          </div>
                <!-- Invite Button (admin+ only) -->
      <UiButton
        v-if="canManageMembers"
        variant="outline"
        size="xs"
        class="text-muted-foreground hover:bg-primary/10 hover:text-primary gap-1.5 pl-2 pr-3 font-semibold transition-colors "
        @click="inviteDialogOpen = true"
      >
        <Icon name="lucide:plus" class="h-4 w-4" />
        <span>Invite</span>
      </UiButton>
        </div>
      </div>

      <!-- Notifications Button -->
      <UiDropdownMenu>
        <UiDropdownMenuTrigger as-child>
          <UiButton
            variant="ghost"
            size="icon-sm"
            class="text-muted-foreground hover:text-foreground relative transition-transform active:scale-95 mr-3">
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


      <!-- User Avatar -->
      <ClientOnly>
        <UiDropdownMenu>
          <UiDropdownMenuTrigger as-child>
            <button
              type="button"
              class="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border/50 bg-muted/50 text-xs font-semibold transition-all hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-95"
              aria-label="User menu"
            >
              <img
                v-if="avatarUrl"
                :src="avatarUrl"
                :alt="userDisplayName"
                class="h-full w-full rounded-full object-cover"
                referrerpolicy="no-referrer"
              />
              <span v-else class="text-[10px] text-foreground/70">{{ initials }}</span>
            </button>
            <!-- <span class="absolute bottom-4 right-4 h-2 w-2 rounded-full border-2 border-background bg-emerald-500 " /> -->
          </UiDropdownMenuTrigger>

          <UiDropdownMenuContent align="end" class="w-[220px] shadow-2xl border-border/50">
            <div class="px-2 py-2 mb-1 border-b bg-muted/5 flex items-center gap-3">
              <div class="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <span class="text-[10px] font-bold text-primary">{{ initials }}</span>
              </div>
              <div class="flex-1 min-w-0">
                <div class="text-sm font-bold truncate leading-none">{{ userDisplayName }}</div>
                <div class="text-[10px] text-muted-foreground truncate mt-1 uppercase tracking-wider font-bold">{{ roleConfig?.label || 'Member' }}</div>
              </div>
            </div>

            <UiDropdownMenuItem as-child>
              <AppNavLink to="/settings/profile" class="flex w-full items-center">
                <Icon name="lucide:user" class="mr-2 h-4 w-4" />
                Profile settings
              </AppNavLink>
            </UiDropdownMenuItem>

            <template v-if="canToggleEditMode">
              <UiDropdownMenuSeparator />
              <UiDropdownMenuItem class="flex items-center justify-between" @click="toggleEditMode">
                <div class="flex items-center gap-2">
                  <Icon :name="isInEditMode ? 'lucide:pencil-off' : 'lucide:pencil'" class="h-4 w-4" />
                  <span>{{ isInEditMode ? 'Exit Edit Mode' : 'Edit Mode' }}</span>
                </div>
                <div
                  v-if="isInEditMode"
                  class="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
              </UiDropdownMenuItem>
            </template>

            <UiDropdownMenuSeparator />
            <UiDropdownMenuItem class="text-destructive focus:text-destructive" @click="handleLogout">
              <Icon name="lucide:log-out" class="mr-2 h-4 w-4" />
              Sign out
            </UiDropdownMenuItem>
          </UiDropdownMenuContent>
        </UiDropdownMenu>

        <template #fallback>
          <div
            class="flex h-8 w-8 items-center justify-center rounded-full bg-muted/50 text-[10px] font-semibold"
            aria-label="User"
          >
            <Icon name="lucide:user" class="h-4 w-4 opacity-50" />
          </div>
        </template>
      </ClientOnly>

      <!-- Member Invite Dialog -->
      <MemberInviteDialog v-model:open="inviteDialogOpen" />
    </div>
  </header>
</template>
