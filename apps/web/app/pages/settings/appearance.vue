<script setup lang="ts">
  const { $colorMode: colorMode } = useNuxtApp()
  const { $toast } = useNuxtApp()
  const { animationsEnabled, setAnimationsEnabled, resetAnimationSettings } = useAnimationSettings()
  const {
    headerAboveSidebar,
    setHeaderAboveSidebar,
    iconRailPosition,
    setIconRailPosition,
    toolbarMode,
    setToolbarMode,
    showRecentPages,
    setShowRecentPages,
    enterKeyBehavior,
    setEnterKeyBehavior,
    resetLayoutPreferences,
  } = useLayoutPreferences()
  const go = (to: string) => navigateTo(to)
  const showResetConfirm = ref(false)

  const resetAllSettings = () => {
    colorMode.preference = 'light'
    resetAnimationSettings()
    resetLayoutPreferences()
    showResetConfirm.value = false
    $toast?.success('All settings reset to defaults')
  }

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

  const headerAbove = computed({
    get: () => headerAboveSidebar.value,
    set: (checked) => setHeaderAboveSidebar(checked),
  })

  const recentPagesOn = computed({
    get: () => showRecentPages.value,
    set: (checked) => setShowRecentPages(checked),
  })

  const enterKeySend = computed({
    get: () => enterKeyBehavior.value === 'send',
    set: (checked) => setEnterKeyBehavior(checked ? 'send' : 'newline'),
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

      <!-- Recent Pages Strip Toggle -->
      <ClientOnly>
        <UiCard>
          <UiCardHeader>
            <UiCardTitle>Recent Pages Strip</UiCardTitle>
            <UiCardDescription>
              Show a horizontal strip of recently visited pages for quick switching.
            </UiCardDescription>
          </UiCardHeader>
          <UiCardContent>
            <div class="border-border bg-card flex items-center justify-between rounded-xl border px-4 py-3 shadow-sm">
              <div class="flex items-center gap-3">
                <div class="bg-primary/10 flex size-9 items-center justify-center rounded-lg">
                  <Icon :name="recentPagesOn ? 'lucide:layers' : 'lucide:file-text'" class="text-primary size-4" />
                </div>
                <div>
                  <p class="text-foreground text-sm font-semibold">Show recent pages</p>
                  <p class="text-muted-foreground text-xs">
                    {{ recentPagesOn ? 'Strip visible when multiple pages visited' : 'Strip hidden' }}
                  </p>
                </div>
              </div>
              <UiSwitch v-model="recentPagesOn" />
            </div>
          </UiCardContent>
        </UiCard>
        <template #fallback>
          <UiCard>
            <UiCardHeader>
              <UiCardTitle>Recent Pages Strip</UiCardTitle>
              <UiCardDescription>
                Show a horizontal strip of recently visited pages for quick switching.
              </UiCardDescription>
            </UiCardHeader>
            <UiCardContent>
              <div
                class="border-border bg-card flex items-center justify-between rounded-xl border px-4 py-3 shadow-sm">
                <div class="flex items-center gap-3">
                  <div class="bg-primary/10 flex size-9 items-center justify-center rounded-lg">
                    <Icon name="lucide:file-text" class="text-primary size-4" />
                  </div>
                  <div>
                    <p class="text-foreground text-sm font-semibold">Show recent pages</p>
                    <p class="text-muted-foreground text-xs">Loading...</p>
                  </div>
                </div>
                <UiSwitch :model-value="false" disabled />
              </div>
            </UiCardContent>
          </UiCard>
        </template>
      </ClientOnly>

      <!-- Enter Key Behavior -->
      <ClientOnly>
        <UiCard>
          <UiCardHeader>
            <UiCardTitle>Enter Key Behavior</UiCardTitle>
            <UiCardDescription>Choose how the Enter key behaves in chat input.</UiCardDescription>
          </UiCardHeader>
          <UiCardContent>
            <div class="border-border bg-card flex items-center justify-between rounded-xl border px-4 py-3 shadow-sm">
              <div class="flex items-center gap-3">
                <div class="bg-primary/10 flex size-9 items-center justify-center rounded-lg">
                  <Icon name="lucide:keyboard" class="text-primary size-4" />
                </div>
                <div>
                  <p class="text-foreground text-sm font-semibold">Enter to send</p>
                  <p class="text-muted-foreground text-xs">
                    {{
                      enterKeySend
                        ? 'Enter sends message, Shift+Enter for new line'
                        : 'Cmd+Enter sends message, Enter for new line'
                    }}
                  </p>
                </div>
              </div>
              <UiSwitch v-model="enterKeySend" />
            </div>
          </UiCardContent>
        </UiCard>
        <template #fallback>
          <UiCard>
            <UiCardHeader>
              <UiCardTitle>Enter Key Behavior</UiCardTitle>
              <UiCardDescription>Choose how the Enter key behaves in chat input.</UiCardDescription>
            </UiCardHeader>
            <UiCardContent>
              <div
                class="border-border bg-card flex items-center justify-between rounded-xl border px-4 py-3 shadow-sm">
                <div class="flex items-center gap-3">
                  <div class="bg-primary/10 flex size-9 items-center justify-center rounded-lg">
                    <Icon name="lucide:keyboard" class="text-primary size-4" />
                  </div>
                  <div>
                    <p class="text-foreground text-sm font-semibold">Enter to send</p>
                    <p class="text-muted-foreground text-xs">Loading...</p>
                  </div>
                </div>
                <UiSwitch :model-value="false" disabled />
              </div>
            </UiCardContent>
          </UiCard>
        </template>
      </ClientOnly>

      <!-- Editor Toolbar Mode -->
      <ClientOnly>
        <UiCard>
          <UiCardHeader>
            <UiCardTitle>Editor Toolbar</UiCardTitle>
            <UiCardDescription>
              Choose between a floating toolbar that appears on text selection or a fixed toolbar at the top of the
              editor.
            </UiCardDescription>
          </UiCardHeader>
          <UiCardContent>
            <div class="flex gap-3">
              <button
                class="flex flex-1 flex-col items-center gap-2 rounded-xl border px-4 py-3 transition-colors"
                :class="
                  toolbarMode === 'floating'
                    ? 'border-primary bg-primary/10'
                    : 'border-border bg-card hover:bg-muted/50'
                "
                @click="setToolbarMode('floating')">
                <div class="flex items-center gap-1.5">
                  <Icon
                    name="lucide:sparkles"
                    class="size-4"
                    :class="toolbarMode === 'floating' ? 'text-primary' : 'text-muted-foreground'" />
                  <span
                    class="text-sm font-medium"
                    :class="toolbarMode === 'floating' ? 'text-primary' : 'text-foreground'">
                    Floating
                  </span>
                </div>
                <p class="text-xs text-muted-foreground text-center">Appears above selected text</p>
              </button>
              <button
                class="flex flex-1 flex-col items-center gap-2 rounded-xl border px-4 py-3 transition-colors"
                :class="
                  toolbarMode === 'static' ? 'border-primary bg-primary/10' : 'border-border bg-card hover:bg-muted/50'
                "
                @click="setToolbarMode('static')">
                <div class="flex items-center gap-1.5">
                  <Icon
                    name="lucide:panel-top"
                    class="size-4"
                    :class="toolbarMode === 'static' ? 'text-primary' : 'text-muted-foreground'" />
                  <span
                    class="text-sm font-medium"
                    :class="toolbarMode === 'static' ? 'text-primary' : 'text-foreground'">
                    Static
                  </span>
                </div>
                <p class="text-xs text-muted-foreground text-center">Fixed bar at the top</p>
              </button>
            </div>
          </UiCardContent>
        </UiCard>
        <template #fallback>
          <UiCard>
            <UiCardHeader>
              <UiCardTitle>Editor Toolbar</UiCardTitle>
              <UiCardDescription>
                Choose between a floating toolbar that appears on text selection or a fixed toolbar at the top of the
                editor.
              </UiCardDescription>
            </UiCardHeader>
            <UiCardContent>
              <div class="flex gap-3 opacity-50 pointer-events-none">
                <div class="flex flex-1 flex-col items-center gap-2 rounded-xl border border-border bg-card px-4 py-3">
                  <div class="flex items-center gap-1.5">
                    <Icon name="lucide:sparkles" class="size-4 text-muted-foreground" />
                    <span class="text-sm font-medium">Floating</span>
                  </div>
                  <p class="text-xs text-muted-foreground text-center">Loading...</p>
                </div>
                <div class="flex flex-1 flex-col items-center gap-2 rounded-xl border border-border bg-card px-4 py-3">
                  <div class="flex items-center gap-1.5">
                    <Icon name="lucide:panel-top" class="size-4 text-muted-foreground" />
                    <span class="text-sm font-medium">Static</span>
                  </div>
                  <p class="text-xs text-muted-foreground text-center">Loading...</p>
                </div>
              </div>
            </UiCardContent>
          </UiCard>
        </template>
      </ClientOnly>

      <!-- Header Layout Toggle -->
      <ClientOnly>
        <UiCard>
          <UiCardHeader>
            <UiCardTitle>Header Layout</UiCardTitle>
            <UiCardDescription>Choose where the app header is positioned relative to the sidebar.</UiCardDescription>
          </UiCardHeader>
          <UiCardContent>
            <div class="border-border bg-card flex items-center justify-between rounded-xl border px-4 py-3 shadow-sm">
              <div class="flex items-center gap-3">
                <div class="bg-primary/10 flex size-9 items-center justify-center rounded-lg">
                  <Icon :name="headerAbove ? 'lucide:panel-top' : 'lucide:panel-left'" class="text-primary size-4" />
                </div>
                <div>
                  <p class="text-foreground text-sm font-semibold">Header above sidebar</p>
                  <p class="text-muted-foreground text-xs">
                    {{
                      headerAbove
                        ? 'Header spans across the top of sidebar and content'
                        : 'Header is inside the content area only'
                    }}
                  </p>
                </div>
              </div>
              <UiSwitch v-model="headerAbove" />
            </div>
          </UiCardContent>
        </UiCard>
        <template #fallback>
          <UiCard>
            <UiCardHeader>
              <UiCardTitle>Header Layout</UiCardTitle>
              <UiCardDescription>Choose where the app header is positioned relative to the sidebar.</UiCardDescription>
            </UiCardHeader>
            <UiCardContent>
              <div
                class="border-border bg-card flex items-center justify-between rounded-xl border px-4 py-3 shadow-sm">
                <div class="flex items-center gap-3">
                  <div class="bg-primary/10 flex size-9 items-center justify-center rounded-lg">
                    <Icon name="lucide:panel-left" class="text-primary size-4" />
                  </div>
                  <div>
                    <p class="text-foreground text-sm font-semibold">Header above sidebar</p>
                    <p class="text-muted-foreground text-xs">Loading...</p>
                  </div>
                </div>
                <UiSwitch :model-value="false" disabled />
              </div>
            </UiCardContent>
          </UiCard>
        </template>
      </ClientOnly>

      <!-- Icon Rail Position -->
      <ClientOnly>
        <UiCard>
          <UiCardHeader>
            <UiCardTitle>Icon Rail Position</UiCardTitle>
            <UiCardDescription>Choose where the icon rail is anchored in the layout.</UiCardDescription>
          </UiCardHeader>
          <UiCardContent>
            <div class="flex gap-3">
              <button
                class="flex flex-1 flex-col items-center gap-2 rounded-xl border px-4 py-3 transition-colors"
                :class="
                  iconRailPosition === 'left'
                    ? 'border-primary bg-primary/10'
                    : 'border-border bg-card hover:bg-muted/50'
                "
                @click="setIconRailPosition('left')">
                <div class="flex items-center gap-1.5">
                  <Icon
                    name="lucide:panel-left"
                    class="size-4"
                    :class="iconRailPosition === 'left' ? 'text-primary' : 'text-muted-foreground'" />
                  <span
                    class="text-sm font-medium"
                    :class="iconRailPosition === 'left' ? 'text-primary' : 'text-foreground'">
                    Left
                  </span>
                </div>
                <p class="text-xs text-muted-foreground text-center">Rail on the left side</p>
              </button>
              <button
                class="flex flex-1 flex-col items-center gap-2 rounded-xl border px-4 py-3 transition-colors"
                :class="
                  iconRailPosition === 'bottom'
                    ? 'border-primary bg-primary/10'
                    : 'border-border bg-card hover:bg-muted/50'
                "
                @click="setIconRailPosition('bottom')">
                <div class="flex items-center gap-1.5">
                  <Icon
                    name="lucide:panel-bottom"
                    class="size-4"
                    :class="iconRailPosition === 'bottom' ? 'text-primary' : 'text-muted-foreground'" />
                  <span
                    class="text-sm font-medium"
                    :class="iconRailPosition === 'bottom' ? 'text-primary' : 'text-foreground'">
                    Bottom
                  </span>
                </div>
                <p class="text-xs text-muted-foreground text-center">Rail along the bottom</p>
              </button>
            </div>
          </UiCardContent>
        </UiCard>
        <template #fallback>
          <UiCard>
            <UiCardHeader>
              <UiCardTitle>Icon Rail Position</UiCardTitle>
              <UiCardDescription>Choose where the icon rail is anchored in the layout.</UiCardDescription>
            </UiCardHeader>
            <UiCardContent>
              <div class="flex gap-3 opacity-50 pointer-events-none">
                <div class="flex flex-1 flex-col items-center gap-2 rounded-xl border border-border bg-card px-4 py-3">
                  <div class="flex items-center gap-1.5">
                    <Icon name="lucide:panel-left" class="size-4 text-muted-foreground" />
                    <span class="text-sm font-medium">Left</span>
                  </div>
                  <p class="text-xs text-muted-foreground text-center">Loading...</p>
                </div>
                <div class="flex flex-1 flex-col items-center gap-2 rounded-xl border border-border bg-card px-4 py-3">
                  <div class="flex items-center gap-1.5">
                    <Icon name="lucide:panel-bottom" class="size-4 text-muted-foreground" />
                    <span class="text-sm font-medium">Bottom</span>
                  </div>
                  <p class="text-xs text-muted-foreground text-center">Loading...</p>
                </div>
              </div>
            </UiCardContent>
          </UiCard>
        </template>
      </ClientOnly>

      <!-- Reset to Defaults -->
      <ClientOnly>
        <UiCard class="border-border/50">
          <UiCardHeader>
            <UiCardTitle>Reset to Defaults</UiCardTitle>
            <UiCardDescription>Restore all appearance settings to their original values.</UiCardDescription>
          </UiCardHeader>
          <UiCardContent>
            <div v-if="!showResetConfirm">
              <UiButton variant="outline" size="sm" @click="showResetConfirm = true">
                <Icon name="lucide:rotate-ccw" class="mr-2 size-4" />
                Reset all settings
              </UiButton>
            </div>
            <div v-else class="flex items-center gap-3">
              <p class="text-sm text-muted-foreground">Reset everything to defaults?</p>
              <UiButton variant="outline" size="sm" @click="showResetConfirm = false">Cancel</UiButton>
              <UiButton variant="default" size="sm" @click="resetAllSettings">
                <Icon name="lucide:check" class="mr-1.5 size-3.5" />
                Confirm
              </UiButton>
            </div>
          </UiCardContent>
        </UiCard>
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
              <UiButton variant="outline" size="sm" @click="go('/settings/theme')">
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
