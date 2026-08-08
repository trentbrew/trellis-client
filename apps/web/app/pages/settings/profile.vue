<script setup lang="ts">
  const {
    displayName,
    bio,
    avatarUrl,
    locale,
    timezone,
    emailNotifications,
    desktopNotifications,
    weeklyDigest,
    isSaving,
    saveProfile,
  } = useUserProfile()

  const { user } = useInstantAuth()

  const localeOptions = [
    { value: 'en', label: 'English' },
    { value: 'es', label: 'Spanish' },
    { value: 'fr', label: 'French' },
    { value: 'de', label: 'German' },
    { value: 'ja', label: 'Japanese' },
  ]

  const timezoneOptions = [
    { value: 'America/New_York', label: 'Eastern Time (ET)' },
    { value: 'America/Chicago', label: 'Central Time (CT)' },
    { value: 'America/Denver', label: 'Mountain Time (MT)' },
    { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
    { value: 'Europe/London', label: 'Greenwich Mean Time (GMT)' },
    { value: 'Europe/Paris', label: 'Central European Time (CET)' },
    { value: 'Asia/Tokyo', label: 'Japan Standard Time (JST)' },
  ]

  const initials = computed(() => {
    const name = displayName.value || user.value?.name || 'User'
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  })

  async function handleSaveProfile() {
    await saveProfile()
  }

  function handleAvatarDrop(event: DragEvent) {
    event.preventDefault()
    const file =
      event.dataTransfer?.files[0] ||
      (event.target as HTMLInputElement | null)?.files?.[0]
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (e) => {
        avatarUrl.value = e.target?.result as string
      }
      reader.readAsDataURL(file)
    }
  }

  function handleAvatarClick() {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        const reader = new FileReader()
        reader.onload = (e) => {
          avatarUrl.value = e.target?.result as string
        }
        reader.readAsDataURL(file)
      }
    }
    input.click()
  }
</script>

<template>
  <Page
    variant="settings"
    subtitle="Settings"
    title="Profile"
    description="Manage your personal information and preferences.">
    <div class="space-y-4">
      <!-- Avatar & Basic Info -->
      <UiCard>
        <UiCardHeader>
          <UiCardTitle>Personal Information</UiCardTitle>
        </UiCardHeader>
        <UiCardContent>
          <div class="flex items-start gap-6">
            <div class="flex flex-col items-center gap-2 shrink-0">
              <div
                class="relative cursor-pointer overflow-hidden rounded-full bg-primary/10 ring-2 ring-offset-2 ring-offset-background transition-all hover:ring-primary/30"
                @click="handleAvatarClick"
                @dragover.prevent
                @drop="handleAvatarDrop">
                <img v-if="avatarUrl" :src="avatarUrl" class="h-24 w-24 rounded-full object-cover" />
                <div v-else class="flex h-24 w-24 items-center justify-center rounded-full bg-primary/10">
                  <span class="text-2xl font-semibold text-primary">{{ initials }}</span>
                </div>
                <div
                  class="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity hover:opacity-100">
                  <Icon name="lucide:camera" class="h-8 w-8 text-white" />
                </div>
              </div>
              <p class="text-xs text-muted-foreground">Click to upload</p>
            </div>
            <div class="flex-1 space-y-3">
              <div class="space-y-1.5">
                <label class="text-sm font-medium">Display Name</label>
                <input
                  v-model="displayName"
                  type="text"
                  placeholder="Your name"
                  class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary/50" />
              </div>
              <div class="space-y-1.5">
                <label class="text-sm font-medium">Bio</label>
                <textarea
                  v-model="bio"
                  placeholder="Tell us about yourself..."
                  rows="3"
                  class="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary/50 resize-none" />
              </div>
            </div>
          </div>
        </UiCardContent>
        <UiCardFooter>
          <UiButton :disabled="isSaving" @click="handleSaveProfile">
            <Icon v-if="isSaving" name="lucide:loader-2" class="mr-2 h-4 w-4 animate-spin" />
            {{ isSaving ? 'Saving...' : 'Save Changes' }}
          </UiButton>
        </UiCardFooter>
      </UiCard>

      <!-- Preferences -->
      <UiCard>
        <UiCardHeader>
          <UiCardTitle>Preferences</UiCardTitle>
        </UiCardHeader>
        <UiCardContent class="space-y-4">
          <div class="grid gap-4 sm:grid-cols-2">
            <div class="space-y-1.5">
              <label class="text-sm font-medium">Language</label>
              <select
                v-model="locale"
                class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary/50">
                <option v-for="opt in localeOptions" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </option>
              </select>
            </div>
            <div class="space-y-1.5">
              <label class="text-sm font-medium">Timezone</label>
              <select
                v-model="timezone"
                class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary/50">
                <option v-for="opt in timezoneOptions" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </option>
              </select>
            </div>
          </div>
        </UiCardContent>
      </UiCard>

      <!-- Notifications -->
      <UiCard>
        <UiCardHeader>
          <UiCardTitle>Notifications</UiCardTitle>
        </UiCardHeader>
        <UiCardContent class="space-y-3">
          <label class="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/30">
            <div class="flex items-center gap-3">
              <div class="flex size-9 items-center justify-center rounded-lg bg-primary/10">
                <Icon name="lucide:mail" class="size-4 text-primary" />
              </div>
              <div>
                <p class="text-sm font-medium">Email Notifications</p>
                <p class="text-xs text-muted-foreground">Receive updates via email</p>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              :aria-checked="emailNotifications"
              class="relative h-5 w-9 shrink-0 cursor-pointer rounded-full bg-input transition-colors data-[state=checked]:bg-primary"
              :class="emailNotifications ? 'bg-primary' : 'bg-input'"
              @click="emailNotifications = !emailNotifications">
              <span
                class="block h-4 w-4 rounded-full bg-white shadow transition-transform"
                :class="emailNotifications ? 'translate-x-4.5' : 'translate-x-0.5'" />
            </button>
          </label>

          <label class="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/30">
            <div class="flex items-center gap-3">
              <div class="flex size-9 items-center justify-center rounded-lg bg-primary/10">
                <Icon name="lucide:monitor" class="size-4 text-primary" />
              </div>
              <div>
                <p class="text-sm font-medium">Desktop Notifications</p>
                <p class="text-xs text-muted-foreground">Show browser notifications</p>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              :aria-checked="desktopNotifications"
              class="relative h-5 w-9 shrink-0 cursor-pointer rounded-full bg-input transition-colors data-[state=checked]:bg-primary"
              :class="desktopNotifications ? 'bg-primary' : 'bg-input'"
              @click="desktopNotifications = !desktopNotifications">
              <span
                class="block h-4 w-4 rounded-full bg-white shadow transition-transform"
                :class="desktopNotifications ? 'translate-x-4.5' : 'translate-x-0.5'" />
            </button>
          </label>

          <label class="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/30">
            <div class="flex items-center gap-3">
              <div class="flex size-9 items-center justify-center rounded-lg bg-primary/10">
                <Icon name="lucide:calendar-check" class="size-4 text-primary" />
              </div>
              <div>
                <p class="text-sm font-medium">Weekly Digest</p>
                <p class="text-xs text-muted-foreground">Summary of your week</p>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              :aria-checked="weeklyDigest"
              class="relative h-5 w-9 shrink-0 cursor-pointer rounded-full bg-input transition-colors data-[state=checked]:bg-primary"
              :class="weeklyDigest ? 'bg-primary' : 'bg-input'"
              @click="weeklyDigest = !weeklyDigest">
              <span
                class="block h-4 w-4 rounded-full bg-white shadow transition-transform"
                :class="weeklyDigest ? 'translate-x-4.5' : 'translate-x-0.5'" />
            </button>
          </label>
        </UiCardContent>
      </UiCard>
    </div>
  </Page>
</template>
