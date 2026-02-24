<script lang="ts" setup>
  import { getCleanPath } from '~/config/routes'
  import { getPresenceColor } from '~/utils/presenceColor'

  const props = withDefaults(defineProps<{
    aboveSidebar?: boolean
    hidePresenceControls?: boolean
  }>(), {
    aboveSidebar: false,
    hidePresenceControls: false,
  })


  const routes = useRoutes()
  const route = useRoute()
  const commandDialog = useCommandDialog()
  const pinnedItems = usePinnedItems()
  const { currentApp, updateCollection: updateCollectionData, getCollectionBySlug } = useInstantData()
  const { logoMarkForMode } = useBrandConfig()
  const { userRole: _userRole, roleConfig } = useUserRole()
  const { isInEditMode, toggleEditMode, canToggleEditMode, canManageMembers, isAdmin: _isAdmin } = useAdminUI()
  const { onlineCount, totalMembers: _totalMembers, members: workspaceMembers, isUserOnline } = usePresence()
  const { isRightSidebarOpen: _isRightSidebarOpen, toggleRightSidebar: _toggleRightSidebar } = useRightSidebarWidth()
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
      const color = getPresenceColor(user.value.id)
      all.push({
        id: user.value.id,
        name: (user.value as any).name || (user.value as any).email || 'You',
        avatar: avatarUrl.value,
        initials: initials.value,
        isOnline: true,
        isMe: true,
        color,
      })
    }

    // Add other active members
    const others = (workspaceMembers.value || [])
      .filter(m => m.userId !== user.value?.id)
      .map(m => {
        const color = getPresenceColor(m.userId || '')
        return {
          id: m.userId,
          name: m.name || m.email || 'Member',
          avatar: m.avatar,
          initials: getInitials(m.name || m.email || 'M'),
          isOnline: m.userId ? isUserOnline(m.userId) : false,
          isMe: false,
          color,
        }
      })

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
    const candidate = u?.avatar || u?.imageURL || u?.picture
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

  // Realtime notifications
  const {
    notifications,
    unreadCount,
    notificationBadgeVariant,
    markAsRead,
    markAllAsRead,
    timeAgo: notifTimeAgo,
  } = useNotifications()

  const handleNotificationClick = (notification: any) => {
    if (!notification.isRead) markAsRead(notification.id)
    if (notification.actionUrl) navigateTo(notification.actionUrl)
  }
</script>

<template>
  <!-- App Header: Navigation shell (matches icon rail) -->
  <header
    data-slot="app-header"
    class="bg-card/0 backdrop-blur-sm border-b-none flex h-14 shrink-0 items-center gap-0 p-0 overflow-hidden sticky top-0">
    <!-- Year/Facility Pickers + Breadcrumbs (white area) -->
    <nav class="flex flex-1 items-center gap-0.5 text-xs px-4 bg-transparent">
    <!-- Logo / Home -->
    <div class="flex h-16 w-12 items-center justify-center shrink-0 border-b bg-transparent">
      <div
        class="flex h-9 w-9 items-center justify-center rounded-lg transition bg-transparent hover:bg-transparent"
        :class="isInEditMode ? 'bg-accent-foreground/10 hover:bg-accent-foreground/20' : 'bg-rail-foreground/10 hover:bg-rail-foreground/20'">
        <AppLogo class="scale-75" :brand-mark="logoMarkForMode" />
      </div>
    </div>

      <span class="text-muted-foreground/30 mr-3 ml-1 rotate-10 text-lg">
        /
      </span>

      <!-- Organization Picker (all authenticated users) -->
      <ClientOnly>
        <OrganizationPicker />
      </ClientOnly>

      <span class="text-muted-foreground/30 mx-3 rotate-10 text-lg">
        /
      </span>

      <!-- Workspace Picker (all members) -->
      <ClientOnly>
        <AppPicker />
      </ClientOnly>

      <!-- Path breadcrumbs -->
      <template v-for="(item, i) in routes.breadcrumbs.value" :key="i">
        <template v-if="item?.label">
          <span class="text-muted-foreground/50 mx-3 rotate-10 text-lg">/</span>
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
        class="rounded-full text-muted-foreground hover:text-foreground hover:bg-muted-foreground/10 border border-border bg-card/0 gap-2 pl-3 pr-2 min-w-[300px] flex items-center justify-between"
        @click="commandDialog.open()">
        <div class="flex items-center gap-2">
          <Icon name="lucide:search" class="h-4 w-4" />
          <span class="text-xs font-semibold opacity-50">Find...</span>
        </div>
        <UiKbd class="bg-card border-border/50 text-muted-foreground font-mono border rounded-full gap-0">
          <Icon name="lucide:command" class="scale-75" />
          <span class="text-[12px]">K</span>
        </UiKbd>
      </UiButton>

      <!-- Workspace Members & Presence -->
      <div v-if="!props.hidePresenceControls && workspaceUsers.length > 0" class="flex items-center ml-2 mr-1">
        <UiTooltip>
          <UiTooltipTrigger as-child>
            <AppNavLink
              to="/settings/members"
              class="flex items-center rounded-full border border-border bg-card/10 px-1 py-1 gap-1 hover:bg-card/20 transition-colors">
              <div class="flex -space-x-1.5 px-0.5">
                <div
                  v-for="(u, index) in workspaceUsers"
                  :key="u.id"
                  class="relative rounded-full ring-2 ring-offset-1 ring-offset-background transition-all hover:scale-110 grayscale-[0.2] hover:grayscale-0"
                  :class="u.color.ring"
                  :style="{ zIndex: workspaceUsers.length - index }"
                  :title="u.name + (u.isMe ? ' (you)' : '')">
                  <UiAvatar class="size-6">
                    <UiAvatarImage v-if="u.avatar" :src="u.avatar" :alt="u.name" />
                    <UiAvatarFallback class="text-[9px] font-bold text-white" :class="u.color.bg">{{ u.initials }}</UiAvatarFallback>
                  </UiAvatar>
                  <span
                    v-if="u.isOnline"
                    class="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border border-background bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]"
                  />
                </div>
              </div>
              <div class="px-2 border-l ml-0.5 flex flex-col justify-center h-5">
                <p class="text-[10px] leading-none font-bold text-foreground/80 tabular-nums">
                  <!-- {{ onlineCount }}<span class="text-muted-foreground font-medium uppercase tracking-tighter">/{{ totalMembers }} online</span> -->
                  {{ onlineCount }}<span class="text-muted-foreground font-medium uppercase tracking-tighter"> online</span>
                </p>
              </div>
              <UiButton v-if="canManageMembers" size="xs" variant="outline" class="border-l border-border/40 flex items-center rounded-full">
                <Icon name="lucide:plus" class="h-3.5 w-3.5 text-muted-foreground" />
                <span class="text-[10px] leading-none font-bold text-muted-foreground tabular-nums mr-2 uppercase">Invite</span>
              </UiButton>
            </AppNavLink>
          </UiTooltipTrigger>
          <UiTooltipContent side="bottom" :side-offset="8">Manage members</UiTooltipContent>
        </UiTooltip>
      </div>


      <!-- Notifications Button -->
      <UiDropdownMenu>
        <UiDropdownMenuTrigger as-child>
          <UiButton
            variant="outline"
            size="icon-sm"
            class="text-muted-foreground hover:text-foreground bg-transparent! relative transition-transform active:scale-95 mr-1 !rounded-full">
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
                  !notification.isRead
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
                  v-if="!notification.isRead"
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
                  <Icon :name="notification.icon || 'lucide:bell'" class="h-5 w-5" />
                </div>

                <div class="flex-1 min-w-0 space-y-1.5">
                  <div class="flex items-center justify-between">
                    <span
                      class="text-sm font-semibold tracking-tight truncate transition-colors duration-300"
                      :class="!notification.isRead ? 'text-foreground' : 'text-muted-foreground/80'">
                      {{ notification.title }}
                    </span>
                    <span
                      class="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest tabular-nums whitespace-nowrap ml-2">
                      {{ notifTimeAgo(notification.createdAt) }}
                    </span>
                  </div>
                  <p
                    class="text-xs text-muted-foreground line-clamp-2 leading-relaxed opacity-90 group-hover:opacity-100 transition-opacity">
                    {{ notification.message }}
                  </p>

                  <div class="pt-1 flex items-center justify-between">
                    <div class="flex items-center gap-2">
                      <span
                        v-if="notification.orgName"
                        class="rounded-md px-1.5 py-0.5 text-[9px] font-semibold tracking-wide text-muted-foreground/70 bg-muted/50 ring-1 ring-border/30 truncate max-w-[140px]">
                        {{ notification.orgName }}
                      </span>
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
                      v-if="notification.actionUrl"
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
              class="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-muted/50 text-xs font-semibold transition-all hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-95"
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

      <!-- Right Sidebar Toggle -->
      <!-- <UiTooltip v-if="props.aboveSidebar">
        <UiTooltipTrigger as-child>
          <UiButton
            variant="outline"
            size="icon-sm"
            class="text-muted-foreground hover:text-foreground transition-transform active:scale-95 ml-1 rounded-full"
            @click="emit('toggleRightSidebar')">
            <Icon name="lucide:panel-right" class="h-4 w-4" />
          </UiButton>
        </UiTooltipTrigger>
        <UiTooltipContent side="bottom">Toggle details panel</UiTooltipContent>
      </UiTooltip> -->

      <!-- AI Assistant Toggle -->
      <!-- <UiTooltip>
        <UiTooltipTrigger as-child>
          <button
            type="button"
            :aria-expanded="isRightSidebarOpen"
            aria-label="Toggle AI assistant"
            class="group flex h-8 w-8 items-center justify-center rounded-full transition bg-muted-foreground"
            @click="toggleRightSidebar">
            <Icon name="lucide:bot" class="h-4 w-4 text-background" />
          </button>
        </UiTooltipTrigger>
        <UiTooltipContent side="bottom">AI assistant</UiTooltipContent>
      </UiTooltip> -->

      <!-- Member Invite Dialog -->
      <MemberInviteDialog v-model:open="inviteDialogOpen" />
    </div>
  </header>
</template>
