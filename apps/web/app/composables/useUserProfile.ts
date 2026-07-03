type StoredProfileSettings = {
  bio?: string
  locale?: string
  timezone?: string
  emailNotifications?: boolean
  desktopNotifications?: boolean
  weeklyDigest?: boolean
}

function profileStorageKey(userId: string) {
  return `user-profile:${userId}`
}

function readStoredSettings(userId: string): StoredProfileSettings {
  if (!import.meta.client) return {}
  try {
    const raw = localStorage.getItem(profileStorageKey(userId))
    return raw ? (JSON.parse(raw) as StoredProfileSettings) : {}
  } catch {
    return {}
  }
}

function writeStoredSettings(userId: string, settings: StoredProfileSettings) {
  if (!import.meta.client) return
  localStorage.setItem(profileStorageKey(userId), JSON.stringify(settings))
}

export function useUserProfile() {
  const db = useInstantDb()
  const { user } = useInstantAuth()
  const { $toast } = useNuxtApp()

  const displayName = ref('')
  const bio = ref('')
  const avatarUrl = ref('')
  const locale = ref('en')
  const timezone = ref(
    import.meta.client ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'America/Los_Angeles',
  )
  const emailNotifications = ref(true)
  const desktopNotifications = ref(false)
  const weeklyDigest = ref(true)
  const isSaving = ref(false)

  const hydrate = () => {
    const current = user.value
    if (!current?.id) return

    displayName.value = current.name || ''
    avatarUrl.value = current.avatar || ''

    const stored = readStoredSettings(current.id)
    bio.value = stored.bio ?? ''
    locale.value = stored.locale ?? 'en'
    timezone.value = stored.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone
    emailNotifications.value = stored.emailNotifications ?? true
    desktopNotifications.value = stored.desktopNotifications ?? false
    weeklyDigest.value = stored.weeklyDigest ?? true
  }

  watch(user, hydrate, { immediate: true })

  const persistPreferences = () => {
    const current = user.value
    if (!current?.id) return

    writeStoredSettings(current.id, {
      bio: bio.value,
      locale: locale.value,
      timezone: timezone.value,
      emailNotifications: emailNotifications.value,
      desktopNotifications: desktopNotifications.value,
      weeklyDigest: weeklyDigest.value,
    })
  }

  watch([locale, timezone, emailNotifications, desktopNotifications, weeklyDigest], persistPreferences)

  async function saveProfile() {
    const current = user.value
    if (!current?.id) return

    isSaving.value = true
    try {
      db.updateCurrentUser?.({
        name: displayName.value.trim() || current.name,
        avatar: avatarUrl.value || null,
      })
      persistPreferences()
      $toast?.success('Profile saved')
    } finally {
      isSaving.value = false
    }
  }

  return {
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
  }
}
