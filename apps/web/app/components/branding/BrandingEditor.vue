<script setup lang="ts">
import type { BrandConfig, ColorPalette, ThemePreset } from '~/composables/useBranding'

const props = defineProps<{
  config: BrandConfig
}>()

const emit = defineEmits<{
  update: [config: BrandConfig]
}>()

const { applyPreset } = useBranding()

// Local state for editing
const localConfig = ref<BrandConfig>({ ...props.config })
const activeTab = ref<'general' | 'colors' | 'typography' | 'layout' | 'advanced'>('general')
const colorMode = ref<'light' | 'dark'>('light')

watch(
  () => props.config,
  (newConfig) => {
    localConfig.value = { ...newConfig }
  },
  { deep: true }
)

const emitUpdate = () => {
  localConfig.value.updatedAt = Date.now()
  emit('update', { ...localConfig.value })
}

// Color palette based on mode
const currentPalette = computed({
  get: () => localConfig.value.colors[colorMode.value],
  set: (palette: ColorPalette) => {
    localConfig.value.colors[colorMode.value] = palette
    emitUpdate()
  },
})

const updateColor = (key: keyof ColorPalette, value: string) => {
  currentPalette.value[key] = value
  emitUpdate()
}

// Apply preset
const handleApplyPreset = (preset: ThemePreset) => {
  localConfig.value = applyPreset(localConfig.value, preset)
  emitUpdate()
}

const presetOptions: { value: ThemePreset; label: string; description: string }[] = [
  { value: 'default', label: 'Default', description: 'Clean, neutral design' },
  { value: 'minimal', label: 'Minimal', description: 'Stripped-down aesthetic' },
  { value: 'vibrant', label: 'Vibrant', description: 'Bold, colorful palette' },
  { value: 'corporate', label: 'Corporate', description: 'Professional business style' },
  { value: 'playful', label: 'Playful', description: 'Fun, rounded design' },
  { value: 'dark', label: 'Dark', description: 'Dark mode by default' },
]

const colorKeys: Array<{ key: keyof ColorPalette; label: string; group: string }> = [
  { key: 'primary', label: 'Primary', group: 'Brand' },
  { key: 'primaryForeground', label: 'Primary Text', group: 'Brand' },
  { key: 'secondary', label: 'Secondary', group: 'Brand' },
  { key: 'secondaryForeground', label: 'Secondary Text', group: 'Brand' },
  { key: 'accent', label: 'Accent', group: 'Brand' },
  { key: 'accentForeground', label: 'Accent Text', group: 'Brand' },
  { key: 'background', label: 'Background', group: 'Base' },
  { key: 'foreground', label: 'Foreground', group: 'Base' },
  { key: 'muted', label: 'Muted', group: 'Base' },
  { key: 'mutedForeground', label: 'Muted Text', group: 'Base' },
  { key: 'card', label: 'Card', group: 'Base' },
  { key: 'cardForeground', label: 'Card Text', group: 'Base' },
  { key: 'border', label: 'Border', group: 'Base' },
  { key: 'input', label: 'Input', group: 'Base' },
  { key: 'ring', label: 'Focus Ring', group: 'Base' },
  { key: 'destructive', label: 'Destructive', group: 'Status' },
  { key: 'destructiveForeground', label: 'Destructive Text', group: 'Status' },
  { key: 'success', label: 'Success', group: 'Status' },
  { key: 'successForeground', label: 'Success Text', group: 'Status' },
  { key: 'warning', label: 'Warning', group: 'Status' },
  { key: 'warningForeground', label: 'Warning Text', group: 'Status' },
]

const colorGroups = computed(() => {
  const groups: Record<string, typeof colorKeys> = {}
  for (const color of colorKeys) {
    if (!groups[color.group]) groups[color.group] = []
    groups[color.group]!.push(color)
  }
  return groups
})

const tabs = [
  { id: 'general', label: 'General', icon: 'lucide:settings-2' },
  { id: 'colors', label: 'Colors', icon: 'lucide:palette' },
  { id: 'typography', label: 'Typography', icon: 'lucide:type' },
  { id: 'layout', label: 'Layout', icon: 'lucide:layout' },
  { id: 'advanced', label: 'Advanced', icon: 'lucide:code' },
]
</script>

<template>
  <div class="flex h-full">
    <!-- Tab Navigation -->
    <div class="w-48 border-r bg-muted/20 p-2 shrink-0">
      <nav class="space-y-1">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          class="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors"
          :class="activeTab === tab.id ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'"
          @click="activeTab = tab.id as any">
          <Icon :name="tab.icon" class="w-4 h-4" />
          {{ tab.label }}
        </button>
      </nav>
    </div>

    <!-- Tab Content -->
    <div class="flex-1 overflow-y-auto p-6">
      <!-- General Tab -->
      <div v-if="activeTab === 'general'" class="space-y-6 max-w-xl">
        <div>
          <h3 class="text-lg font-semibold mb-4">Brand Identity</h3>

          <div class="space-y-4">
            <div class="space-y-1.5">
              <label class="text-sm font-medium">Brand Name</label>
              <UiInput v-model="localConfig.name" placeholder="My App" @blur="emitUpdate" />
            </div>

            <div class="space-y-1.5">
              <label class="text-sm font-medium">Tagline</label>
              <UiInput v-model="localConfig.tagline" placeholder="Build something amazing" @blur="emitUpdate" />
            </div>

            <div class="space-y-1.5">
              <label class="text-sm font-medium">Description</label>
              <UiTextarea v-model="localConfig.description" placeholder="A brief description..." :rows="3" @blur="emitUpdate" />
            </div>
          </div>
        </div>

        <div>
          <h3 class="text-lg font-semibold mb-4">Logo</h3>

          <div class="space-y-4">
            <div class="space-y-1.5">
              <label class="text-sm font-medium">Primary Logo URL</label>
              <UiInput v-model="localConfig.logo.primary.url" placeholder="/logo.svg" @blur="emitUpdate" />
            </div>

            <div class="space-y-1.5">
              <label class="text-sm font-medium">Icon URL</label>
              <UiInput v-model="localConfig.logo.icon.url" placeholder="/icon.svg" @blur="emitUpdate" />
            </div>

            <div class="space-y-1.5">
              <label class="text-sm font-medium">Favicon URL</label>
              <UiInput v-model="localConfig.logo.favicon.url" placeholder="/favicon.ico" @blur="emitUpdate" />
            </div>
          </div>
        </div>

        <div>
          <h3 class="text-lg font-semibold mb-4">Quick Start: Theme Presets</h3>
          <div class="grid grid-cols-2 gap-2">
            <button
              v-for="preset in presetOptions"
              :key="preset.value"
              class="text-left p-3 rounded-lg border hover:bg-muted/50 transition-colors"
              @click="handleApplyPreset(preset.value)">
              <div class="font-medium text-sm">{{ preset.label }}</div>
              <div class="text-xs text-muted-foreground">{{ preset.description }}</div>
            </button>
          </div>
        </div>
      </div>

      <!-- Colors Tab -->
      <div v-else-if="activeTab === 'colors'" class="space-y-6">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold">Color Palette</h3>
          <div class="flex items-center gap-1 p-1 bg-muted rounded-lg">
            <button
              class="px-3 py-1 text-sm rounded-md transition-colors"
              :class="colorMode === 'light' ? 'bg-background shadow' : 'hover:bg-background/50'"
              @click="colorMode = 'light'">
              <Icon name="lucide:sun" class="w-4 h-4" />
            </button>
            <button
              class="px-3 py-1 text-sm rounded-md transition-colors"
              :class="colorMode === 'dark' ? 'bg-background shadow' : 'hover:bg-background/50'"
              @click="colorMode = 'dark'">
              <Icon name="lucide:moon" class="w-4 h-4" />
            </button>
          </div>
        </div>

        <div v-for="(colors, group) in colorGroups" :key="group" class="space-y-3">
          <h4 class="text-sm font-medium text-muted-foreground">{{ group }}</h4>
          <div class="space-y-2">
            <BrandingColorPicker
              v-for="color in colors"
              :key="color.key"
              :model-value="currentPalette[color.key]"
              :label="color.label"
              @update:model-value="updateColor(color.key, $event)" />
          </div>
        </div>
      </div>

      <!-- Typography Tab -->
      <div v-else-if="activeTab === 'typography'" class="space-y-6 max-w-xl">
        <h3 class="text-lg font-semibold">Typography</h3>

        <div class="space-y-4">
          <div class="space-y-1.5">
            <label class="text-sm font-medium">Sans-serif Font</label>
            <UiInput
              v-model="localConfig.typography.fontFamily.sans"
              placeholder="Inter, system-ui, sans-serif"
              @blur="emitUpdate" />
          </div>

          <div class="space-y-1.5">
            <label class="text-sm font-medium">Serif Font</label>
            <UiInput
              v-model="localConfig.typography.fontFamily.serif"
              placeholder="Georgia, serif"
              @blur="emitUpdate" />
          </div>

          <div class="space-y-1.5">
            <label class="text-sm font-medium">Monospace Font</label>
            <UiInput
              v-model="localConfig.typography.fontFamily.mono"
              placeholder="JetBrains Mono, monospace"
              @blur="emitUpdate" />
          </div>

          <div class="space-y-1.5">
            <label class="text-sm font-medium">Base Font Size</label>
            <UiInput
              v-model="localConfig.typography.fontSize.base"
              placeholder="16px"
              @blur="emitUpdate" />
          </div>
        </div>

        <div class="p-4 bg-muted/50 rounded-lg">
          <h4 class="font-medium mb-3">Preview</h4>
          <div class="space-y-2" :style="{ fontFamily: localConfig.typography.fontFamily.sans }">
            <p class="text-2xl font-bold">Heading Example</p>
            <p class="text-base">This is body text with the selected font family.</p>
            <p class="text-sm text-muted-foreground">Smaller muted text for supporting content.</p>
            <code class="text-sm font-mono bg-muted px-2 py-1 rounded">monospace code</code>
          </div>
        </div>
      </div>

      <!-- Layout Tab -->
      <div v-else-if="activeTab === 'layout'" class="space-y-6 max-w-xl">
        <h3 class="text-lg font-semibold">Layout Settings</h3>

        <div class="space-y-4">
          <div class="space-y-1.5">
            <label class="text-sm font-medium">Sidebar Width (px)</label>
            <UiInput
              v-model.number="localConfig.layout.sidebar.width"
              type="number"
              @blur="emitUpdate" />
          </div>

          <div class="space-y-1.5">
            <label class="text-sm font-medium">Collapsed Sidebar Width (px)</label>
            <UiInput
              v-model.number="localConfig.layout.sidebar.collapsedWidth"
              type="number"
              @blur="emitUpdate" />
          </div>

          <div class="space-y-1.5">
            <label class="text-sm font-medium">Header Height (px)</label>
            <UiInput
              v-model.number="localConfig.layout.header.height"
              type="number"
              @blur="emitUpdate" />
          </div>

          <div class="space-y-1.5">
            <label class="text-sm font-medium">Content Max Width</label>
            <UiInput
              v-model="localConfig.layout.content.maxWidth"
              placeholder="1280px"
              @blur="emitUpdate" />
          </div>

          <div class="space-y-1.5">
            <label class="text-sm font-medium">Content Padding</label>
            <UiInput
              v-model="localConfig.layout.content.padding"
              placeholder="1.5rem"
              @blur="emitUpdate" />
          </div>
        </div>

        <div>
          <h4 class="text-sm font-medium mb-3">Border Radius</h4>
          <div class="grid grid-cols-3 gap-2">
            <div v-for="(value, key) in localConfig.layout.borderRadius" :key="key" class="space-y-1">
              <label class="text-xs text-muted-foreground">{{ key }}</label>
              <UiInput
                v-model="localConfig.layout.borderRadius[key as keyof typeof localConfig.layout.borderRadius]"
                class="text-xs"
                @blur="emitUpdate" />
            </div>
          </div>
        </div>
      </div>

      <!-- Advanced Tab -->
      <div v-else-if="activeTab === 'advanced'" class="space-y-6">
        <h3 class="text-lg font-semibold">Advanced Settings</h3>

        <div class="space-y-4">
          <div class="space-y-1.5">
            <label class="text-sm font-medium">Custom CSS</label>
            <UiTextarea
              v-model="localConfig.customCss"
              placeholder=":root { /* custom styles */ }"
              :rows="10"
              class="font-mono text-sm"
              @blur="emitUpdate" />
            <p class="text-xs text-muted-foreground">Add custom CSS that will be injected into the app.</p>
          </div>
        </div>

        <div>
          <h4 class="text-sm font-medium mb-3">SEO Metadata</h4>
          <div class="space-y-4">
            <div class="space-y-1.5">
              <label class="text-sm font-medium">Page Title</label>
              <UiInput
                v-model="localConfig.metadata.title"
                placeholder="My App"
                @blur="emitUpdate" />
            </div>

            <div class="space-y-1.5">
              <label class="text-sm font-medium">Meta Description</label>
              <UiTextarea
                v-model="localConfig.metadata.description"
                placeholder="A brief description for search engines..."
                :rows="2"
                @blur="emitUpdate" />
            </div>

            <div class="space-y-1.5">
              <label class="text-sm font-medium">OG Image URL</label>
              <UiInput
                v-model="localConfig.metadata.ogImage"
                placeholder="https://example.com/og-image.png"
                @blur="emitUpdate" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
