<script setup lang="ts">
  import type { NotificationType } from '~/types/database'

  const { notificationPrefs, updatePrefs, NOTIFICATION_META } = useNotifications()

  const notificationTypes: { type: NotificationType; label: string; description: string }[] = [
    { type: 'invite_accepted', label: 'Invite accepted', description: 'When someone accepts your workspace invitation' },
    { type: 'member_joined', label: 'Member joined', description: 'When a new member joins your workspace' },
    { type: 'member_removed', label: 'Member removed', description: 'When you are removed from a workspace' },
    { type: 'role_changed', label: 'Role changed', description: 'When your role in a workspace is updated' },
    { type: 'mention', label: 'Mentions', description: 'When someone mentions you in a document or comment' },
    { type: 'comment', label: 'Comments', description: 'When someone comments on your content' },
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

  const testChime = () => {
    const audio = new Audio('/sounds/notify.mp3')
    audio.volume = 0.3
    audio.play().catch(() => {})
  }
</script>

<template>
  <Page
    variant="settings"
    subtitle="Notifications"
    title="Preferences"
    description="Control how and when you receive notifications."
    fill-height>
    <div class="max-w-2xl space-y-8">
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
