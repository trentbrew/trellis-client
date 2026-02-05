<script setup lang="ts">
  import type { ThemePresetId } from '~/types/theme'

  interface Props {
    label?: string
    placeholder?: string
    showReset?: boolean
    selectId?: string
  }

  const props = withDefaults(defineProps<Props>(), {
    label: 'Theme Preset',
    placeholder: 'Select a theme...',
    showReset: true,
    selectId: 'theme-selector',
  })

  const { currentPreset, currentPresetId, builtInPresets, customPresets, setPreset, resetTheme, colorMode } = useTheme()

  const handleSelect = (value: unknown) => {
    const selected = value === null || value === undefined ? null : String(value)
    if (!selected || selected === '' || selected === '__default__') {
      resetTheme()
    } else {
      setPreset(selected as ThemePresetId)
    }
  }
</script>

<template>
  <div class="space-y-2">
    <UiLabel v-if="props.label" :for="props.selectId">{{ props.label }}</UiLabel>
    <UiSelect :model-value="currentPresetId" @update:model-value="handleSelect">
      <UiSelectTrigger :id="props.selectId" :placeholder="props.placeholder">
        <template #value>
          <div v-if="currentPreset" class="flex items-center gap-2">
            <div
              class="size-4 rounded border"
              :style="{
                backgroundColor: currentPreset.styles[colorMode.value as 'light' | 'dark']?.primary || '#3b82f6',
              }"
            />
            <span>{{ currentPreset.label }}</span>
          </div>
          <span v-else class="text-muted-foreground">{{ props.placeholder }}</span>
        </template>
      </UiSelectTrigger>
      <UiSelectContent>
        <UiSelectViewport>
          <UiSelectItem v-if="props.showReset" value="__default__" text="Default Theme">
            <div class="flex items-center gap-2">
              <div class="size-4 rounded border border-border bg-background" />
              <span>Default Theme</span>
            </div>
          </UiSelectItem>
          <UiSelectSeparator v-if="props.showReset && Object.keys(builtInPresets).length > 0" />
          <UiSelectGroup v-if="Object.keys(builtInPresets).length > 0">
            <UiSelectLabel>Built-in Presets</UiSelectLabel>
            <UiSelectItem
              v-for="[id, preset] in Object.entries(builtInPresets)"
              :key="id"
              :value="id"
              :text="preset.label"
            >
              <div class="flex items-center gap-2">
                <div
                  class="size-4 rounded border"
                  :style="{
                    backgroundColor: preset.styles[colorMode.value as 'light' | 'dark']?.primary || '#3b82f6',
                  }"
                />
                <span>{{ preset.label }}</span>
              </div>
            </UiSelectItem>
          </UiSelectGroup>
          <UiSelectSeparator v-if="Object.keys(customPresets).length > 0" />
          <UiSelectGroup v-if="Object.keys(customPresets).length > 0">
            <UiSelectLabel>Custom Presets</UiSelectLabel>
            <UiSelectItem
              v-for="[id, preset] in Object.entries(customPresets)"
              :key="id"
              :value="id"
              :text="preset.label"
            >
              <div class="flex items-center gap-2">
                <div
                  class="size-4 rounded border"
                  :style="{
                    backgroundColor: preset.styles[colorMode.value as 'light' | 'dark']?.primary || '#3b82f6',
                  }"
                />
                <span>{{ preset.label }}</span>
              </div>
            </UiSelectItem>
          </UiSelectGroup>
        </UiSelectViewport>
      </UiSelectContent>
    </UiSelect>
  </div>
</template>
