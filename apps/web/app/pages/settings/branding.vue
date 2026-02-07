<script setup lang="ts">
  import type { BrandConfig } from '~/composables/useBranding'

  const { createDefaultBrandConfig, generateCssVariables, validateBrandConfig, toJsonLd } = useBranding()

  const nuxtApp = useNuxtApp()

  // Local brand config for editing
  const brandConfig = ref<BrandConfig>(createDefaultBrandConfig())
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
    ;(nuxtApp as any).$toast?.success('Brand settings saved!')
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
  <Page
    variant="settings"
    subtitle="Settings"
    title="Branding"
    description="Customize your workspace brand colors, logo, and identity.">
    <div class="space-y-6">
      <!-- Brand Editor -->
      <UiCard>
        <UiCardHeader>
          <div class="flex items-center justify-between">
            <div>
              <UiCardTitle>Brand Editor</UiCardTitle>
              <UiCardDescription>Configure your brand colors, typography, and layout.</UiCardDescription>
            </div>
            <div class="flex items-center gap-2">
              <UiButton variant="outline" size="sm" @click="handleExport">
                <Icon name="lucide:download" class="w-4 h-4 mr-2" />
                Export
              </UiButton>
              <UiButton size="sm" @click="handleSave">
                <Icon name="lucide:save" class="w-4 h-4 mr-2" />
                Save
              </UiButton>
            </div>
          </div>
        </UiCardHeader>
        <UiCardContent>
          <BrandingEditor :config="brandConfig" @update="handleUpdate" />
        </UiCardContent>
      </UiCard>

      <!-- Live Preview -->
      <UiCard>
        <UiCardHeader>
          <div class="flex items-center justify-between">
            <div>
              <UiCardTitle>Live Preview</UiCardTitle>
              <UiCardDescription>See how your branding looks in real-time.</UiCardDescription>
            </div>
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
        </UiCardHeader>
        <UiCardContent>
          <div
            class="rounded-lg p-6"
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
            <div class="grid grid-cols-3 gap-2">
              <div
                class="p-2 text-center rounded text-sm"
                style="background: hsl(var(--success)); color: hsl(var(--success-foreground))">
                Success
              </div>
              <div
                class="p-2 text-center rounded text-sm"
                style="background: hsl(var(--warning)); color: hsl(var(--warning-foreground))">
                Warning
              </div>
              <div
                class="p-2 text-center rounded text-sm"
                style="background: hsl(var(--destructive)); color: hsl(var(--destructive-foreground))">
                Destructive
              </div>
            </div>
          </div>
        </UiCardContent>
      </UiCard>
    </div>
  </Page>
</template>
