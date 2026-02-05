<script setup lang="ts">
import type { BrandConfig } from '~/composables/useBranding'

const _props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  'update:open': [open: boolean]
  save: [config: BrandConfig]
}>()

const { createDefaultBrandConfig, generateCssVariables, validateBrandConfig, toJsonLd } = useBranding()

// Local brand config for editing
const brandConfig = ref<BrandConfig>(createDefaultBrandConfig())
const showPreview = ref(false)
const previewMode = ref<'light' | 'dark'>('light')

// Handle config updates from editor
const handleUpdate = (config: BrandConfig) => {
  brandConfig.value = config
}

// Save brand config
const handleSave = () => {
  const { valid, errors } = validateBrandConfig(brandConfig.value)
  if (!valid) {
    console.error('Brand config validation failed:', errors)
    return
  }
  emit('save', brandConfig.value)
  emit('update:open', false)
}

// Generate preview CSS
const previewCss = computed(() => {
  return generateCssVariables(brandConfig.value, previewMode.value)
})

// Export as JSON-LD
const handleExport = () => {
  const jsonLd = toJsonLd(brandConfig.value)
  const blob = new Blob([JSON.stringify(jsonLd, null, 2)], { type: 'application/ld+json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${brandConfig.value.name.toLowerCase().replace(/\s+/g, '-')}-brand.jsonld`
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <UiDialog :open="open" @update:open="emit('update:open', $event)">
    <UiDialogContent class="max-w-5xl h-[85vh] flex flex-col p-0">
      <!-- Header -->
      <div class="flex items-center justify-between px-6 py-4 border-b shrink-0">
        <div class="flex items-center gap-3">
          <Icon name="lucide:palette" class="w-5 h-5 text-primary" />
          <div>
            <h2 class="text-lg font-semibold">Brand Settings</h2>
            <p class="text-sm text-muted-foreground">Customize your app's appearance</p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <UiButton variant="outline" size="sm" @click="showPreview = !showPreview">
            <Icon :name="showPreview ? 'lucide:eye-off' : 'lucide:eye'" class="w-4 h-4 mr-2" />
            {{ showPreview ? 'Hide' : 'Show' }} Preview
          </UiButton>
          <UiButton variant="outline" size="sm" @click="handleExport">
            <Icon name="lucide:download" class="w-4 h-4 mr-2" />
            Export
          </UiButton>
          <UiButton variant="outline" @click="emit('update:open', false)">Cancel</UiButton>
          <UiButton @click="handleSave">
            <Icon name="lucide:save" class="w-4 h-4 mr-2" />
            Save
          </UiButton>
        </div>
      </div>

      <!-- Main Content -->
      <div class="flex-1 flex overflow-hidden">
        <!-- Editor -->
        <div class="flex-1 overflow-hidden" :class="showPreview ? 'w-1/2' : 'w-full'">
          <BrandingEditor :config="brandConfig" @update="handleUpdate" />
        </div>

        <!-- Preview Panel -->
        <div v-if="showPreview" class="w-1/2 border-l bg-muted/20 overflow-y-auto">
          <div class="p-4 border-b bg-background sticky top-0 z-10">
            <div class="flex items-center justify-between">
              <h3 class="font-medium">Live Preview</h3>
              <div class="flex items-center gap-1 p-1 bg-muted rounded-lg">
                <button
                  class="px-2 py-1 text-xs rounded transition-colors"
                  :class="previewMode === 'light' ? 'bg-background shadow' : 'hover:bg-background/50'"
                  @click="previewMode = 'light'">
                  Light
                </button>
                <button
                  class="px-2 py-1 text-xs rounded transition-colors"
                  :class="previewMode === 'dark' ? 'bg-background shadow' : 'hover:bg-background/50'"
                  @click="previewMode = 'dark'">
                  Dark
                </button>
              </div>
            </div>
          </div>

          <!-- Preview Content -->
          <div
            class="p-6"
            :style="`${previewCss}; background: hsl(var(--background)); color: hsl(var(--foreground));`">
            <!-- Header Preview -->
            <div class="mb-6 pb-4 border-b" style="border-color: hsl(var(--border))">
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded" style="background: hsl(var(--primary))" />
                <div>
                  <h1 class="font-bold" :style="{ fontFamily: brandConfig.typography.fontFamily.sans }">
                    {{ brandConfig.name }}
                  </h1>
                  <p class="text-sm" style="color: hsl(var(--muted-foreground))">{{ brandConfig.tagline }}</p>
                </div>
              </div>
            </div>

            <!-- Card Preview -->
            <div
              class="p-4 rounded-lg mb-4"
              :style="`background: hsl(var(--card)); border: 1px solid hsl(var(--border)); border-radius: ${brandConfig.layout.borderRadius.lg}`">
              <h3 class="font-semibold mb-2">Sample Card</h3>
              <p class="text-sm" style="color: hsl(var(--muted-foreground))">
                This is a preview of how cards will look with your branding settings.
              </p>
              <div class="flex gap-2 mt-4">
                <button
                  class="px-4 py-2 text-sm font-medium rounded"
                  :style="`background: hsl(var(--primary)); color: hsl(var(--primary-foreground)); border-radius: ${brandConfig.layout.borderRadius.md}`">
                  Primary
                </button>
                <button
                  class="px-4 py-2 text-sm font-medium rounded"
                  :style="`background: hsl(var(--secondary)); color: hsl(var(--secondary-foreground)); border-radius: ${brandConfig.layout.borderRadius.md}`">
                  Secondary
                </button>
              </div>
            </div>

            <!-- Status Colors Preview -->
            <div class="grid grid-cols-3 gap-2 mb-4">
              <div class="p-2 text-center rounded text-sm" style="background: hsl(var(--success)); color: hsl(var(--success-foreground))">
                Success
              </div>
              <div class="p-2 text-center rounded text-sm" style="background: hsl(var(--warning)); color: hsl(var(--warning-foreground))">
                Warning
              </div>
              <div class="p-2 text-center rounded text-sm" style="background: hsl(var(--destructive)); color: hsl(var(--destructive-foreground))">
                Destructive
              </div>
            </div>

            <!-- Input Preview -->
            <div
              class="p-3 rounded"
              :style="`background: hsl(var(--input)); border: 1px solid hsl(var(--border)); border-radius: ${brandConfig.layout.borderRadius.md}`">
              <span style="color: hsl(var(--muted-foreground))">Input placeholder...</span>
            </div>
          </div>
        </div>
      </div>
    </UiDialogContent>
  </UiDialog>
</template>
