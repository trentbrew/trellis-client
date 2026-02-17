<script setup lang="ts">
  import type { ThemePresetId } from '~/types/theme'

  const nuxtApp = useNuxtApp()
  const {
    brandConfig,
    loading,
    logoMarkForMode,
    updateBrandConfig,
    resetBrandConfig,
    createDefaultBrandConfig,
  } = useBrandConfig()
  const { currentApp } = useInstantData()

  // ── Local editing state (initialized from persisted brandConfig) ────
  const localLogo = reactive({
    mark: null as string | null,
    wordmark: null as string | null,
    favicon: null as string | null,
  })
  const localIdentity = reactive({
    name: '',
    tagline: '',
    description: '',
    mission: '',
    vision: '',
    values: [] as string[],
  })
  const localVoice = reactive({
    tone: '',
    personality: [] as string[],
    doVoice: [] as string[],
    dontVoice: [] as string[],
    audienceDescription: '',
  })
  const localLinks = reactive({
    website: '',
    email: '',
    social: [] as { platform: string; url: string }[],
  })
  const localThemePresetId = ref<string | null>(null)

  // Sync from persisted config to local state when it loads/changes
  watch(
    brandConfig,
    (config) => {
      if (!config) {
        const defaults = createDefaultBrandConfig(currentApp.value?.name)
        Object.assign(localIdentity, defaults.identity)
        return
      }
      localLogo.mark = config.logo?.mark || null
      localLogo.wordmark = config.logo?.wordmark || null
      localLogo.favicon = config.logo?.favicon || null
      Object.assign(localIdentity, {
        name: config.identity?.name || '',
        tagline: config.identity?.tagline || '',
        description: config.identity?.description || '',
        mission: config.identity?.mission || '',
        vision: config.identity?.vision || '',
        values: config.identity?.values || [],
      })
      Object.assign(localVoice, {
        tone: config.voice?.tone || '',
        personality: config.voice?.personality || [],
        doVoice: config.voice?.doVoice || [],
        dontVoice: config.voice?.dontVoice || [],
        audienceDescription: config.voice?.audienceDescription || '',
      })
      Object.assign(localLinks, {
        website: config.links?.website || '',
        email: config.links?.email || '',
        social: config.links?.social || [],
      })
      localThemePresetId.value = config.theme?.presetId || null
    },
    { immediate: true },
  )

  // ── Save helpers ────────────────────────────────────────────────────
  const isSaving = ref(false)

  async function saveLogo() {
    isSaving.value = true
    try {
      await updateBrandConfig({
        logo: { mark: localLogo.mark || undefined, wordmark: localLogo.wordmark || undefined, favicon: localLogo.favicon || undefined },
      })
      ;(nuxtApp as any).$toast?.success('Logo updated')
    } catch (e: any) {
      ;(nuxtApp as any).$toast?.error(e.message || 'Failed to save')
    } finally {
      isSaving.value = false
    }
  }

  async function saveTheme(presetId: string | null) {
    localThemePresetId.value = presetId
    try {
      await updateBrandConfig({ theme: { presetId: presetId || undefined } })
      ;(nuxtApp as any).$toast?.success('Theme updated')
    } catch (e: any) {
      ;(nuxtApp as any).$toast?.error(e.message || 'Failed to save')
    }
  }

  async function saveIdentity() {
    isSaving.value = true
    try {
      await updateBrandConfig({ identity: { ...localIdentity } })
      ;(nuxtApp as any).$toast?.success('Brand identity updated')
    } catch (e: any) {
      ;(nuxtApp as any).$toast?.error(e.message || 'Failed to save')
    } finally {
      isSaving.value = false
    }
  }

  async function saveVoice() {
    isSaving.value = true
    try {
      await updateBrandConfig({ voice: { ...localVoice } })
      ;(nuxtApp as any).$toast?.success('Brand voice updated')
    } catch (e: any) {
      ;(nuxtApp as any).$toast?.error(e.message || 'Failed to save')
    } finally {
      isSaving.value = false
    }
  }

  async function saveLinks() {
    isSaving.value = true
    try {
      await updateBrandConfig({ links: { ...localLinks } })
      ;(nuxtApp as any).$toast?.success('Links updated')
    } catch (e: any) {
      ;(nuxtApp as any).$toast?.error(e.message || 'Failed to save')
    } finally {
      isSaving.value = false
    }
  }

  async function handleReset() {
    try {
      await resetBrandConfig()
      ;(nuxtApp as any).$toast?.success('Brand config reset to defaults')
    } catch (e: any) {
      ;(nuxtApp as any).$toast?.error(e.message || 'Failed to reset')
    }
  }

  // ── Tag / list helpers ─────────────────────────────────────────────
  const newValue = ref('')
  function addToList(list: string[], value: string) {
    const trimmed = value.trim()
    if (trimmed && !list.includes(trimmed)) list.push(trimmed)
  }
  function removeFromList(list: string[], index: number) {
    list.splice(index, 1)
  }

  // Social link helpers
  function addSocialLink() {
    localLinks.social.push({ platform: '', url: '' })
  }
  function removeSocialLink(index: number) {
    localLinks.social.splice(index, 1)
  }

  // Theme selector handler
  function handleThemeSelect(value: unknown) {
    const selected = value === null || value === undefined ? null : String(value)
    if (!selected || selected === '' || selected === '__clear__') {
      saveTheme(null)
    } else {
      saveTheme(selected)
    }
  }

  const { builtInPresets, customPresets, colorMode } = useTheme()
</script>

<template>
  <Page
    variant="settings"
    subtitle="Settings"
    title="Branding"
    description="Customize your workspace brand — logo, theme, identity, and voice.">

    <div v-if="loading" class="flex items-center justify-center py-12">
      <Icon name="lucide:loader-2" class="h-5 w-5 animate-spin text-muted-foreground" />
    </div>

    <div v-else class="space-y-3">
      <!-- ─── Logo ──────────────────────────────────────────────── -->
      <UiCard>
        <UiCardContent class="p-0">
          <div class="px-4 py-3 space-y-4">
            <div class="flex items-center gap-3">
              <div class="flex size-9 items-center justify-center rounded-lg bg-violet-500/10">
                <Icon name="lucide:image" class="size-4 text-violet-500" />
              </div>
              <div class="flex-1">
                <p class="text-foreground text-sm font-semibold">Logo</p>
                <p class="text-muted-foreground text-xs">Upload a brand mark to replace the default Trellis logo.</p>
              </div>
              <UiButton
                variant="outline"
                size="xs"
                :disabled="isSaving"
                @click="saveLogo">
                Save
              </UiButton>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pl-12">
              <BrandLogoUploader
                v-model="localLogo.mark"
                label="Mark (square)"
                hint="Replaces the app logo. Square SVG/PNG/WebP."
              />
              <BrandLogoUploader
                v-model="localLogo.wordmark"
                label="Wordmark (wide)"
                hint="Horizontal logo with text."
              />
            </div>

            <!-- Preview -->
            <div v-if="logoMarkForMode" class="pl-12">
              <p class="text-xs text-muted-foreground mb-1">Current logo in header:</p>
              <div class="flex items-center gap-2 rounded-md bg-muted/30 px-3 py-2 w-fit">
                <AppLogo :brand-mark="logoMarkForMode" :size="24" />
                <span class="text-xs text-muted-foreground">{{ localIdentity.name || 'Brand' }}</span>
              </div>
            </div>
          </div>
        </UiCardContent>
      </UiCard>

      <!-- ─── Theme ─────────────────────────────────────────────── -->
      <UiCard>
        <UiCardContent class="p-0">
          <div class="px-4 py-3 space-y-3">
            <div class="flex items-center gap-3">
              <div class="flex size-9 items-center justify-center rounded-lg bg-blue-500/10">
                <Icon name="lucide:palette" class="size-4 text-blue-500" />
              </div>
              <div class="flex-1">
                <p class="text-foreground text-sm font-semibold">Theme</p>
                <p class="text-muted-foreground text-xs">Bind a theme preset to this world. All members see it.</p>
              </div>
            </div>

            <div class="pl-12">
              <UiSelect :model-value="localThemePresetId || '__clear__'" @update:model-value="handleThemeSelect">
                <UiSelectTrigger class="w-full max-w-xs">
                  <template #value>
                    <span v-if="localThemePresetId" class="flex items-center gap-2">
                      <div
                        class="size-3 rounded border"
                        :style="{
                          backgroundColor:
                            (builtInPresets[localThemePresetId as ThemePresetId] || customPresets[localThemePresetId as ThemePresetId])
                              ?.styles[(colorMode.value as 'light' | 'dark')]?.primary || '#6366f1',
                        }"
                      />
                      {{ (builtInPresets[localThemePresetId as ThemePresetId] || customPresets[localThemePresetId as ThemePresetId])?.label || localThemePresetId }}
                    </span>
                    <span v-else class="text-muted-foreground">No workspace theme (user preference)</span>
                  </template>
                </UiSelectTrigger>
                <UiSelectContent>
                  <UiSelectItem value="__clear__">
                    <span class="text-muted-foreground">None — use individual preference</span>
                  </UiSelectItem>
                  <UiSelectSeparator />
                  <UiSelectGroup>
                    <UiSelectLabel>Built-in</UiSelectLabel>
                    <UiSelectItem
                      v-for="[id, preset] in Object.entries(builtInPresets)"
                      :key="id"
                      :value="id"
                      :text="preset.label">
                      <div class="flex items-center gap-2">
                        <div
                          class="size-3 rounded border"
                          :style="{ backgroundColor: preset.styles[(colorMode.value as 'light' | 'dark')]?.primary || '#6366f1' }"
                        />
                        <span>{{ preset.label }}</span>
                      </div>
                    </UiSelectItem>
                  </UiSelectGroup>
                  <UiSelectSeparator v-if="Object.keys(customPresets).length > 0" />
                  <UiSelectGroup v-if="Object.keys(customPresets).length > 0">
                    <UiSelectLabel>Custom</UiSelectLabel>
                    <UiSelectItem
                      v-for="[id, preset] in Object.entries(customPresets)"
                      :key="id"
                      :value="id"
                      :text="preset.label">
                      <div class="flex items-center gap-2">
                        <div
                          class="size-3 rounded border"
                          :style="{ backgroundColor: preset.styles[(colorMode.value as 'light' | 'dark')]?.primary || '#6366f1' }"
                        />
                        <span>{{ preset.label }}</span>
                      </div>
                    </UiSelectItem>
                  </UiSelectGroup>
                </UiSelectContent>
              </UiSelect>
            </div>
          </div>
        </UiCardContent>
      </UiCard>

      <!-- ─── Identity ──────────────────────────────────────────── -->
      <UiCard>
        <UiCardContent class="p-0">
          <div class="px-4 py-3 space-y-4">
            <div class="flex items-center gap-3">
              <div class="flex size-9 items-center justify-center rounded-lg bg-emerald-500/10">
                <Icon name="lucide:building-2" class="size-4 text-emerald-500" />
              </div>
              <div class="flex-1">
                <p class="text-foreground text-sm font-semibold">Identity</p>
                <p class="text-muted-foreground text-xs">Brand name, mission, vision, and core values.</p>
              </div>
              <UiButton variant="outline" size="xs" :disabled="isSaving" @click="saveIdentity">
                Save
              </UiButton>
            </div>

            <div class="space-y-3 pl-12">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div class="space-y-1">
                  <label class="text-xs font-medium text-muted-foreground">Brand Name</label>
                  <UiInput v-model="localIdentity.name" placeholder="Acme Corp" />
                </div>
                <div class="space-y-1">
                  <label class="text-xs font-medium text-muted-foreground">Tagline</label>
                  <UiInput v-model="localIdentity.tagline" placeholder="Build something amazing" />
                </div>
              </div>
              <div class="space-y-1">
                <label class="text-xs font-medium text-muted-foreground">Description</label>
                <UiTextarea v-model="localIdentity.description" placeholder="What does your brand do?" :rows="2" />
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div class="space-y-1">
                  <label class="text-xs font-medium text-muted-foreground">Mission</label>
                  <UiTextarea v-model="localIdentity.mission" placeholder="Our mission is..." :rows="2" />
                </div>
                <div class="space-y-1">
                  <label class="text-xs font-medium text-muted-foreground">Vision</label>
                  <UiTextarea v-model="localIdentity.vision" placeholder="We envision a world where..." :rows="2" />
                </div>
              </div>
              <!-- Values -->
              <div class="space-y-1">
                <label class="text-xs font-medium text-muted-foreground">Core Values</label>
                <div class="flex flex-wrap gap-1.5 mb-1.5">
                  <span
                    v-for="(val, i) in localIdentity.values"
                    :key="i"
                    class="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                    {{ val }}
                    <button class="hover:text-destructive" @click="removeFromList(localIdentity.values, i)">
                      <Icon name="lucide:x" class="h-3 w-3" />
                    </button>
                  </span>
                </div>
                <div class="flex gap-2">
                  <UiInput
                    v-model="newValue"
                    placeholder="Add a value..."
                    class="flex-1"
                    @keydown.enter.prevent="addToList(localIdentity.values, newValue); newValue = ''"
                  />
                  <UiButton
                    variant="outline"
                    size="sm"
                    :disabled="!newValue.trim()"
                    @click="addToList(localIdentity.values, newValue); newValue = ''">
                    Add
                  </UiButton>
                </div>
              </div>
            </div>
          </div>
        </UiCardContent>
      </UiCard>

      <!-- ─── Voice ─────────────────────────────────────────────── -->
      <UiCard>
        <UiCardContent class="p-0">
          <div class="px-4 py-3 space-y-4">
            <div class="flex items-center gap-3">
              <div class="flex size-9 items-center justify-center rounded-lg bg-amber-500/10">
                <Icon name="lucide:megaphone" class="size-4 text-amber-500" />
              </div>
              <div class="flex-1">
                <p class="text-foreground text-sm font-semibold">Voice</p>
                <p class="text-muted-foreground text-xs">Tone, personality, and writing guidelines for your brand.</p>
              </div>
              <UiButton variant="outline" size="xs" :disabled="isSaving" @click="saveVoice">
                Save
              </UiButton>
            </div>

            <div class="space-y-3 pl-12">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div class="space-y-1">
                  <label class="text-xs font-medium text-muted-foreground">Tone</label>
                  <UiSelect v-model="localVoice.tone">
                    <UiSelectTrigger>
                      <UiSelectValue :placeholder="localVoice.tone || 'Select tone...'" />
                    </UiSelectTrigger>
                    <UiSelectContent>
                      <UiSelectItem v-for="t in ['professional', 'friendly', 'technical', 'playful', 'authoritative', 'casual', 'warm']" :key="t" :value="t">
                        {{ t.charAt(0).toUpperCase() + t.slice(1) }}
                      </UiSelectItem>
                    </UiSelectContent>
                  </UiSelect>
                </div>
                <div class="space-y-1">
                  <label class="text-xs font-medium text-muted-foreground">Audience</label>
                  <UiInput v-model="localVoice.audienceDescription" placeholder="Who are you talking to?" />
                </div>
              </div>
              <!-- Personality tags -->
              <div class="space-y-1">
                <label class="text-xs font-medium text-muted-foreground">Personality</label>
                <div class="flex flex-wrap gap-1.5 mb-1.5">
                  <span
                    v-for="(p, i) in localVoice.personality"
                    :key="i"
                    class="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400">
                    {{ p }}
                    <button class="hover:text-destructive" @click="removeFromList(localVoice.personality, i)">
                      <Icon name="lucide:x" class="h-3 w-3" />
                    </button>
                  </span>
                </div>
                <UiInput
                  placeholder="Add trait (press Enter)..."
                  @keydown.enter.prevent="addToList(localVoice.personality, ($event.target as HTMLInputElement).value); ($event.target as HTMLInputElement).value = ''"
                />
              </div>
            </div>
          </div>
        </UiCardContent>
      </UiCard>

      <!-- ─── Links ─────────────────────────────────────────────── -->
      <UiCard>
        <UiCardContent class="p-0">
          <div class="px-4 py-3 space-y-4">
            <div class="flex items-center gap-3">
              <div class="flex size-9 items-center justify-center rounded-lg bg-sky-500/10">
                <Icon name="lucide:link" class="size-4 text-sky-500" />
              </div>
              <div class="flex-1">
                <p class="text-foreground text-sm font-semibold">Links</p>
                <p class="text-muted-foreground text-xs">Website, email, and social profiles.</p>
              </div>
              <UiButton variant="outline" size="xs" :disabled="isSaving" @click="saveLinks">
                Save
              </UiButton>
            </div>

            <div class="space-y-3 pl-12">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div class="space-y-1">
                  <label class="text-xs font-medium text-muted-foreground">Website</label>
                  <UiInput v-model="localLinks.website" placeholder="https://example.com" />
                </div>
                <div class="space-y-1">
                  <label class="text-xs font-medium text-muted-foreground">Email</label>
                  <UiInput v-model="localLinks.email" placeholder="hello@example.com" />
                </div>
              </div>
              <!-- Social links -->
              <div class="space-y-2">
                <div class="flex items-center justify-between">
                  <label class="text-xs font-medium text-muted-foreground">Social Profiles</label>
                  <UiButton variant="ghost" size="xs" @click="addSocialLink">
                    <Icon name="lucide:plus" class="h-3 w-3 mr-1" />
                    Add
                  </UiButton>
                </div>
                <div
                  v-for="(link, i) in localLinks.social"
                  :key="i"
                  class="flex items-center gap-2">
                  <UiInput v-model="link.platform" placeholder="Platform" class="w-32" />
                  <UiInput v-model="link.url" placeholder="https://..." class="flex-1" />
                  <button class="text-muted-foreground hover:text-destructive shrink-0" @click="removeSocialLink(i)">
                    <Icon name="lucide:trash-2" class="h-3.5 w-3.5" />
                  </button>
                </div>
                <p v-if="localLinks.social.length === 0" class="text-xs text-muted-foreground/60">
                  No social links added yet.
                </p>
              </div>
            </div>
          </div>
        </UiCardContent>
      </UiCard>

      <!-- ─── Reset ─────────────────────────────────────────────── -->
      <div class="flex justify-end pt-2">
        <UiButton variant="ghost" size="sm" class="text-destructive hover:text-destructive" @click="handleReset">
          <Icon name="lucide:rotate-ccw" class="h-3.5 w-3.5 mr-1.5" />
          Reset to defaults
        </UiButton>
      </div>
    </div>
  </Page>
</template>
