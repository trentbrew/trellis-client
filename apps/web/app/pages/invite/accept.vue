<script lang="ts" setup>
  definePageMeta({
    layout: 'auth',
  })

  const route = useRoute()
  const db = useInstantDb()
  const { $toast } = useNuxtApp()

  // ── State ──────────────────────────────────────────────────────────
  const token = computed(() => (route.query.token as string) || '')
  const loading = ref(true)

  // Invite details from server (populated when token is present)
  const invite = ref<{
    email: string
    orgName: string
    worldName?: string
    inviterName: string
    role: string
    orgId?: string
    worldId?: string
  } | null>(null)

  // Whether the invite was already accepted
  const alreadyAccepted = ref(false)

  // Email input for tokenless flow
  const emailInput = ref('')

  // The email we're working with (from invite lookup or manual entry)
  const activeEmail = computed(() => invite.value?.email || emailInput.value.trim().toLowerCase())

  // OTP flow
  const step = ref<'welcome' | 'otp' | 'success'>('welcome')
  const otpCode = ref('')
  const otpSending = ref(false)
  const otpVerifying = ref(false)

  // ── Fetch invite details (only when token is present) ──────────────
  const fetchInvite = async () => {
    if (!token.value) {
      // No token — show the generic welcome screen with email input
      loading.value = false
      return
    }

    try {
      const resp = await $fetch(`/api/invite/${token.value}`)
      const data = resp as any

      if (data?.ok) {
        invite.value = data.invite

        if (data.status === 'already_accepted') {
          alreadyAccepted.value = true
        }
      }
    } catch (err: any) {
      // Token invalid — fall back to generic welcome (don't block the user)
      console.warn('[invite/accept] Token lookup failed:', err?.message)
    } finally {
      loading.value = false
    }
  }

  // ── Send magic code ────────────────────────────────────────────────
  const sendCode = async () => {
    if (!activeEmail.value || !activeEmail.value.includes('@')) {
      $toast?.error('Please enter a valid email address.')
      return
    }
    otpSending.value = true
    try {
      await db.auth.sendMagicCode({ email: activeEmail.value })
      step.value = 'otp'
      $toast?.success('Code sent! Check your email.')
    } catch (err: any) {
      console.error('[invite/accept] sendMagicCode error:', err)
      const msg = err?.body?.message || err?.message || ''
      if (msg.toLowerCase().includes('inactive')) {
        $toast?.error('This email has been marked inactive by the mail provider. Try a different email address.')
      } else {
        $toast?.error('Failed to send verification code. Please try again.')
      }
    } finally {
      otpSending.value = false
    }
  }

  // ── Verify code & resolve membership ───────────────────────────────
  const verifyCode = async () => {
    if (!activeEmail.value || !otpCode.value) return
    otpVerifying.value = true
    try {
      await db.auth.verifyMagicCode({
        email: activeEmail.value,
        code: otpCode.value,
      })

      // Wait for auth state to propagate
      const user = await waitForAuth()

      if (!user) {
        $toast?.error('Verification succeeded but session failed. Please try again.')
        otpVerifying.value = false
        return
      }

      // Resolve the invite — link user to the org and set up workspace context
      let resolvedOrgId: string | null = null
      try {
        const resolveResult = await $fetch('/api/resolve-invites', {
          method: 'POST',
          body: { userId: user.id, email: activeEmail.value },
        })
        const memberships = (resolveResult as any)?.memberships || []
        if (memberships.length > 0) {
          resolvedOrgId = memberships[0].orgId
        }
      } catch (resolveErr) {
        console.warn('[invite/accept] resolve-invites failed (non-fatal):', resolveErr)
      }

      // Fall back to the invite's orgId if resolve didn't return one
      invitedOrgId.value = resolvedOrgId || invite.value?.orgId || null

      // Seed the middleware cache
      const authInitialized = useState<boolean>('auth:initialized')
      authInitialized.value = false
      const cachedUser = useState<any>('auth:user')
      cachedUser.value = user

      step.value = 'success'
    } catch (err: any) {
      console.error('[invite/accept] verifyMagicCode error:', err)
      const msg = err?.body?.message || err?.message || ''
      if (msg.toLowerCase().includes('invalid') || msg.toLowerCase().includes('expired')) {
        $toast?.error('Invalid or expired code. Please try again.')
      } else {
        $toast?.error('Verification failed. Please check the code and try again.')
      }
      otpCode.value = ''
    } finally {
      otpVerifying.value = false
    }
  }

  // Org ID the user was invited to (set after resolve-invites succeeds)
  const invitedOrgId = ref<string | null>(null)

  // ── Navigate to workspace ──────────────────────────────────────────
  const enterWorkspace = async () => {
    if (invitedOrgId.value) {
      // Invited user — resolve-invites already set lastOrgId + onboardingComplete
      // on the server. Pass joinOrgId so the auth middleware can prioritize
      // the server-side resolver if the client SDK can't see the org yet.
      await navigateTo(`/welcome?joinOrgId=${invitedOrgId.value}`)
    } else {
      // No invite context — normal onboarding flow (create own workspace)
      await navigateTo('/onboarding')
    }
  }

  // ── Wait for auth (same pattern as login.vue) ─────────────────────
  function waitForAuth(timeoutMs = 5000): Promise<any | null> {
    return new Promise((resolve) => {
      let unsub: (() => void) | null = null
      const timer = setTimeout(() => {
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

  onMounted(() => {
    fetchInvite()
  })
</script>

<template>
  <div class="w-full max-w-md mx-auto">
    <!-- Loading -->
    <div v-if="loading" class="border-border bg-card rounded-xl border p-8 text-center">
      <div class="text-muted-foreground animate-pulse">Loading invite…</div>
    </div>

    <!-- Already accepted -->
    <div v-else-if="alreadyAccepted" class="border-border bg-card rounded-xl border p-8 text-center space-y-4">
      <div class="flex justify-center">
        <div class="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
          <Icon name="lucide:check" class="h-6 w-6 text-green-500" />
        </div>
      </div>
      <h3 class="text-foreground text-lg font-semibold">Already joined!</h3>
      <p class="text-muted-foreground text-sm">
        You've already accepted this invite to <strong>{{ invite?.orgName }}</strong>.
      </p>
      <NuxtLink to="/auth/login" class="text-primary text-sm hover:underline">
        Sign in to continue →
      </NuxtLink>
    </div>

    <!-- Step 1: Welcome / accept invite -->
    <div v-else-if="step === 'welcome'" class="border-border bg-card rounded-xl border p-8 space-y-6">
      <div class="text-center space-y-4">
        <div class="flex justify-center">
          <AppLogo size="48" />
        </div>
        <div class="space-y-2">
          <h3 class="text-foreground text-xl font-semibold">You're invited!</h3>
          <p v-if="invite" class="text-muted-foreground text-sm">
            <strong class="text-foreground">{{ invite.inviterName }}</strong>
            invited you to join
            <strong class="text-foreground">{{ invite.orgName }}</strong>
            on Trellis.
          </p>
          <p v-else class="text-muted-foreground text-sm">
            Someone has invited you to a workspace on Trellis.
            Enter your email to get started.
          </p>
        </div>
      </div>

      <!-- Invite details (when token provided) -->
      <div v-if="invite" class="bg-muted/30 rounded-lg p-4 space-y-2">
        <div class="flex items-center justify-between text-sm">
          <span class="text-muted-foreground">Email</span>
          <span class="text-foreground font-medium">{{ invite.email }}</span>
        </div>
        <div class="flex items-center justify-between text-sm">
          <span class="text-muted-foreground">Role</span>
          <span class="text-foreground font-medium capitalize">{{ invite.role }}</span>
        </div>
        <div class="flex items-center justify-between text-sm">
          <span class="text-muted-foreground">Workspace</span>
          <span class="text-foreground font-medium">{{ invite.orgName }}</span>
        </div>
      </div>

      <!-- Email input (when no token / generic flow) -->
      <div v-else class="space-y-2">
        <label class="text-foreground text-sm font-medium">Your email address</label>
        <input
          v-model="emailInput"
          type="email"
          placeholder="you@example.com"
          class="bg-background border-border text-foreground w-full rounded-lg border px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          @keydown.enter="sendCode"
        />
      </div>

      <div class="space-y-3">
        <UiButton
          class="w-full"
          :disabled="otpSending || (!invite && !emailInput.trim())"
          @click="sendCode"
        >
          {{ otpSending ? 'Sending code…' : 'Continue' }}
        </UiButton>
        <p class="text-muted-foreground text-center text-xs">
          We'll send a verification code to
          <strong v-if="invite">{{ invite.email }}</strong>
          <strong v-else-if="emailInput.trim()">{{ emailInput.trim() }}</strong>
          <span v-else>your email</span>
        </p>
      </div>

      <div class="text-center">
        <NuxtLink to="/auth/login" class="text-muted-foreground text-xs hover:text-foreground transition-colors">
          Already have an account? Sign in →
        </NuxtLink>
      </div>
    </div>

    <!-- Step 2: OTP entry -->
    <div v-else-if="step === 'otp'" class="border-border bg-card rounded-xl border p-8 space-y-6">
      <div class="text-center space-y-2">
        <div class="flex justify-center">
          <div class="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Icon name="lucide:mail" class="h-6 w-6 text-primary" />
          </div>
        </div>
        <h3 class="text-foreground text-lg font-semibold">Check your email</h3>
        <p class="text-muted-foreground text-sm">
          Enter the 6-digit code sent to <strong>{{ activeEmail }}</strong>
        </p>
      </div>

      <div class="space-y-4">
        <input
          v-model="otpCode"
          type="text"
          inputmode="numeric"
          maxlength="6"
          placeholder="000000"
          class="bg-background border-border text-foreground w-full rounded-lg border px-4 py-3 text-center text-2xl font-mono tracking-[0.5em] focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          @keydown.enter="verifyCode"
        />

        <UiButton
          class="w-full"
          :disabled="otpVerifying || otpCode.length < 6"
          @click="verifyCode"
        >
          {{ otpVerifying ? 'Verifying…' : 'Verify & join' }}
        </UiButton>

        <div class="flex items-center justify-center gap-2 text-xs">
          <span class="text-muted-foreground">Didn't get the code?</span>
          <button
            class="text-primary hover:underline"
            :disabled="otpSending"
            @click="sendCode"
          >
            Resend
          </button>
        </div>

        <div class="text-center">
          <button
            class="text-muted-foreground text-xs hover:text-foreground transition-colors"
            @click="step = 'welcome'; otpCode = ''"
          >
            ← Back
          </button>
        </div>
      </div>
    </div>

    <!-- Step 3: Success -->
    <div v-else-if="step === 'success'" class="border-border bg-card rounded-xl border p-8 space-y-6 text-center">
      <div class="space-y-4">
        <div class="flex justify-center">
          <div class="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
            <Icon name="lucide:party-popper" class="h-8 w-8 text-green-500" />
          </div>
        </div>
        <div class="space-y-2">
          <h3 v-if="invite?.orgName" class="text-foreground text-xl font-semibold">Welcome to {{ invite.orgName }}!</h3>
          <h3 v-else class="text-foreground text-xl font-semibold">You're in!</h3>
          <p class="text-muted-foreground text-sm">
            You've been verified successfully. Let's set up your account.
          </p>
        </div>
      </div>

      <UiButton class="w-full" @click="enterWorkspace">
        Get started
        <Icon name="lucide:arrow-right" class="ms-2 h-4 w-4" />
      </UiButton>
    </div>
  </div>
</template>
