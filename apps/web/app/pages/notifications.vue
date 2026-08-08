<script setup lang="ts">
  definePageMeta({
    title: 'Notifications',
    icon: 'lucide:bell',
  })

  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    dismiss,
    timeAgo,
    loading,
  } = useNotifications()

  // ── Org filter ──────────────────────────────────────────────────────
  const selectedOrgId = ref<string | null>(null)

  const orgOptions = computed(() => {
    const orgs = new Map<string, string>()
    for (const n of notifications.value) {
      if (n.orgId && n.orgName) orgs.set(n.orgId, n.orgName)
    }
    return Array.from(orgs.entries()).map(([id, name]) => ({ id, name }))
  })

  const filteredNotifications = computed(() => {
    if (!selectedOrgId.value) return notifications.value
    return notifications.value.filter((n: any) => n.orgId === selectedOrgId.value)
  })

  const handleClick = (n: any) => {
    if (!n.isRead) markAsRead(n.id)
    if (n.actionUrl) navigateTo(n.actionUrl)
  }
</script>

<template>
  <Page
    title="Notifications"
    subtitle="Activity"
    description="View and manage your notifications"
    icon="lucide:bell"
    :hide-sidebar="true"
    :fill-height="true">
    <div class="space-y-6 max-w-3xl">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <p class="text-sm text-muted-foreground">
            {{ unreadCount > 0 ? `${unreadCount} unread` : 'No unread notifications' }}
          </p>
          <!-- Org filter -->
          <UiDropdownMenu v-if="orgOptions.length > 1">
            <UiDropdownMenuTrigger as-child>
              <UiButton size="xs" variant="outline" class="h-7 text-[11px] gap-1.5">
                <Icon name="lucide:building-2" class="h-3 w-3" />
                {{ selectedOrgId ? orgOptions.find(o => o.id === selectedOrgId)?.name || 'Filter' : 'All workspaces' }}
                <Icon name="lucide:chevron-down" class="h-3 w-3 ml-0.5" />
              </UiButton>
            </UiDropdownMenuTrigger>
            <UiDropdownMenuContent align="start" class="w-48">
              <UiDropdownMenuItem
                :class="!selectedOrgId ? 'bg-accent' : ''"
                @select="selectedOrgId = null">
                All workspaces
              </UiDropdownMenuItem>
              <UiDropdownMenuSeparator />
              <UiDropdownMenuItem
                v-for="org in orgOptions"
                :key="org.id"
                :class="selectedOrgId === org.id ? 'bg-accent' : ''"
                @select="selectedOrgId = org.id">
                {{ org.name }}
              </UiDropdownMenuItem>
            </UiDropdownMenuContent>
          </UiDropdownMenu>
        </div>
        <UiButton
          v-if="unreadCount > 0"
          variant="ghost"
          size="xs"
          class="text-xs font-medium text-primary hover:bg-primary/5"
          @click="markAllAsRead">
          Mark all as read
        </UiButton>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="space-y-3">
        <div v-for="i in 4" :key="i" class="flex items-start gap-4 p-4 rounded-xl border border-border/40">
          <div class="h-10 w-10 rounded-xl bg-muted animate-pulse shrink-0" />
          <div class="flex-1 space-y-2">
            <div class="h-4 w-48 rounded bg-muted animate-pulse" />
            <div class="h-3 w-full rounded bg-muted animate-pulse" />
          </div>
        </div>
      </div>

      <!-- Notifications list -->
      <div v-else-if="filteredNotifications.length > 0" class="space-y-2">
        <Motion
          v-for="(n, i) in filteredNotifications"
          :key="n.id"
          :initial="{ opacity: 0, y: 10 }"
          :animate="{ opacity: 1, y: 0 }"
          :transition="{ delay: i * 0.04, duration: 0.3 }"
          class="relative flex items-start gap-4 p-4 rounded-xl border border-border/40 transition-all duration-300 group cursor-pointer"
          :class="[
            !n.isRead
              ? n.variant === 'destructive'
                ? 'bg-destructive/4 border-destructive/15'
                : n.variant === 'warning'
                  ? 'bg-warning/4 border-warning/15'
                  : n.variant === 'success'
                    ? 'bg-success/4 border-success/15'
                    : 'bg-primary/4 border-primary/15'
              : 'hover:bg-muted/30',
          ]"
          @click="handleClick(n)">
          <!-- Unread indicator -->
          <div
            v-if="!n.isRead"
            class="absolute left-0 top-3 bottom-3 w-1 rounded-r-full"
            :class="[
              n.variant === 'destructive' ? 'bg-destructive'
                : n.variant === 'warning' ? 'bg-warning'
                : n.variant === 'success' ? 'bg-success'
                : 'bg-primary',
            ]" />

          <!-- Icon -->
          <div
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 transition-transform group-hover:scale-105"
            :class="[
              n.variant === 'destructive' ? 'bg-destructive/15 text-destructive ring-destructive/20'
                : n.variant === 'warning' ? 'bg-warning/15 text-warning ring-warning/20'
                : n.variant === 'success' ? 'bg-success/15 text-success ring-success/20'
                : 'bg-primary/15 text-primary ring-primary/20',
            ]">
            <Icon :name="n.icon || 'lucide:bell'" class="h-5 w-5" />
          </div>

          <!-- Content -->
          <div class="flex-1 min-w-0 space-y-1">
            <div class="flex items-center justify-between gap-2">
              <span
                class="text-sm font-semibold truncate"
                :class="!n.isRead ? 'text-foreground' : 'text-muted-foreground'">
                {{ n.title }}
              </span>
              <span class="text-[10px] text-muted-foreground/50 whitespace-nowrap tabular-nums">
                {{ timeAgo(n.createdAt) }}
              </span>
            </div>
            <p class="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
              {{ n.message }}
            </p>
            <div class="flex items-center gap-2 pt-1">
              <span
                v-if="n.orgName"
                class="rounded-md px-1.5 py-0.5 text-[9px] font-semibold tracking-wide text-muted-foreground/60 bg-muted/50 ring-1 ring-border/30 truncate max-w-[140px]">
                {{ n.orgName }}
              </span>
              <span
                v-if="n.actorName"
                class="text-[10px] text-muted-foreground/60">
                by {{ n.actorName }}
              </span>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <UiButton
              v-if="n.actionUrl"
              size="icon-xs"
              variant="ghost"
              class="h-7 w-7"
              @click.stop="handleClick(n)">
              <Icon name="lucide:external-link" class="h-3.5 w-3.5" />
            </UiButton>
            <UiButton
              size="icon-xs"
              variant="ghost"
              class="h-7 w-7 text-muted-foreground hover:text-destructive"
              @click.stop="dismiss(n.id)">
              <Icon name="lucide:x" class="h-3.5 w-3.5" />
            </UiButton>
          </div>
        </Motion>
      </div>

      <!-- Empty state -->
      <div v-else class="flex flex-col items-center justify-center py-24 text-center">
        <div class="relative mb-6">
          <Icon name="lucide:bell" class="h-16 w-16 text-muted-foreground/10" />
          <Icon name="lucide:check" class="absolute -bottom-1 -right-1 h-6 w-6 text-emerald-500/50" />
        </div>
        <p class="text-sm font-medium text-muted-foreground">All caught up</p>
        <p class="text-xs text-muted-foreground/50 mt-1">No notifications right now</p>
      </div>
    </div>
  </Page>
</template>
