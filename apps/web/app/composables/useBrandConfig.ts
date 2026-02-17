import type { BrandConfig } from '~/types/database'

/**
 * Reactive brand configuration for the current world.
 *
 * Persisted as a single JSON blob via `upsertAppSetting(appId, 'brandConfig', {...})`.
 * Subscribes to changes and re-fires when `currentApp` switches.
 */

const _brandConfig = ref<BrandConfig | null>(null)
const _loading = ref(false)
const _initialized = ref(false)

function createDefaultBrandConfig(name?: string): BrandConfig {
  return {
    logo: {},
    theme: {},
    identity: {
      name: name || 'My Brand',
    },
    voice: {},
    links: {},
    updatedAt: Date.now(),
  }
}

export function useBrandConfig() {
  const { currentApp, upsertAppSetting } = useInstantData()
  const { user } = useInstantAuth()
  const db = useInstantDb()

  // Subscribe to brand config setting for the current app
  if (import.meta.client) {
    const subscriptionStarted = useState<boolean>('brandConfig:subscriptionStarted', () => false)

    if (!subscriptionStarted.value) {
      subscriptionStarted.value = true

      let unsub: (() => void) | null = null

      watch(
        currentApp,
        (app) => {
          if (unsub) {
            unsub()
            unsub = null
          }

          if (!app) {
            _brandConfig.value = null
            _loading.value = false
            return
          }

          _loading.value = true
          const settingKey = `app:${app.id}:brandConfig`
          unsub = db.subscribeQuery(
            {
              settings: {
                $: {
                  where: { settingKey },
                },
              },
            },
            (result: any) => {
              const raw = (result.data as any)?.settings?.[0]?.value
              _brandConfig.value = raw && typeof raw === 'object' ? (raw as BrandConfig) : null
              _loading.value = false
              _initialized.value = true
            },
          )
        },
        { immediate: true },
      )
    }
  }

  const brandConfig = computed(() => _brandConfig.value)
  const loading = computed(() => _loading.value)
  const initialized = computed(() => _initialized.value)

  // Convenience getters
  const logoMark = computed(() => {
    const config = _brandConfig.value
    if (!config?.logo?.mark) return null
    return config.logo.mark
  })

  const logoMarkForMode = computed(() => {
    const config = _brandConfig.value
    if (!config?.logo) return null
    const colorMode = useColorMode()
    if (colorMode.value === 'dark' && config.logo.darkVariants?.mark) {
      return config.logo.darkVariants.mark
    }
    return config.logo.mark || null
  })

  const themePresetId = computed(() => _brandConfig.value?.theme?.presetId || null)
  const brandName = computed(() => _brandConfig.value?.identity?.name || currentApp.value?.name || '')

  /**
   * Update the brand config (partial merge).
   * Merges top-level keys so callers can update just `logo` or `voice` without clobbering the rest.
   */
  async function updateBrandConfig(patch: Partial<BrandConfig>): Promise<void> {
    const appId = currentApp.value?.id
    if (!appId) throw new Error('No application selected')

    const current = _brandConfig.value || createDefaultBrandConfig(currentApp.value?.name)
    const merged: BrandConfig = {
      ...current,
      ...patch,
      logo: { ...current.logo, ...patch.logo },
      theme: { ...current.theme, ...patch.theme },
      identity: { ...current.identity, ...patch.identity },
      voice: { ...current.voice, ...patch.voice },
      links: { ...current.links, ...patch.links },
      updatedAt: Date.now(),
      updatedBy: user.value?.id,
    }

    await upsertAppSetting(appId, 'brandConfig', merged)
  }

  /**
   * Reset brand config to defaults.
   */
  async function resetBrandConfig(): Promise<void> {
    const appId = currentApp.value?.id
    if (!appId) throw new Error('No application selected')

    const fresh = createDefaultBrandConfig(currentApp.value?.name)
    fresh.updatedBy = user.value?.id
    await upsertAppSetting(appId, 'brandConfig', fresh)
  }

  return {
    brandConfig,
    loading,
    initialized,

    // Convenience
    logoMark,
    logoMarkForMode,
    themePresetId,
    brandName,

    // Mutations
    updateBrandConfig,
    resetBrandConfig,
    createDefaultBrandConfig,
  }
}
