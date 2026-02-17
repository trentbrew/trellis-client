<script setup lang="ts">
  const props = defineProps<{
    collapsed?: boolean
  }>()

  const { user, signOut } = useInstantAuth()
  const { $instantDb } = useNuxtApp()
  const { roleConfig } = useUserRole()
  const { isInEditMode, toggleEditMode, canToggleEditMode } = useAdminUI()
  const isAuthenticated = computed(() => !!user.value)

  const demoUsers = computed(() => $instantDb?.demoUsers || {})
  const switchUser = (userKey: string) => {
    $instantDb?.switchUser?.(userKey)
  }

  const currentUserRole = computed(() => (user.value as any)?.role || 'admin')

  const roleIcons: Record<string, string> = {
    owner: 'lucide:shield',
    admin: 'lucide:shield-check',
    member: 'lucide:user',
    guest: 'lucide:eye',
  }

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
    const email = (user.value as any)?.email
    const name = (user.value as any)?.name
    return getInitials(name || email || 'User')
  })

  const userEmail = computed(() => {
    const u = user.value as any
    return u?.email || 'User'
  })

  const avatarUrl = computed(() => {
    const u = user.value as any
    const candidate = u?.picture || u?.photoURL || u?.avatarUrl || u?.imageUrl || u?.imageURL || u?.profileImageUrl
    return typeof candidate === 'string' && candidate.trim() ? candidate.trim() : null
  })

  const avatarAlt = computed(() => {
    const u = user.value as any
    const candidate = u?.name || u?.email || 'User'
    return typeof candidate === 'string' ? candidate : 'User'
  })

  const handleLogout = async () => {
    await signOut()
    await navigateTo('/auth/login')
  }
</script>

<template>
  <ClientOnly>
    <!-- Sign in button for unauthenticated users -->
    <UiButton
      v-if="!isAuthenticated"
      variant="ghost"
      size="icon-sm"
      class="text-muted-foreground hover:text-foreground"
      @click="$router.push('/auth/login')">
      <Icon name="lucide:log-in" class="h-5 w-5" />
    </UiButton>

    <!-- User avatar for authenticated users -->
    <UiDropdownMenu v-else>
      <UiDropdownMenuTrigger as-child>
        <button
          type="button"
          class="flex items-center gap-3 rounded-xl transition-colors hover:bg-white/10 shadow-none border-none bg-transparent"
          :class="[
            roleConfig?.color || 'text-sidebar-foreground',
            props.collapsed ? 'w-10 h-10 justify-center p-0' : 'w-full px-2 py-1.5 text-xs font-medium',
          ]"
          aria-label="User menu">
          <div
            class="bg-foreground/10 flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full text-sm font-semibold shadow-none border border-white/10">
            <img
              v-if="avatarUrl"
              :src="avatarUrl"
              :alt="avatarAlt"
              class="h-full w-full object-cover rounded-full"
              referrerpolicy="no-referrer" />
            <span v-else class="text-sidebar-foreground">{{ initials }}</span>
          </div>
          <template v-if="!props.collapsed">
            <div class="flex flex-col items-start leading-tight min-w-0 flex-1 ml-1">
              <span class="text-[11px] font-medium truncate w-full opacity-40 text-sidebar-foreground text-left px-0.5">
                {{ userEmail }}
              </span>
            </div>
            <Icon name="lucide:chevrons-up-down" class="h-4 w-4 opacity-50 shrink-0 text-sidebar-foreground" />
          </template>
        </button>
      </UiDropdownMenuTrigger>
      <UiDropdownMenuContent align="start" side="top" :side-offset="8" class="w-[240px]">
        <UiDropdownMenuLabel class="text-muted-foreground/75 text-xs">{{ userEmail }}</UiDropdownMenuLabel>
        <UiDropdownMenuSeparator />
        <UiDropdownMenuItem as-child>
          <AppNavLink to="/settings/profile" class="flex w-full items-center">
            <Icon name="lucide:user" class="h-4 w-4" />
            Profile settings
          </AppNavLink>
        </UiDropdownMenuItem>

        <!-- Edit Mode Toggle (admin+ only) -->
        <template v-if="canToggleEditMode">
          <UiDropdownMenuSeparator />
          <UiDropdownMenuItem class="flex items-center justify-between" @click="toggleEditMode">
            <div class="flex items-center gap-2">
              <Icon :name="isInEditMode ? 'lucide:pencil-off' : 'lucide:pencil'" class="h-4 w-4" />
              <span>{{ isInEditMode ? 'Exit Edit Mode' : 'Enter Edit Mode' }}</span>
            </div>
            <div
              v-if="isInEditMode"
              class="h-2 w-2 rounded-full bg-amber-500 animate-pulse"
              title="Edit mode active" />
          </UiDropdownMenuItem>
        </template>

        <UiDropdownMenuSeparator />
        <UiDropdownMenuLabel class="text-muted-foreground/75 text-xs flex items-center gap-1.5">
          <Icon name="lucide:users" class="h-3 w-3" />
          Switch Demo User
        </UiDropdownMenuLabel>
        <UiDropdownMenuItem
          v-for="(demoUser, key) in demoUsers"
          :key="key"
          :disabled="currentUserRole === demoUser.role"
          class="flex items-center gap-2"
          @click="switchUser(key as string)">
          <Icon :name="roleIcons[demoUser.role] || 'lucide:user'" class="h-4 w-4 shrink-0" />
          <div class="flex-1 min-w-0">
            <div class="text-sm truncate">{{ demoUser.name }}</div>
            <div class="text-xs text-muted-foreground truncate">{{ demoUser.email }}</div>
          </div>
          <Icon v-if="currentUserRole === demoUser.role" name="lucide:check" class="h-4 w-4 text-primary shrink-0" />
        </UiDropdownMenuItem>
        <UiDropdownMenuSeparator />
        <UiDropdownMenuItem @click="handleLogout">
          <Icon name="lucide:log-out" class="h-4 w-4" />
          Logout
        </UiDropdownMenuItem>
      </UiDropdownMenuContent>
    </UiDropdownMenu>

    <template #fallback>
      <div
        class="bg-primary text-primary-foreground flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold"
        aria-label="User">
        <Icon name="lucide:user" class="h-4 w-4" />
      </div>
    </template>
  </ClientOnly>
</template>
