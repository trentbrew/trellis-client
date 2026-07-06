<script lang="ts" setup>
  import type { IconRailPosition } from '~/composables/useLayoutPreferences'

  const props = withDefaults(
    defineProps<{
      placement?: 'header' | 'rail'
      railPosition?: IconRailPosition
    }>(),
    { placement: 'header', railPosition: 'bottom' },
  )

  const { user, signOut } = useInstantAuth()
  const { roleConfig } = useUserRole()
  const { isInEditMode, toggleEditMode, canToggleEditMode } = useAdminUI()

  const isRail = computed(() => props.placement === 'rail')

  const menuSide = computed(() => {
    if (!isRail.value) return 'bottom'
    return props.railPosition === 'bottom' ? 'top' : 'right'
  })

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
    const email = (user.value as { email?: string } | null)?.email
    const name = (user.value as { name?: string } | null)?.name
    return getInitials(name || email || 'User')
  })

  const userDisplayName = computed(() => {
    const u = user.value as { name?: string; email?: string } | null
    return u?.name || u?.email || 'User'
  })

  const avatarUrl = computed(() => {
    const u = user.value as { avatar?: string; imageURL?: string; picture?: string } | null
    const candidate = u?.avatar || u?.imageURL || u?.picture
    return typeof candidate === 'string' && candidate.trim() ? candidate.trim() : null
  })

  const handleLogout = async () => {
    await signOut()
  }

  const triggerClass = computed(() => {
    if (isRail.value) {
      return 'rail-resident-btn relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-muted/50 text-xs font-semibold transition-all hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-95'
    }
    return 'relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-muted/50 text-xs font-semibold transition-all hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-95'
  })
</script>

<template>
  <ClientOnly>
    <UiDropdownMenu>
      <UiDropdownMenuTrigger as-child>
        <button type="button" :class="triggerClass" :aria-label="isRail ? 'Resident menu' : 'User menu'">
          <img
            v-if="avatarUrl"
            :src="avatarUrl"
            :alt="userDisplayName"
            class="h-full w-full rounded-full object-cover"
            referrerpolicy="no-referrer" />
          <span v-else class="text-[10px] text-foreground/70">{{ initials }}</span>
        </button>
      </UiDropdownMenuTrigger>

      <UiDropdownMenuContent
        :side="menuSide"
        :side-offset="8"
        align="end"
        class="w-[220px] shadow-2xl border-border/50">
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

    <template #fallback>
      <div
        class="flex h-8 w-8 items-center justify-center rounded-full bg-muted/50 text-[10px] font-semibold"
        :aria-label="isRail ? 'Resident menu' : 'User'">
        <Icon name="lucide:user" class="h-4 w-4 opacity-50" />
      </div>
    </template>
  </ClientOnly>
</template>
