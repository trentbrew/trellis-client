<script lang="ts" setup>
  import { useTrellisConfig } from '~/composables/useTrellisConfig'

  definePageMeta({
    layout: 'auth',
  })

  const db = useInstantDb()
  const config = useRuntimeConfig()
  const { getDevPort } = useTrellisConfig()
  const devPort = getDevPort()

  const { $toast } = useNuxtApp()

  const isLoading = ref(false)
  const devLoginEmail = ref('dev@trellis.local')
  const isDevLoginEnabled = computed(
    () => config.public.dataMode === 'cloud' && config.public.enableCloudDevLogin === true,
  )

  const GOOGLE_CLIENT_ID = config.public.googleClientId || ''
  const GOOGLE_CLIENT_NAME = 'google-web'

  const nonce = ref(crypto.randomUUID())

  const showFriendlyAuthError = (err: any) => {
    const rawMessage = err?.body?.message || err?.message || ''
    const msg = String(rawMessage)

    if (msg.toLowerCase().includes('origin is not allowed')) {
      $toast?.error('Sign-in can’t start yet (not your fault).', {
        description: `Google OAuth is misconfigured for this URL. Add this site to the OAuth Client “Authorized JavaScript origins” (e.g. http://localhost:${devPort}), then refresh and try again.`,
      })
      return
    }

    $toast?.error('We couldn’t sign you in (not your fault).', {
      description: msg || 'Please try again in a moment. If it keeps happening, refresh the page and try again.',
    })
  }

  /**
   * Wait for InstantDB's auth state to propagate after signInWithIdToken.
   * The HTTP call resolves before the WebSocket reconnects with the new
   * refresh token, so getAuth() returns null if we navigate immediately.
   * This polls subscribeAuth until a user appears (or times out).
   */
  function waitForAuth(timeoutMs = 5000): Promise<any | null> {
    return new Promise((resolve) => {
      let unsub: (() => void) | null = null
      const timer = setTimeout(() => {
        console.warn('[auth] waitForAuth timed out after', timeoutMs, 'ms')
        unsub?.()
        resolve(null)
      }, timeoutMs)

      unsub = db.subscribeAuth((auth: any) => {
        console.log('[auth] subscribeAuth fired:', { hasUser: !!auth?.user, userId: auth?.user?.id })
        if (auth?.user) {
          clearTimeout(timer)
          unsub?.()
          resolve(auth.user)
        }
      })
    })
  }

  async function handleSignInWithGoogle(response: any) {
    isLoading.value = true

    try {
      await db.auth.signInWithIdToken({
        clientName: GOOGLE_CLIENT_NAME,
        idToken: response.credential,
        nonce: nonce.value,
      })

      // Wait for InstantDB's internal auth state to propagate via WebSocket.
      // Returns the user object directly from subscribeAuth (not getAuth(),
      // which may still return null due to internal state lag).
      const confirmedUser = await waitForAuth()

      if (!confirmedUser) {
        $toast?.error('Sign-in succeeded but session failed to initialize. Please try again.')
        isLoading.value = false
        return
      }

      console.log('[auth] User confirmed, navigating:', confirmedUser.id)

      // Extract Google profile data (name, picture) from the JWT and
      // persist to the $users record so it's available app-wide.
      const profile = decodeGoogleJwt(response.credential)
      if (profile && confirmedUser.id) {
        const updates: Record<string, string> = {}
        if (profile.name) updates.name = profile.name
        if (profile.picture) updates.imageURL = profile.picture
        if (Object.keys(updates).length) {
          try {
            await db.transact(db.tx.$users[confirmedUser.id].update(updates))
            // Merge into the cached user so downstream sees it immediately
            Object.assign(confirmedUser, updates)
          } catch (err) {
            console.warn('[auth] Failed to persist Google profile to $users:', err)
          }
        }
      }

      // Seed the middleware cache with the confirmed user so it doesn't
      // need to call getAuth() (which may still return null).
      const authInitialized = useState<boolean>('auth:initialized')
      authInitialized.value = false
      const cachedUser = useState<any>('auth:user')
      cachedUser.value = confirmedUser

      // Soft navigation preserves the in-memory auth token.
      // /welcome triggers the global auth middleware which handles
      // onboarding checks, org/app setup, and demo seeding.
      await navigateTo('/welcome')
    } catch (err: any) {
      console.error('Auth error:', err)
      showFriendlyAuthError(err)
    } finally {
      isLoading.value = false
    }
  }

  async function handleDevCloudLogin() {
    if (!isDevLoginEnabled.value || !db.auth.signInWithCustomToken) return
    isLoading.value = true

    try {
      const result = await $fetch<{ token: string }>('/api/dev/cloud-login-token', {
        method: 'POST',
        body: { email: devLoginEmail.value },
      })

      await db.auth.signInWithCustomToken(result.token)
      const confirmedUser = await waitForAuth()

      if (!confirmedUser) {
        $toast?.error('Dev sign-in succeeded but session failed to initialize. Please try again.')
        return
      }

      const authInitialized = useState<boolean>('auth:initialized')
      authInitialized.value = false
      const cachedUser = useState<any>('auth:user')
      cachedUser.value = confirmedUser

      await navigateTo('/welcome')
    } catch (err: any) {
      console.error('Dev cloud auth error:', err)
      showFriendlyAuthError(err)
    } finally {
      isLoading.value = false
    }
  }

  onMounted(() => {
    if (!import.meta.client) return

    if (!GOOGLE_CLIENT_ID) {
      $toast?.error('Google sign-in isn’t configured yet (not your fault).', {
        description: 'Set GOOGLE_CLIENT_ID in your .env file and restart the dev server.',
      })
      return
    }

    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true

    script.onerror = () => {
      $toast?.error('Google sign-in failed to load (not your fault).', {
        description:
          'Your browser blocked the sign-in script or the network request failed. Try disabling blockers or refreshing.',
      })
    }

    script.onload = () => {
      try {
        ;(window as any).google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleSignInWithGoogle,
          nonce: nonce.value,
        })
        ;(window as any).google.accounts.id.renderButton(document.getElementById('google-signin-button'), {
          theme: 'outline',
          size: 'large',
          width: 400,
        })
      } catch (err: any) {
        showFriendlyAuthError(err)
      }
    }

    document.head.appendChild(script)
  })
</script>

<template>
  <div class="border-border bg-card mx-auto max-w-md rounded-xl border p-8">
    <div class="space-y-2 mb-6 text-center flex flex-col items-center justify-center gap-0">
      <AppLogo size="64" class="mb-6" />
      <h3 class="text-foreground text-2xl font-semibold">Sign in with Google</h3>
      <p class="text-muted-foreground text-sm">Use your Google account to access the app</p>
    </div>
    <div class="space-y-4">
      <div class="flex justify-center">
        <div id="google-signin-button"></div>
      </div>
      <p class="text-muted-foreground text-center text-xs">
        By continuing, you agree to our
        <button class="text-primary hover:underline">Terms of Service</button>
        and
        <button class="text-primary hover:underline">Privacy Policy</button>
      </p>
      <div v-if="isLoading" class="text-muted-foreground text-center text-xs">Starting sign-in…</div>
      <template v-if="isDevLoginEnabled">
        <div class="relative py-2">
          <div class="absolute inset-0 flex items-center">
            <span class="w-full border-t border-border" />
          </div>
          <div class="relative flex justify-center text-xs uppercase">
            <span class="bg-card px-2 text-muted-foreground">Dev only</span>
          </div>
        </div>
        <form class="space-y-2" @submit.prevent="handleDevCloudLogin">
          <label class="text-muted-foreground text-xs font-medium" for="cloud-dev-email">Cloud test email</label>
          <input
            id="cloud-dev-email"
            v-model="devLoginEmail"
            type="email"
            autocomplete="email"
            class="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
            placeholder="dev@trellis.local" />
          <button
            type="submit"
            class="bg-primary text-primary-foreground hover:bg-primary/90 flex h-9 w-full items-center justify-center rounded-md px-3 text-sm font-medium transition-colors disabled:opacity-50"
            :disabled="isLoading || !devLoginEmail">
            Sign in with cloud dev token
          </button>
        </form>
      </template>
    </div>
  </div>
</template>
