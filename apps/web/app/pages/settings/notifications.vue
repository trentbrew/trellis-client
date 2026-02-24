<script setup lang="ts">
  import type { NotificationType } from '~/types/database'

  const { notificationPrefs, updatePrefs, NOTIFICATION_META } = useNotifications()
  const { globalPref, updatePref: updateChatPref } = useChatNotifications()

  const notificationTypes: { type: NotificationType; label: string; description: string }[] = [
    { type: 'new_message', label: 'New messages', description: 'When someone sends a message in a channel you belong to' },
    { type: 'mention', label: 'Mentions', description: 'When someone @mentions you in a message or document' },
    { type: 'comment', label: 'Comments', description: 'When someone comments on your content' },
    { type: 'entity_updated', label: 'Task assigned', description: 'When a task is assigned to you' },
    { type: 'invite_accepted', label: 'Invite accepted', description: 'When someone accepts your workspace invitation' },
    { type: 'member_joined', label: 'Member joined', description: 'When a new member joins your workspace' },
    { type: 'member_removed', label: 'Member removed', description: 'When you are removed from a workspace' },
    { type: 'role_changed', label: 'Role changed', description: 'When your role in a workspace is updated' },
    { type: 'system', label: 'System', description: 'System announcements and maintenance notices' },
  ]

  const isTypeMuted = (type: NotificationType) => notificationPrefs.value.mutedTypes.includes(type)

  const toggleType = (type: NotificationType) => {
    const muted = notificationPrefs.value.mutedTypes
    const updated = muted.includes(type)
      ? muted.filter((t) => t !== type)
      : [...muted, type]
    updatePrefs({ mutedTypes: updated })
  }

  const toggleSound = () => {
    updatePrefs({ soundEnabled: !notificationPrefs.value.soundEnabled })
  }

  const toggleDesktop = () => {
    updatePrefs({ desktopEnabled: !notificationPrefs.value.desktopEnabled })
  }

  const testChime = () => {
    const audio = new Audio('/sounds/notify.mp3')
    audio.volume = 0.3
    audio.play().catch(() => {})
  }

  // Desktop notification permission
  const desktopPermission = ref<NotificationPermission>('default')
  onMounted(() => {
    if (typeof Notification !== 'undefined') {
      desktopPermission.value = Notification.permission
    }
  })

  const requestDesktopPermission = async () => {
    if (typeof Notification === 'undefined') return
    const result = await Notification.requestPermission()
    desktopPermission.value = result
  }

  // Email test
  const { user } = useInstantAuth()
  const emailTestState = ref<'idle' | 'sending' | 'sent' | 'error'>('idle')
  let emailTestTimer: ReturnType<typeof setTimeout> | null = null

  const sendTestEmail = async () => {
    const email = (user.value as any)?.email
    if (!email || emailTestState.value === 'sending') return
    emailTestState.value = 'sending'
    if (emailTestTimer) clearTimeout(emailTestTimer)
    try {
      await $fetch('/api/test-email', { method: 'POST', body: { email } })
      emailTestState.value = 'sent'
    } catch {
      emailTestState.value = 'error'
    } finally {
      emailTestTimer = setTimeout(() => { emailTestState.value = 'idle' }, 4000)
    }
  }

  onBeforeUnmount(() => { if (emailTestTimer) clearTimeout(emailTestTimer) })
</script>

<template>
  <Page
    variant="settings"
    subtitle="Notifications"
    title="Preferences"
    description="Control how and when you receive notifications."
    fill-height>
    <div class="space-y-8">
      <!-- Sound -->
      <section class="space-y-4">
        <div>
          <h3 class="text-sm font-semibold">Sound</h3>
          <p class="text-xs text-muted-foreground mt-0.5">Play an audio chime when new notifications arrive.</p>
        </div>
        <div class="flex items-center justify-between rounded-lg border border-border/50 p-4">
          <div class="flex items-center gap-3">
            <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon :name="notificationPrefs.soundEnabled ? 'lucide:volume-2' : 'lucide:volume-x'" class="h-4.5 w-4.5" />
            </div>
            <div>
              <div class="text-sm font-medium">Notification chime</div>
              <div class="text-xs text-muted-foreground">{{ notificationPrefs.soundEnabled ? 'On' : 'Off' }}</div>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <UiButton
              v-if="notificationPrefs.soundEnabled"
              variant="ghost"
              size="xs"
              class="text-xs text-muted-foreground hover:text-foreground"
              @click="testChime">
              Test
            </UiButton>
            <UiSwitch
              :checked="notificationPrefs.soundEnabled"
              @update:checked="toggleSound"
            />
          </div>
        </div>
      </section>

      <!-- Email notifications -->
      <section class="space-y-4">
        <div>
          <h3 class="text-sm font-semibold">Email notifications</h3>
          <p class="text-xs text-muted-foreground mt-0.5">Trellis sends transactional emails (invites, mentions, comments) via Resend.</p>
        </div>
        <div class="flex items-center justify-between rounded-lg border border-border/50 p-4">
          <div class="flex items-center gap-3">
            <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon name="lucide:mail" class="h-4.5 w-4.5" />
            </div>
            <div>
              <div class="text-sm font-medium">Test email delivery</div>
              <div class="text-xs text-muted-foreground">
                <span v-if="emailTestState === 'sent'" class="text-emerald-500">Sent! Check your inbox.</span>
                <span v-else-if="emailTestState === 'error'" class="text-destructive">Failed — check RESEND_API_KEY.</span>
                <span v-else>Send a test email to <strong>{{ (user as any)?.email }}</strong></span>
              </div>
            </div>
          </div>
          <UiButton
            size="xs"
            variant="outline"
            :disabled="emailTestState === 'sending' || !((user as any)?.email)"
            @click="sendTestEmail"
          >
            <Icon v-if="emailTestState === 'sending'" name="lucide:loader-circle" class="h-3.5 w-3.5 animate-spin mr-1" />
            <Icon v-else-if="emailTestState === 'sent'" name="lucide:check" class="h-3.5 w-3.5 mr-1 text-emerald-500" />
            <Icon v-else-if="emailTestState === 'error'" name="lucide:x" class="h-3.5 w-3.5 mr-1 text-destructive" />
            {{ emailTestState === 'sending' ? 'Sending…' : emailTestState === 'sent' ? 'Sent' : emailTestState === 'error' ? 'Failed' : 'Send test' }}
          </UiButton>
        </div>
      </section>

      <!-- Desktop notifications -->
      <section class="space-y-4">
        <div>
          <h3 class="text-sm font-semibold">Desktop notifications</h3>
          <p class="text-xs text-muted-foreground mt-0.5">Show native browser notifications even when the app is in the background.</p>
        </div>
        <div class="rounded-lg border border-border/50 divide-y divide-border/50 overflow-hidden">
          <!-- Permission status -->
          <div class="flex items-center justify-between p-4">
            <div class="flex items-center gap-3">
              <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon name="lucide:monitor" class="h-4.5 w-4.5" />
              </div>
              <div>
                <div class="text-sm font-medium">Browser permission</div>
                <div class="text-xs text-muted-foreground capitalize">
                  {{ desktopPermission === 'granted' ? 'Allowed' : desktopPermission === 'denied' ? 'Blocked — change in browser settings' : 'Not yet requested' }}
                </div>
              </div>
            </div>
            <UiButton
              v-if="desktopPermission === 'default'"
              size="xs"
              variant="outline"
              @click="requestDesktopPermission">
              Enable
            </UiButton>
            <Icon v-else-if="desktopPermission === 'granted'" name="lucide:check-circle-2" class="h-4 w-4 text-emerald-500" />
            <Icon v-else name="lucide:x-circle" class="h-4 w-4 text-destructive" />
          </div>
          <!-- Toggle -->
          <div class="flex items-center justify-between p-4">
            <div>
              <div class="text-sm font-medium">Show desktop notifications</div>
              <div class="text-xs text-muted-foreground">{{ notificationPrefs.desktopEnabled ? 'On' : 'Off' }}</div>
            </div>
            <UiSwitch
              :checked="notificationPrefs.desktopEnabled && desktopPermission === 'granted'"
              :disabled="desktopPermission !== 'granted'"
              @update:checked="toggleDesktop"
            />
          </div>
        </div>
      </section>

      <!-- Chat notifications -->
      <section class="space-y-4">
        <div>
          <h3 class="text-sm font-semibold">Chat messages</h3>
          <p class="text-xs text-muted-foreground mt-0.5">Control when you're notified about new messages.</p>
        </div>
        <div class="rounded-lg border border-border/50 divide-y divide-border/50 overflow-hidden">
          <div
            v-for="opt in [
              { value: 'all', label: 'All messages', description: 'Notify on every new message in any channel' },
              { value: 'mentions', label: 'Mentions only', description: 'Only notify when you are @mentioned' },
              { value: 'none', label: 'Nothing', description: 'Mute all chat notifications' },
            ]"
            :key="opt.value"
            class="flex items-center justify-between p-4 hover:bg-muted/20 transition-colors cursor-pointer"
            @click="updateChatPref({ level: opt.value as any })"
          >
            <div>
              <div class="text-sm font-medium">{{ opt.label }}</div>
              <div class="text-xs text-muted-foreground">{{ opt.description }}</div>
            </div>
            <div
              class="h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0"
              :class="(globalPref?.level ?? 'mentions') === opt.value
                ? 'border-primary bg-primary'
                : 'border-border'"
            >
              <div v-if="(globalPref?.level ?? 'mentions') === opt.value" class="h-1.5 w-1.5 rounded-full bg-primary-foreground" />
            </div>
          </div>
        </div>
      </section>

      <!-- Per-type toggles -->
      <section class="space-y-4">
        <div>
          <h3 class="text-sm font-semibold">Notification types</h3>
          <p class="text-xs text-muted-foreground mt-0.5">Choose which notifications you want to receive.</p>
        </div>
        <div class="rounded-lg border border-border/50 divide-y divide-border/50 overflow-hidden">
          <div
            v-for="nt in notificationTypes"
            :key="nt.type"
            class="flex items-center justify-between p-4 hover:bg-muted/20 transition-colors"
          >
            <div class="flex items-center gap-3">
              <div
                class="flex h-8 w-8 items-center justify-center rounded-lg"
                :class="isTypeMuted(nt.type) ? 'bg-muted/50 text-muted-foreground' : 'bg-primary/10 text-primary'"
              >
                <Icon :name="NOTIFICATION_META[nt.type]?.icon || 'lucide:bell'" class="h-4 w-4" />
              </div>
              <div>
                <div class="text-sm font-medium" :class="isTypeMuted(nt.type) ? 'text-muted-foreground' : ''">
                  {{ nt.label }}
                </div>
                <div class="text-xs text-muted-foreground">{{ nt.description }}</div>
              </div>
            </div>
            <UiSwitch
              :checked="!isTypeMuted(nt.type)"
              @update:checked="toggleType(nt.type)"
            />
          </div>
        </div>
      </section>
    </div>
  </Page>
</template>
