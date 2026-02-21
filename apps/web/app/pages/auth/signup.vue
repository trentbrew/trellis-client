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

  const GOOGLE_CLIENT_ID = config.public.googleClientId || ''
  const GOOGLE_CLIENT_NAME = 'google-web'

  const nonce = ref(crypto.randomUUID())

  const showFriendlyAuthError = (err: any) => {
    const rawMessage = err?.body?.message || err?.message || ''
    const msg = String(rawMessage)

    if (msg.toLowerCase().includes('origin is not allowed')) {
      $toast?.error('Sign-up can’t start yet (not your fault).', {
        description: `Google OAuth is misconfigured for this URL. Add this site to the OAuth Client “Authorized JavaScript origins” (e.g. http://localhost:${devPort}), then refresh and try again.`,
      })
      return
    }

    $toast?.error('We couldn’t sign you up (not your fault).', {
      description: msg || 'Please try again in a moment. If it keeps happening, refresh the page and try again.',
    })
  }

  /**
   * Wait for InstantDB's auth state to propagate after signInWithIdToken.
   * The HTTP call resolves before the WebSocket reconnects with the new
   * refresh token, so getAuth() returns null if we navigate immediately.
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
        if (auth?.user) {
          clearTimeout(timer)
          unsub?.()
          resolve(auth.user)
        }
      })
    })
  }

  async function handleSignUpWithGoogle(response: any) {
    isLoading.value = true

    try {
      await db.auth.signInWithIdToken({
        clientName: GOOGLE_CLIENT_NAME,
        idToken: response.credential,
        nonce: nonce.value,
      })

      // Wait for InstantDB's internal auth state to propagate via WebSocket.
      // Returns the user object directly from subscribeAuth.
      const confirmedUser = await waitForAuth()

      if (!confirmedUser) {
        $toast?.error('Sign-up succeeded but session failed to initialize. Please try again.')
        isLoading.value = false
        return
      }

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
            Object.assign(confirmedUser, updates)
          } catch (err) {
            console.warn('[auth] Failed to persist Google profile to $users:', err)
          }
        }
      }

      // Seed the middleware cache with the confirmed user
      const authInitialized = useState<boolean>('auth:initialized')
      authInitialized.value = false
      const cachedUser = useState<any>('auth:user')
      cachedUser.value = confirmedUser

      // Use soft navigation — middleware will redirect to /onboarding for new users
      await navigateTo('/welcome')
    } catch (err: any) {
      console.error('Auth error:', err)
      showFriendlyAuthError(err)
    } finally {
      isLoading.value = false
    }
  }

  onMounted(() => {
    if (!import.meta.client) return

    if (!GOOGLE_CLIENT_ID) {
      $toast?.error('Google sign-up isn’t configured yet (not your fault).', {
        description: 'Set GOOGLE_CLIENT_ID in your .env file and restart the dev server.',
      })
      return
    }

    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true

    script.onerror = () => {
      $toast?.error('Google sign-up failed to load (not your fault).', {
        description:
          'Your browser blocked the sign-in script or the network request failed. Try disabling blockers or refreshing.',
      })
    }

    script.onload = () => {
      try {
        ;(window as any).google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleSignUpWithGoogle,
          nonce: nonce.value,
        })
        ;(window as any).google.accounts.id.renderButton(document.getElementById('google-signup-button'), {
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
    <div class="space-y-2 mb-6 text-center">
      <h3 class="text-foreground text-2xl font-semibold">Create your account</h3>
      <p class="text-muted-foreground text-sm">Sign up with Google to start using Trellis</p>
    </div>
    <div class="space-y-4">
      <div class="flex justify-center">
        <div id="google-signup-button"></div>
      </div>
      <p class="text-muted-foreground text-center text-xs">
        By continuing, you agree to our
        <button class="text-primary hover:underline">Terms of Service</button>
        and
        <button class="text-primary hover:underline">Privacy Policy</button>
      </p>
      <div class="text-muted-foreground text-center text-xs">
        Already have an account?
        <NuxtLink to="/auth/login" class="text-primary hover:underline">Sign in</NuxtLink>
      </div>
      <div v-if="isLoading" class="text-muted-foreground text-center text-xs">Starting sign-up…</div>
    </div>
  </div>
</template>
