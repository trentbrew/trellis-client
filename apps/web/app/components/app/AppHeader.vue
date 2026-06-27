<script lang="ts" setup>
  import { getCleanPath } from '~/config/routes'
  import { getPresenceColor } from '~/utils/presenceColor'

  const props = withDefaults(
    defineProps<{
      aboveSidebar?: boolean
      hidePresenceControls?: boolean
    }>(),
    {
      aboveSidebar: false,
      hidePresenceControls: false,
    },
  )

  const { isTauri, isMacOS, isWindows: _isWindows } = useTauriWindow()

  // Tauri window controls for custom traffic lights
  const closeWindow = async () => {
    if (import.meta.client && (window as any).__TAURI__) {
      const appWindow = (window as any).__TAURI__.window.getCurrentWindow()
      await appWindow.close()
    }
  }

  const minimizeWindow = async () => {
    if (import.meta.client && (window as any).__TAURI__) {
      const appWindow = (window as any).__TAURI__.window.getCurrentWindow()
      await appWindow.minimize()
    }
  }

  const toggleFullscreen = async () => {
    if (import.meta.client && (window as any).__TAURI__) {
      const appWindow = (window as any).__TAURI__.window.getCurrentWindow()
      await appWindow.setFullscreen(!(await appWindow.isFullscreen()))
    }
  }

  const route = useRoute()
  const pinnedItems = usePinnedItems()
  const {
    currentApp,
    organizations,
    applications,
    updateCollection: updateCollectionData,
    getCollectionBySlug,
  } = useInstantData()

  // Hide pickers when there's only one org/app — vault-feel UX with zero chrome
  const showOrgPicker = computed(() => (organizations.value?.length || 0) > 1)
  const showAppPicker = computed(() => (applications.value?.length || 0) > 1)
  const { logoMarkForMode } = useBrandConfig()
  const { userRole: _userRole, roleConfig } = useUserRole()
  const { isInEditMode, toggleEditMode, canToggleEditMode, canManageMembers, isAdmin: _isAdmin } = useAdminUI()
  const { totalMembers: _totalMembers, members: workspaceMembers, isUserOnline } = usePresence()
  const { mode: adapterMode, entityBackend, ontologyBackend, isCloud } = useAdapterStatus()
  const _isResizing = useState<boolean>('isSidebarResizing', () => false)

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
      .filter((m) => m.userId !== user.value?.id)
      .map((m) => {
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
  }

  // Invite dialog
  const inviteDialogOpen = ref(false)
  const showCloudCollaborationControls = computed(() => isCloud.value && !props.hidePresenceControls)

  // Reactive collection based on current route — accept both the canonical
  // /collections/:slug and the legacy /database/collections/:slug shim so the
  // header stays in sync during the brief redirect window.
  const collectionSlugFromPath = (path: string) => {
    const cleanPath = getCleanPath(path)
    if (cleanPath.startsWith('/collections/')) {
      return cleanPath.split('/collections/')[1]?.split('/')[0] || ''
    }
    if (cleanPath.startsWith('/database/collections/')) {
      return cleanPath.split('/database/collections/')[1]?.split('/')[0] || ''
    }
    return ''
  }

  const currentCollection = computed(() => {
    const slug = collectionSlugFromPath(route.path)
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
      const clean = getCleanPath(path)
      if (clean.startsWith('/collections/') || clean.startsWith('/database/collections/')) return
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

  const adapterModeLabel = computed(() => (isCloud.value ? 'InstantDB' : 'Local'))
  const adapterModeIcon = computed(() => (isCloud.value ? 'lucide:cloud' : 'lucide:hard-drive'))
  const adapterModeClass = computed(() =>
    isCloud.value
      ? 'border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300'
      : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  )

  const _isCurrentPagePinned = computed(() => {
    return pinnedItems.isPinned(getCleanPath(route.path))
  })

  const _togglePinCurrentPage = () => {
    pinnedItems.togglePin(getCleanPath(route.path))
  }

  // No watch needed - currentCollection is reactive via computed()
</script>

<template>
  <!-- App Header: Navigation shell (matches icon rail) -->
  <header
    data-slot="app-header"
    data-tauri-drag-region
    class="bg-card/0 backdrop-blur-sm border-b-none flex h-14 shrink-0 items-center gap-0 p-0 overflow-hidden sticky top-0"
    :class="{ 'app-region-drag': isTauri }">
    <!-- Left: traffic lights + logo + (conditional) org/app pickers -->
    <nav class="flex shrink-0 items-center gap-0.5 text-xs px-4 bg-transparent" data-tauri-drag-region>
      <!-- macOS custom traffic lights -->
      <div v-if="isTauri && isMacOS" class="flex items-center gap-2 shrink-0 app-region-no-drag">
        <button
          class="w-3 h-3 rounded-full bg-[#FF5F57] hover:bg-[#FF5F57]/80 transition-colors"
          title="Close"
          @click="closeWindow" />
        <button
          class="w-3 h-3 rounded-full bg-[#FEBC2E] hover:bg-[#FEBC2E]/80 transition-colors"
          title="Minimize"
          @click="minimizeWindow" />
        <button
          class="w-3 h-3 rounded-full bg-[#28C840] hover:bg-[#28C840]/80 transition-colors"
          title="Fullscreen"
          @click="toggleFullscreen" />
      </div>
      <!-- Logo / Home -->
      <div class="flex h-16 w-12 items-center justify-center shrink-0 border-b bg-transparent app-region-no-drag">
        <div
          class="flex h-9 w-9 items-center justify-center rounded-lg transition bg-transparent hover:bg-transparent"
          :class="
            isInEditMode
              ? 'bg-accent-foreground/10 hover:bg-accent-foreground/20'
              : 'bg-rail-foreground/10 hover:bg-rail-foreground/20'
          ">
          <AppLogo class="scale-75" :brand-mark="logoMarkForMode" />
        </div>
      </div>

      <!-- Organization Picker — hidden in single-org accounts (vault UX) -->
      <template v-if="showOrgPicker">
        <span class="text-muted-foreground/30 mr-3 ml-1 rotate-10 text-lg">/</span>
        <ClientOnly>
          <OrganizationPicker />
        </ClientOnly>
      </template>

      <!-- Workspace Picker — hidden in single-app accounts (vault UX) -->
      <template v-if="showAppPicker">
        <span class="text-muted-foreground/30 mx-3 rotate-10 text-lg">/</span>
        <ClientOnly>
          <AppPicker />
        </ClientOnly>
      </template>

      <!-- Breadcrumbs have been moved in-page (see AppBreadcrumbs.vue) to keep the header globally stable. -->
    </nav>

    <!-- Center: Omnibox (search + command palette trigger) -->
    <AppOmnibox class="mx-2" />

    <!-- Right: actions (collection actions, save status, notifications, members, avatar) -->
    <div class="flex shrink-0 items-center mr-4 gap-2 app-region-no-drag">
      <div v-if="showCollectionActions" class="flex items-center gap-1 mr-1">
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

      <!-- Global Search lives in center AppOmnibox now (⌘K still works globally). -->

      <UiTooltip>
        <UiTooltipTrigger as-child>
          <div
            class="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full border px-2 text-[11px] font-medium tracking-wide"
            :class="adapterModeClass"
            :aria-label="`Data mode: ${adapterModeLabel}`">
            <Icon :name="adapterModeIcon" class="h-3.5 w-3.5" />
            <span>{{ adapterModeLabel }}</span>
          </div>
        </UiTooltipTrigger>
        <UiTooltipContent side="bottom" :side-offset="8" class="max-w-xs">
          <div class="space-y-1 text-xs">
            <div class="font-medium">Data mode: {{ adapterModeLabel }}</div>
            <div class="text-muted-foreground">Adapter: {{ adapterMode }}</div>
            <div class="text-muted-foreground">Entities: {{ entityBackend }}</div>
            <div class="text-muted-foreground">Ontologies: {{ ontologyBackend }}</div>
          </div>
        </UiTooltipContent>
      </UiTooltip>

      <!-- Trellis (local) notifications — TQL graph-backed -->
      <NotificationBell />

      <!-- Workspace Members & Presence -->
      <div v-if="showCloudCollaborationControls && workspaceUsers.length > 0" class="flex items-center ml-2 mr-1">
        <UiTooltip>
          <UiTooltipTrigger as-child>
            <AppNavLink
              to="/settings/members"
              class="flex items-center rounded-full border border-border/0 bg-card/10 px-1 py-1 gap-1 hover:bg-card/20 transition-colors">
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
                    <UiAvatarFallback class="text-[9px] font-bold text-white" :class="u.color.bg">
                      {{ u.initials }}
                    </UiAvatarFallback>
                  </UiAvatar>
                  <span
                    v-if="u.isOnline"
                    class="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border border-background bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]" />
                </div>
              </div>
              <UiButton
                v-if="canManageMembers"
                size="icon-xs"
                variant="outline"
                class="border-l border-border/40 flex items-center rounded-full -ml-2 px-0">
                <Icon name="lucide:plus" class="h-3.5 w-3.5 text-muted-foreground" />
              </UiButton>
            </AppNavLink>
          </UiTooltipTrigger>
          <UiTooltipContent side="bottom" :side-offset="8">Manage members</UiTooltipContent>
        </UiTooltip>
      </div>

      <UiButton
        v-if="showCloudCollaborationControls && canManageMembers"
        size="sm"
        variant="outline"
        class="h-8 gap-1.5 rounded-full border-border/50 px-3 text-xs font-medium"
        @click="inviteDialogOpen = true">
        <Icon name="lucide:user-plus" class="h-3.5 w-3.5" />
        Invite
      </UiButton>

      <!-- User Avatar -->
      <ClientOnly>
        <div class="flex items-center gap-2">
          <UiDropdownMenu>
            <UiDropdownMenuTrigger as-child>
              <button
                type="button"
                class="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-muted/50 text-xs font-semibold transition-all hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-95"
                aria-label="User menu">
                <img
                  v-if="avatarUrl"
                  :src="avatarUrl"
                  :alt="userDisplayName"
                  class="h-full w-full rounded-full object-cover"
                  referrerpolicy="no-referrer" />
                <span v-else class="text-[10px] text-foreground/70">{{ initials }}</span>
              </button>
            </UiDropdownMenuTrigger>

            <UiDropdownMenuContent align="end" class="w-[220px] shadow-2xl border-border/50">
              <div class="px-2 py-2 mb-1 border-b bg-muted/5 flex items-center gap-3">
                <div class="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span class="text-[10px] font-bold text-primary">{{ initials }}</span>
                </div>
                <div class="flex-1 min-w-0">
                  <div class="text-sm font-bold truncate leading-none">{{ userDisplayName }}</div>
                  <div class="text-[10px] text-muted-foreground truncate mt-1 uppercase tracking-wider font-bold">
                    {{ roleConfig?.label || 'Member' }}
                  </div>
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
                  <div v-if="isInEditMode" class="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                </UiDropdownMenuItem>
              </template>

              <UiDropdownMenuSeparator />
              <UiDropdownMenuItem class="text-destructive focus:text-destructive" @click="handleLogout">
                <Icon name="lucide:log-out" class="mr-2 h-4 w-4" />
                Sign out
              </UiDropdownMenuItem>
            </UiDropdownMenuContent>
          </UiDropdownMenu>
        </div>

        <template #fallback>
          <div class="flex items-center gap-2">
            <div
              class="flex h-8 w-8 items-center justify-center rounded-full bg-muted/50 text-[10px] font-semibold"
              aria-label="User">
              <Icon name="lucide:user" class="h-4 w-4 opacity-50" />
            </div>
            <div class="h-8 w-8 rounded-full bg-primary/20 animate-pulse" />
          </div>
        </template>
      </ClientOnly>

      <!-- Member Invite Dialog -->
      <MemberInviteDialog v-model:open="inviteDialogOpen" />

      <!-- Quick Create (persistent '+' button) -->
      <ClientOnly>
        <QuickCreateButton variant="primary" />
      </ClientOnly>
    </div>

    <!-- Windows/Linux custom window controls -->
    <AppWindowControls />
  </header>
</template>

<style scoped>
  /* Tauri window drag region — makes header act as titlebar */
  .app-region-drag {
    -webkit-app-region: drag;
  }
  .app-region-no-drag,
  .app-region-drag :deep(button),
  .app-region-drag :deep(a),
  .app-region-drag :deep(input),
  .app-region-drag :deep(select),
  .app-region-drag :deep([role='button']),
  .app-region-drag :deep([role='menuitem']) {
    -webkit-app-region: no-drag;
  }
</style>
