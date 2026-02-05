<script setup lang="ts">
  definePageMeta({
    title: 'Notifications',
    icon: 'lucide:bell',
  })

  const notifications = ref([
    {
      id: 1,
      title: 'Security Breach Detected',
      description:
        'A suspicious login attempt was blocked from an unrecognized IP address in East Europe. Please review your security settings.',
      time: '5m ago',
      variant: 'destructive',
      icon: 'lucide:shield-alert',
      unread: true,
      to: '/security/settings',
    },
    {
      id: 2,
      title: 'Storage Limit Approaching',
      description:
        'Your organization has used 85% of the allocated cloud storage. Consider upgrading your plan to avoid service interruption.',
      time: '1h ago',
      variant: 'warning',
      icon: 'lucide:hard-drive',
      unread: true,
      to: '/settings/billing',
    },
    {
      id: 3,
      title: 'System Update Complete',
      description:
        'The v2.4.0 update has been successfully deployed to all production nodes. All services are operating within normal parameters.',
      time: '3h ago',
      variant: 'success',
      icon: 'lucide:check-circle',
      unread: false,
      to: '/system/status',
    },
    {
      id: 4,
      title: 'New Feature Available',
      description:
        'The new Advanced Analytics dashboard is now available for your organization. Check out the documentation to get started.',
      time: '5h ago',
      variant: 'info',
      icon: 'lucide:sparkles',
      unread: false,
      to: '/analytics',
    },
  ])
</script>

<template>
  <Page
    title="Notifications"
    subtitle="Activity"
    description="View and manage your organization's activity and alerts"
    icon="lucide:bell"
    :hide-sidebar="true"
    :fill-height="true">
    <div class="space-y-10 max-w-4xl">
      <!-- Unread Section -->
      <section>
        <div class="flex items-center justify-between mb-6">
          <div class="space-y-1">
            <h3 class="text-sm font-bold uppercase tracking-[0.2em] text-muted-foreground/50">Recent Alerts</h3>
            <p class="text-xs text-muted-foreground/40">
              You have {{ notifications.filter((n) => n.unread).length }} unread notifications
            </p>
          </div>
          <UiButton
            variant="ghost"
            size="xs"
            class="text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/5 transition-all">
            Mark all as read
          </UiButton>
        </div>

        <div class="grid gap-4">
          <Motion
            v-for="(n, i) in notifications"
            :key="n.id"
            :initial="{ opacity: 0, y: 15, scale: 0.98 }"
            :animate="{ opacity: 1, y: 0, scale: 1 }"
            :transition="{ delay: i * 0.08, duration: 0.4, ease: [0.23, 1, 0.32, 1] }"
            class="relative overflow-hidden rounded-2xl border border-border/40 transition-all duration-500 group"
            :class="[
              n.unread
                ? n.variant === 'destructive'
                  ? 'bg-rose-500/[0.03] border-rose-500/10 shadow-[0_4px_20px_-4px_rgba(244,63,94,0.08)]'
                  : n.variant === 'warning'
                    ? 'bg-amber-500/[0.03] border-amber-500/10 shadow-[0_4px_20px_-4px_rgba(245,158,11,0.08)]'
                    : n.variant === 'success'
                      ? 'bg-emerald-500/[0.03] border-emerald-500/10 shadow-[0_4px_20px_-4px_rgba(16,185,129,0.08)]'
                      : 'bg-primary/[0.03] border-primary/10 shadow-[0_4px_20px_-4px_rgba(var(--primary),0.08)]'
                : 'bg-card/20 hover:bg-card/40',
            ]">
            <!-- Hover Gradient -->
            <div
              class="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none bg-gradient-to-br from-white/[0.02] to-transparent"></div>

            <div class="relative flex items-start gap-6 p-6">
              <!-- Severity Indicator Bar -->
              <div
                v-if="n.unread"
                class="absolute left-0 top-4 bottom-4 w-1.5 rounded-r-full transition-all duration-500 group-hover:w-2"
                :class="[
                  n.variant === 'destructive'
                    ? 'bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.4)]'
                    : n.variant === 'warning'
                      ? 'bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.4)]'
                      : n.variant === 'success'
                        ? 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.4)]'
                        : 'bg-primary shadow-[0_0_12px_rgba(var(--primary),0.4)]',
                ]"></div>

              <!-- Icon -->
              <div
                class="flex h-14 w-14 shrink-0 items-center justify-center rounded-[1.25rem] shadow-sm ring-1 transition-all duration-500 group-hover:scale-110 group-hover:-rotate-3"
                :class="[
                  n.variant === 'destructive'
                    ? 'bg-rose-500/20 text-rose-500 ring-rose-500/30'
                    : n.variant === 'warning'
                      ? 'bg-amber-500/20 text-amber-500 ring-amber-500/30'
                      : n.variant === 'success'
                        ? 'bg-emerald-500/20 text-emerald-500 ring-emerald-500/30'
                        : 'bg-primary/20 text-primary ring-primary/30',
                ]">
                <Icon :name="n.icon" class="h-7 w-7" />
              </div>

              <!-- Content -->
              <div class="flex-1 min-w-0 space-y-2">
                <div class="flex items-center justify-between">
                  <h4
                    class="text-lg font-bold tracking-tight text-foreground transition-colors group-hover:text-primary/90">
                    {{ n.title }}
                  </h4>
                  <span class="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 tabular-nums">
                    {{ n.time }}
                  </span>
                </div>
                <p class="text-sm text-muted-foreground/70 leading-relaxed max-w-3xl font-medium">
                  {{ n.description }}
                </p>

                <div class="pt-4 flex items-center justify-between">
                  <div class="flex items-center gap-3">
                    <span
                      class="rounded-lg px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.15em] shadow-xs ring-1 transition-all duration-300"
                      :class="[
                        n.variant === 'destructive'
                          ? 'bg-rose-500/10 text-rose-500 ring-rose-500/20 group-hover:bg-rose-500/20'
                          : n.variant === 'warning'
                            ? 'bg-amber-500/10 text-amber-500 ring-amber-500/20 group-hover:bg-amber-500/20'
                            : n.variant === 'success'
                              ? 'bg-emerald-500/10 text-emerald-500 ring-emerald-500/20 group-hover:bg-emerald-500/20'
                              : 'bg-muted text-muted-foreground ring-border/50 group-hover:bg-muted/80',
                      ]">
                      {{ n.variant }}
                    </span>
                    <span v-if="n.unread" class="flex h-2 w-2 rounded-full bg-primary animate-ping opacity-75"></span>
                  </div>

                  <UiButton
                    v-if="n.to"
                    variant="outline"
                    size="sm"
                    class="h-9 px-5 text-[11px] font-black uppercase tracking-[0.15em] bg-background border-border/50 hover:border-primary hover:bg-primary/5 hover:text-primary transition-all duration-500 group-hover:translate-x-0 translate-x-2 opacity-0 group-hover:opacity-100 shadow-xl shadow-primary/5"
                    @click="navigateTo(n.to)">
                    View Report
                    <Icon
                      name="lucide:arrow-right"
                      class="ml-2 h-4 w-4 transition-transform duration-500 group-hover:translate-x-1" />
                  </UiButton>
                </div>
              </div>
            </div>
          </Motion>
        </div>
      </section>

      <!-- Archive/Empty State -->
      <section class="pt-12 border-t border-border/20">
        <div class="flex flex-col items-center justify-center py-20 text-center space-y-6">
          <div class="h-20 w-20 rounded-[2rem] bg-muted/10 flex items-center justify-center shadow-inner">
            <Icon name="lucide:archive" class="h-10 w-10 text-muted-foreground/20" />
          </div>
          <div class="space-y-1">
            <h4 class="text-sm font-black uppercase tracking-[0.2em] text-muted-foreground/40">Notification Archive</h4>
            <p class="text-xs text-muted-foreground/30 font-medium tracking-tight">
              Older activity will be automatically moved here after 30 days
            </p>
          </div>
          <UiButton
            variant="ghost"
            size="sm"
            class="text-[10px] font-black uppercase tracking-widest opacity-40 hover:opacity-100 hover:bg-muted/20 transition-all">
            Open History
          </UiButton>
        </div>
      </section>
    </div>
  </Page>
</template>
