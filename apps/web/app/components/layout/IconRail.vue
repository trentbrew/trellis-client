<script lang="ts" setup>
  import type { IconRailPosition } from '~/composables/useLayoutPreferences'

  const props = withDefaults(defineProps<{ position?: IconRailPosition }>(), { position: 'left' })

  const isBottom = computed(() => props.position === 'bottom')

  // Admin UI controls
  const { isInEditMode } = useAdminUI()

  // Navigation routes
  const routes = useRoutes()

  const tooltipSide = computed(() => (isBottom.value ? 'top' : 'right'))

  // Trailing dock items (bottom mode only)
  const { user, signOut } = useInstantAuth()
  const { canManageMembers } = useAdminUI()
  const { onlineCount, totalMembers, members: workspaceMembers, isUserOnline } = usePresence()
  const { userRole: _userRole, roleConfig: _roleConfig } = useUserRole()

  const getInitials = (value: string) => {
    const cleaned = value.trim()
    if (!cleaned) return 'U'
    const emailPrefix = cleaned.includes('@') ? cleaned.split('@')[0]! : cleaned
    const parts = emailPrefix.split(/[\s._-]+/g).filter(Boolean)
    const first = parts[0]?.[0] ?? 'U'
    const second = parts[1]?.[0] ?? parts[0]?.[1] ?? ''
    return `${first}${second}`.toUpperCase().slice(0, 2)
  }

  const initials = computed(() => {
    const u = user.value as any
    return getInitials(u?.name || u?.email || 'User')
  })

  const _userDisplayName = computed(() => {
    const u = user.value as any
    return u?.name || u?.email || 'User'
  })

  const _avatarUrl = computed(() => {
    const u = user.value as any
    const candidate = u?.picture || u?.photoURL || u?.avatarUrl || u?.imageUrl || u?.imageURL || u?.profileImageUrl
    return typeof candidate === 'string' && candidate.trim() ? candidate.trim() : null
  })

  const workspaceUsers = computed(() => {
    const all: any[] = []
    if (user.value) {
      all.push({
        id: (user.value as any).id,
        name: (user.value as any).name || (user.value as any).email || 'You',
        avatar: _avatarUrl.value,
        initials: initials.value,
        isOnline: true,
        isMe: true,
      })
    }
    const others = (workspaceMembers.value || [])
      .filter((m: any) => m.userId !== (user.value as any)?.id)
      .map((m: any) => ({
        id: m.userId,
        name: m.name || m.email || 'Member',
        avatar: m.avatar,
        initials: getInitials(m.name || m.email || 'M'),
        isOnline: m.userId ? isUserOnline(m.userId) : false,
        isMe: false,
      }))
    return [...all, ...others].slice(0, 5)
  })

  const _handleLogout = async () => {
    await signOut()
    await navigateTo('/auth/login')
  }
</script>

<template>
  <!-- Navigation Rail: Always visible with primary navigation routes -->
  <nav
    data-slot="icon-rail"
    :class="[
      'flex items-center relative',
      isBottom
        ? 'flex-row w-full h-12 px-2 py-0 border-t-none'
        : 'flex-col w-16 px-2 py-0 pb-2 border-r-none',
    ]"
    aria-label="Navigation rail">

    <!-- Primary Navigation Routes -->
    <div :class="['flex gap-1', isBottom ? 'flex-row px-1' : 'flex-col pt-3']">
      <template v-for="route in routes.primaryRailRoutes.value" :key="route.path">
        <UiTooltip>
          <UiTooltipTrigger as-child>
            <AppNavLink
              :to="route.path"
              class="group flex h-10 w-10 items-center justify-center rounded-xl transition"
              :class="[
                routes.isRouteActive(route.path)
                  ? isInEditMode
                    ? 'bg-accent-foreground/10 text-accent-foreground/80'
                    : 'bg-rail-foreground/10 text-foreground'
                  : isInEditMode
                    ? 'text-accent-foreground/70 hover:bg-accent-foreground/10 hover:text-accent-foreground'
                    : 'text-rail-foreground/70 hover:bg-rail-foreground/10 hover:text-rail-foreground',
              ]">
              <Icon :name="route.icon" class="h-4 w-4 opacity-50" />
            </AppNavLink>
          </UiTooltipTrigger>
          <UiTooltipContent :side="tooltipSide" :side-offset="8" :collision-padding="isBottom ? { bottom: 60 } : 0">{{ route.label }}</UiTooltipContent>
        </UiTooltip>
      </template>
    </div>

    <!-- Spacer -->
    <div class="flex-1" />

    <!-- Secondary Navigation Routes -->
    <div
      v-if="routes.secondaryRailRoutes.value?.length > 0"
      :class="['flex gap-1', isBottom ? 'flex-row px-1' : 'flex-col pb-2']">
      <template v-for="route in routes.secondaryRailRoutes.value" :key="route.path">
        <UiTooltip>
          <UiTooltipTrigger as-child>
            <AppNavLink
              :to="route.path"
              class="group flex h-10 w-10 items-center justify-center rounded-xl transition"
              :class="[
                routes.isRouteActive(route.path)
                  ? isInEditMode
                    ? 'bg-accent-foreground/10 text-accent-foreground/80'
                    : 'bg-rail-foreground/10 text-foreground'
                  : isInEditMode
                    ? 'text-accent-foreground/70 hover:bg-accent-foreground/10 hover:text-accent-foreground'
                    : 'text-rail-foreground/70 hover:bg-rail-foreground/10 hover:text-rail-foreground',
              ]">
              <Icon :name="route.icon" class="h-4 w-4 opacity-50" />
            </AppNavLink>
          </UiTooltipTrigger>
          <UiTooltipContent :side="tooltipSide" :side-offset="8" :collision-padding="isBottom ? { bottom: 60 } : 0">{{ route.label }}</UiTooltipContent>
        </UiTooltip>
      </template>
    </div>

    <!-- Trailing dock: presence pill (bottom mode only) -->
    <template v-if="isBottom">
      <div class="flex items-center gap-1 pl-2 border-l border-border/40 ml-1">
        <!-- Presence + manage members pill -->
        <UiTooltip v-if="workspaceUsers.length > 0">
          <UiTooltipTrigger as-child>
            <AppNavLink
              to="/settings/members"
              class="flex items-center rounded-full border border-border bg-card/10 px-1 py-1 gap-1 hover:bg-card/20 transition-colors">
              <!-- Avatars -->
              <div class="flex -space-x-1.5 px-0.5">
                <div
                  v-for="(u, index) in workspaceUsers"
                  :key="u.id"
                  class="relative"
                  :style="{ zIndex: workspaceUsers.length - index }">
                  <UiAvatar class="size-6 ring-2 ring-card grayscale-[0.3] transition-all hover:grayscale-0 hover:scale-110">
                    <UiAvatarImage v-if="u.avatar" :src="u.avatar" :alt="u.name" />
                    <UiAvatarFallback class="text-[9px] font-bold">{{ u.initials }}</UiAvatarFallback>
                  </UiAvatar>
                  <span
                    v-if="u.isOnline"
                    class="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full border border-background bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                  />
                </div>
              </div>
              <!-- Online count -->
              <div class="px-2 border-l ml-0.5 flex flex-col justify-center h-5">
                <p class="text-[10px] leading-none font-bold text-foreground/80 tabular-nums">
                  {{ onlineCount }}<span class="text-muted-foreground font-medium uppercase tracking-tighter">/{{ totalMembers }} online</span>
                </p>
              </div>
              <!-- Manage / Invite divider -->
              <div v-if="canManageMembers" class="border-l border-border/40 pl-1.5 pr-1 flex items-center">
                <Icon name="lucide:user-plus" class="h-3.5 w-3.5 text-muted-foreground" />
              </div>
            </AppNavLink>
          </UiTooltipTrigger>
          <UiTooltipContent side="top" :side-offset="8" :collision-padding="{ bottom: 60 }">Manage members</UiTooltipContent>
        </UiTooltip>
      </div>
    </template>
  </nav>
</template>
