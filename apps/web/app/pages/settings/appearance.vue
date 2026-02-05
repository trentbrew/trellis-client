<script setup lang="ts">
  const { $colorMode: colorMode } = useNuxtApp()
  const { animationsEnabled, setAnimationsEnabled } = useAnimationSettings()

  const isDark = computed({
    get: () => colorMode.value === 'dark',
    set: (checked) => toggleTheme(checked),
  })

  const toggleTheme = (checked: boolean) => {
    if (checked) {
      colorMode.preference = 'dark'
    } else {
      colorMode.preference = 'light'
    }
  }

  const animationsOn = computed({
    get: () => animationsEnabled.value,
    set: (checked) => setAnimationsEnabled(checked),
  })
</script>

<template>
  <Page
    variant="settings"
    subtitle="Settings"
    title="Appearance"
    description="Customize the look and feel of your application with themes and display preferences.">
    <div class="space-y-6">
      <!-- Dark Mode Toggle -->
      <ClientOnly>
        <UiCard>
          <UiCardHeader>
            <UiCardTitle>Color Mode</UiCardTitle>
            <UiCardDescription>Switch between light and dark mode.</UiCardDescription>
          </UiCardHeader>
          <UiCardContent>
            <div class="border-border bg-card flex items-center justify-between rounded-xl border px-4 py-3 shadow-sm">
              <div class="flex items-center gap-3">
                <div class="bg-primary/10 flex size-9 items-center justify-center rounded-lg">
                  <Icon :name="colorMode.value === 'dark' ? 'lucide:moon' : 'lucide:sun'" class="text-primary size-4" />
                </div>
                <div>
                  <p class="text-foreground text-sm font-semibold">Dark theme</p>
                  <p class="text-muted-foreground text-xs">
                    {{ colorMode.value === 'dark' ? 'Dark mode enabled' : 'Light mode enabled' }}
                  </p>
                </div>
              </div>
              <UiSwitch v-model="isDark" />
            </div>
          </UiCardContent>
        </UiCard>
        <template #fallback>
          <UiCard>
            <UiCardHeader>
              <UiCardTitle>Color Mode</UiCardTitle>
              <UiCardDescription>Switch between light and dark mode.</UiCardDescription>
            </UiCardHeader>
            <UiCardContent>
              <div
                class="border-border bg-card flex items-center justify-between rounded-xl border px-4 py-3 shadow-sm">
                <div class="flex items-center gap-3">
                  <div class="bg-primary/10 flex size-9 items-center justify-center rounded-lg">
                    <Icon name="lucide:sun" class="text-primary size-4" />
                  </div>
                  <div>
                    <p class="text-foreground text-sm font-semibold">Dark theme</p>
                    <p class="text-muted-foreground text-xs">Loading...</p>
                  </div>
                </div>
                <UiSwitch :model-value="false" disabled />
              </div>
            </UiCardContent>
          </UiCard>
        </template>
      </ClientOnly>

      <!-- Animations Toggle -->
      <ClientOnly>
        <UiCard>
          <UiCardHeader>
            <UiCardTitle>Animations</UiCardTitle>
            <UiCardDescription>Control transition animations throughout the app.</UiCardDescription>
          </UiCardHeader>
          <UiCardContent>
            <div class="border-border bg-card flex items-center justify-between rounded-xl border px-4 py-3 shadow-sm">
              <div class="flex items-center gap-3">
                <div class="bg-primary/10 flex size-9 items-center justify-center rounded-lg">
                  <Icon :name="animationsOn ? 'lucide:sparkles' : 'lucide:zap'" class="text-primary size-4" />
                </div>
                <div>
                  <p class="text-foreground text-sm font-semibold">Page transitions</p>
                  <p class="text-muted-foreground text-xs">
                    {{ animationsOn ? 'Smooth animations enabled' : 'Instant navigation' }}
                  </p>
                </div>
              </div>
              <UiSwitch v-model="animationsOn" />
            </div>
          </UiCardContent>
        </UiCard>
        <template #fallback>
          <UiCard>
            <UiCardHeader>
              <UiCardTitle>Animations</UiCardTitle>
              <UiCardDescription>Control transition animations throughout the app.</UiCardDescription>
            </UiCardHeader>
            <UiCardContent>
              <div
                class="border-border bg-card flex items-center justify-between rounded-xl border px-4 py-3 shadow-sm">
                <div class="flex items-center gap-3">
                  <div class="bg-primary/10 flex size-9 items-center justify-center rounded-lg">
                    <Icon name="lucide:sparkles" class="text-primary size-4" />
                  </div>
                  <div>
                    <p class="text-foreground text-sm font-semibold">Page transitions</p>
                    <p class="text-muted-foreground text-xs">Loading...</p>
                  </div>
                </div>
                <UiSwitch :model-value="true" disabled />
              </div>
            </UiCardContent>
          </UiCard>
        </template>
      </ClientOnly>

      <!-- Theme Preset Selector -->
      <UiCard>
        <UiCardHeader>
          <UiCardTitle>Theme Preset</UiCardTitle>
          <UiCardDescription>Choose a theme preset to customize your app's appearance.</UiCardDescription>
        </UiCardHeader>
        <UiCardContent>
          <ClientOnly>
            <ThemeSelector />
            <template #fallback>
              <div class="space-y-2">
                <UiLabel>Theme Preset</UiLabel>
                <div class="h-9 rounded-md border border-input bg-background opacity-50" />
              </div>
            </template>
          </ClientOnly>
          <ClientOnly>
            <div class="mt-4">
              <UiButton variant="outline" size="sm" @click="navigateTo('/settings/theme')">
                <Icon name="lucide:palette" class="mr-2 size-4" />
                Manage Themes
              </UiButton>
            </div>
            <template #fallback>
              <div class="mt-4">
                <div
                  class="inline-flex h-8 items-center gap-2 rounded-md border border-input bg-background px-3 text-sm font-medium opacity-50">
                  <Icon name="lucide:palette" class="size-4" />
                  Manage Themes
                </div>
              </div>
            </template>
          </ClientOnly>
        </UiCardContent>
      </UiCard>
    </div>
  </Page>
</template>
