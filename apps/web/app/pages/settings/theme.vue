<script setup lang="ts">
  import type { ThemePresetId } from '~/types/theme'

  const {
    currentPreset,
    currentPresetId,
    builtInPresets,
    customPresets,
    allPresets,
    setPreset,
    deletePreset,
    createPreset,
    colorMode,
  } = useTheme()

  const showCreateDialog = ref(false)
  const newThemeName = ref('')
  const basePresetId = ref<ThemePresetId | null>(null)

  const deleteDialogOpen = ref(false)
  const pendingDeletePresetId = ref<ThemePresetId | null>(null)

  const previewColors = computed(() => {
    const preset = currentPreset.value

    if (!preset || !preset.styles) {
      return {
        background: '#ffffff',
        primary: '#3b82f6',
        secondary: '#f3f4f6',
        accent: '#e0f2fe',
      }
    }

    const styles = preset.styles[colorMode.value as 'light' | 'dark']
    return {
      background: styles?.background || '#ffffff',
      primary: styles?.primary || '#3b82f6',
      secondary: styles?.secondary || '#f3f4f6',
      accent: styles?.accent || '#e0f2fe',
    }
  })

  const requestDelete = (id: ThemePresetId) => {
    pendingDeletePresetId.value = id
    deleteDialogOpen.value = true
  }

  const confirmDelete = () => {
    const id = pendingDeletePresetId.value
    if (!id) return
    deletePreset(id)
    deleteDialogOpen.value = false
  }

  watch(deleteDialogOpen, (open) => {
    if (open) return
    pendingDeletePresetId.value = null
  })

  const handleCreateTheme = () => {
    if (!newThemeName.value || !basePresetId.value) return

    const basePreset = allPresets.value[basePresetId.value]
    if (!basePreset) return

    const newId = `custom-${Date.now()}`
    createPreset(newId, {
      label: newThemeName.value,
      source: 'CUSTOM',
      styles: JSON.parse(JSON.stringify(basePreset.styles)), // Deep clone
    })

    // Reset form
    newThemeName.value = ''
    basePresetId.value = null
    showCreateDialog.value = false

    // Apply the new theme
    setPreset(newId)
  }
</script>

<template>
  <Page
    variant="settings"
    subtitle="Settings"
    title="Theme Settings"
    description="Customize your app's appearance with theme presets or create your own custom theme.">
    <div class="space-y-6">
      <!-- Theme Preset Selector -->
      <UiCard>
        <UiCardHeader>
          <UiCardTitle>Theme Preset</UiCardTitle>
          <UiCardDescription>Choose from built-in theme presets or use your custom themes.</UiCardDescription>
        </UiCardHeader>
        <UiCardContent>
          <ThemeSelector />
        </UiCardContent>
      </UiCard>

      <!-- Current Theme Preview -->
      <UiCard v-if="currentPreset">
        <UiCardHeader>
          <UiCardTitle>Current Theme: {{ currentPreset.label }}</UiCardTitle>
          <UiCardDescription>Preview of the currently active theme preset.</UiCardDescription>
        </UiCardHeader>
        <UiCardContent>
          <div class="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div class="space-y-2">
              <div class="h-16 rounded-lg border" :style="{ backgroundColor: previewColors.background }" />
              <p class="text-xs text-muted-foreground">Background</p>
            </div>
            <div class="space-y-2">
              <div class="h-16 rounded-lg border" :style="{ backgroundColor: previewColors.primary }" />
              <p class="text-xs text-muted-foreground">Primary</p>
            </div>
            <div class="space-y-2">
              <div class="h-16 rounded-lg border" :style="{ backgroundColor: previewColors.secondary }" />
              <p class="text-xs text-muted-foreground">Secondary</p>
            </div>
            <div class="space-y-2">
              <div class="h-16 rounded-lg border" :style="{ backgroundColor: previewColors.accent }" />
              <p class="text-xs text-muted-foreground">Accent</p>
            </div>
          </div>
        </UiCardContent>
      </UiCard>

      <!-- Built-in Presets Grid -->
      <UiCard v-if="Object.keys(builtInPresets).length > 0">
        <UiCardHeader>
          <UiCardTitle>Built-in Presets</UiCardTitle>
          <UiCardDescription>
            Browse and select from our collection of carefully crafted theme presets.
          </UiCardDescription>
        </UiCardHeader>
        <UiCardContent>
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <button
              v-for="[id, preset] in Object.entries(builtInPresets)"
              :key="id"
              class="group relative overflow-hidden rounded-lg border bg-card p-4 text-left transition-all hover:border-primary hover:shadow-md"
              :class="{ 'border-primary ring-2 ring-primary': currentPresetId === id }"
              @click="setPreset(id)">
              <div class="mb-3 flex items-center justify-between">
                <h3 class="font-semibold">{{ preset.label }}</h3>
                <Icon v-if="currentPresetId === id" name="lucide:check-circle" class="size-5 text-primary" />
              </div>
              <div class="flex gap-1">
                <div
                  v-for="color in [
                    preset.styles[colorMode.value as 'light' | 'dark']?.primary,
                    preset.styles[colorMode.value as 'light' | 'dark']?.secondary,
                    preset.styles[colorMode.value as 'light' | 'dark']?.accent,
                    preset.styles[colorMode.value as 'light' | 'dark']?.background,
                  ]"
                  :key="color"
                  class="h-8 flex-1 rounded border"
                  :style="{ backgroundColor: color || '#ffffff' }" />
              </div>
            </button>
          </div>
        </UiCardContent>
      </UiCard>

      <!-- Custom Presets -->
      <UiCard v-if="Object.keys(customPresets).length > 0">
        <UiCardHeader>
          <UiCardTitle>Custom Presets</UiCardTitle>
          <UiCardDescription>Your custom theme presets.</UiCardDescription>
        </UiCardHeader>
        <UiCardContent>
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div
              v-for="[id, preset] in Object.entries(customPresets)"
              :key="id"
              class="group relative overflow-hidden rounded-lg border bg-card p-4">
              <div class="mb-3 flex items-center justify-between">
                <h3 class="font-semibold">{{ preset.label }}</h3>
                <div class="flex gap-2">
                  <button v-if="currentPresetId === id" class="text-primary" disabled>
                    <Icon name="lucide:check-circle" class="size-5" />
                  </button>
                  <button class="text-destructive hover:text-destructive/80" @click.stop="requestDelete(id)">
                    <Icon name="lucide:trash-2" class="size-4" />
                  </button>
                </div>
              </div>
              <div class="flex gap-1">
                <div
                  v-for="color in [
                    preset.styles[colorMode.value as 'light' | 'dark']?.primary,
                    preset.styles[colorMode.value as 'light' | 'dark']?.secondary,
                    preset.styles[colorMode.value as 'light' | 'dark']?.accent,
                    preset.styles[colorMode.value as 'light' | 'dark']?.background,
                  ]"
                  :key="color"
                  class="h-8 flex-1 rounded border"
                  :style="{ backgroundColor: color || '#ffffff' }" />
              </div>
              <button
                class="mt-3 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-medium transition-colors hover:bg-accent"
                @click="setPreset(id)">
                Apply Theme
              </button>
            </div>
          </div>
        </UiCardContent>
      </UiCard>

      <!-- Create Custom Theme -->
      <UiCard>
        <UiCardHeader>
          <UiCardTitle>Create Custom Theme</UiCardTitle>
          <UiCardDescription>
            Create your own custom theme by duplicating an existing preset and customizing it.
          </UiCardDescription>
        </UiCardHeader>
        <UiCardContent>
          <div class="space-y-4">
            <div class="flex gap-2">
              <UiButton variant="outline" @click="showCreateDialog = true">
                <Icon name="lucide:plus" class="mr-2 size-4" />
                Create New Theme
              </UiButton>
            </div>
          </div>
        </UiCardContent>
      </UiCard>
    </div>

    <UiAlertDialog v-model:open="deleteDialogOpen">
      <UiAlertDialogContent>
        <UiAlertDialogHeader>
          <UiAlertDialogTitle>Delete theme?</UiAlertDialogTitle>
          <UiAlertDialogDescription>This action cannot be undone.</UiAlertDialogDescription>
        </UiAlertDialogHeader>
        <UiAlertDialogFooter>
          <UiAlertDialogCancel>Cancel</UiAlertDialogCancel>
          <UiAlertDialogAction class="bg-destructive text-white hover:bg-destructive/90" @click="confirmDelete">
            Delete
          </UiAlertDialogAction>
        </UiAlertDialogFooter>
      </UiAlertDialogContent>
    </UiAlertDialog>

    <!-- Create Theme Dialog -->
    <UiDialog v-model="showCreateDialog">
      <UiDialogContent class="max-w-2xl">
        <UiDialogHeader>
          <UiDialogTitle>Create Custom Theme</UiDialogTitle>
          <UiDialogDescription>Create a new theme by duplicating an existing preset.</UiDialogDescription>
        </UiDialogHeader>
        <div class="space-y-4 py-4">
          <div>
            <UiLabel for="theme-name">Theme Name</UiLabel>
            <UiInput id="theme-name" v-model="newThemeName" placeholder="My Custom Theme" />
          </div>
          <div>
            <UiLabel for="base-preset">Base Preset</UiLabel>
            <UiSelect v-model="basePresetId">
              <UiSelectTrigger>
                <UiSelectValue placeholder="Select a base preset..." />
              </UiSelectTrigger>
              <UiSelectContent>
                <UiSelectViewport>
                  <UiSelectItem
                    v-for="[id, preset] in Object.entries(allPresets)"
                    :key="id"
                    :value="id"
                    :text="preset.label" />
                </UiSelectViewport>
              </UiSelectContent>
            </UiSelect>
          </div>
        </div>
        <UiDialogFooter>
          <UiButton variant="outline" @click="showCreateDialog = false">Cancel</UiButton>
          <UiButton :disabled="!newThemeName || !basePresetId" @click="handleCreateTheme">Create Theme</UiButton>
        </UiDialogFooter>
      </UiDialogContent>
    </UiDialog>
  </Page>
</template>
