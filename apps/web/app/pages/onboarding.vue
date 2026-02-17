<script lang="ts" setup>
  import type { Organization } from '~/types/database'

  definePageMeta({
    layout: 'onboarding',
    middleware: ['auth'],
  })

  const instant = useInstantDb()
  const { $toast } = useNuxtApp()
  const { signOut } = useInstantAuth()

  const handleLogout = async () => {
    await signOut()
    await navigateTo('/auth/login')
  }

  // Use useState directly — do NOT import useInstantData() here because it
  // auto-creates a default org/app, bypassing the onboarding wizard.
  const currentOrg = useState<any>('currentOrg')
  const currentApp = useState<any>('currentApp')
  const cachedUser = useState<any>('auth:user')

  // ── Flow detection ─────────────────────────────────────────────────
  // 'loading' while we check memberships, then 'member' or 'owner'
  type OnboardingFlow = 'loading' | 'member' | 'owner'
  const flow = ref<OnboardingFlow>('loading')

  // Membership data (populated for invited members)
  const membership = ref<{
    id: string
    orgId: string
    orgName: string
    role: string
    inviterName: string
  } | null>(null)

  // ── Shared state ───────────────────────────────────────────────────
  const open = ref(true)
  const canClose = ref(false)
  const isSubmitting = ref(false)
  const errorMessage = ref<string | null>(null)
  const displayName = ref('')

  // ── Owner flow state ───────────────────────────────────────────────
  const newOrgName = ref('')
  const newAppName = ref('')
  const inviteEmails = ref<string[]>([])
  const inviteInput = ref('')
  const inviteSending = ref(false)
  const inviteResults = ref<{ email: string; status: string; message?: string; inviteToken?: string; inviteUrl?: string }[]>([])

  // ── Step management ────────────────────────────────────────────────
  // Member flow:  1=welcome  2=profile  3=done (redirect)
  // Owner flow:   1=welcome  2=org      3=app  4=invite
  const step = ref(1)
  const totalSteps = computed(() => flow.value === 'member' ? 2 : 4)

  // ── Resolve user ───────────────────────────────────────────────────
  async function resolveUser(): Promise<any | null> {
    const fromGetAuth = await instant.getAuth()
    if (fromGetAuth) return fromGetAuth
    if (cachedUser.value) return cachedUser.value

    return new Promise((resolve) => {
      let unsub: (() => void) | null = null
      const timer = setTimeout(() => { unsub?.(); resolve(null) }, 3000)
      unsub = instant.subscribeAuth((auth: any) => {
        if (auth?.user) { clearTimeout(timer); unsub?.(); resolve(auth.user) }
      })
    })
  }

  // ── Detect flow on mount ───────────────────────────────────────────
  onMounted(async () => {
    const user = await resolveUser()
    if (!user?.email) {
      flow.value = 'owner'
      return
    }

    // Pre-fill display name from user profile if available
    if (user.name) displayName.value = user.name

    try {
      const resp = await $fetch('/api/memberships', {
        params: { email: user.email },
      })
      const memberships = (resp as any)?.memberships || []
      // Find the first pending or active membership
      const pending = memberships.find((m: any) => m.status === 'pending')
      const active = memberships.find((m: any) => m.status === 'active')
      const match = pending || active

      if (match) {
        membership.value = match
        flow.value = 'member'

        // Resolve the invite immediately so the member record gets linked
        try {
          await $fetch('/api/resolve-invites', {
            method: 'POST',
            body: { userId: user.id, email: user.email },
          })
        } catch (err) {
          console.warn('[onboarding] resolve-invites failed (non-fatal):', err)
        }
      } else {
        flow.value = 'owner'
      }
    } catch (err) {
      console.warn('[onboarding] memberships check failed:', err)
      // Safety: if the API call fails, check if this user already has a lastOrgId
      // setting — if so, they were previously set up as a member and should NOT
      // be allowed to create a new org. Redirect them to /welcome instead.
      try {
        const settingResp = await instant.queryOnce({
          settings: {
            $: { where: { settingKey: `user:${user.id}:lastOrgId` } },
          },
        })
        const lastOrgSetting = (settingResp.data as any)?.settings?.[0]?.value
        if (typeof lastOrgSetting === 'string' && lastOrgSetting) {
          console.warn('[onboarding] User has lastOrgId but memberships API failed — redirecting to /welcome')
          await navigateTo('/welcome')
          return
        }
      } catch {
        // Fall through to owner flow as last resort
      }
      flow.value = 'owner'
    }
  })

  // ── Helpers ────────────────────────────────────────────────────────
  const generateSlug = (value: string) => {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
  }

  const upsertInstantSetting = async (
    ownerId: string,
    entityType: 'user' | 'org' | 'app',
    entityId: string,
    key: string,
    value: any,
  ) => {
    const tx = instant.tx as any
    const settingKey = `${entityType}:${entityId}:${key}`

    const resp = await instant.queryOnce({
      settings: {
        $: {
          where: { settingKey },
        },
      },
    })

    const existing = (resp.data as any)?.settings?.[0]
    const now = Date.now()

    if (existing?.id) {
      await instant.transact([
        tx.settings[existing.id].update({
          ownerId, entityType, entityId, key, value, updatedAt: now,
        }),
      ])
      return
    }

    const id = crypto.randomUUID()
    await instant.transact([
      tx.settings[id].create({
        ownerId, settingKey, entityType, entityId, key, value, updatedAt: now,
      }),
    ])
  }

  // ── Member flow: complete onboarding ───────────────────────────────
  const completeMemberOnboarding = async () => {
    if (isSubmitting.value) return
    isSubmitting.value = true
    errorMessage.value = null

    try {
      const user = await resolveUser()
      if (!user) {
        errorMessage.value = 'Session expired. Please sign in again.'
        return
      }

      // Update the member record with the display name
      if (displayName.value.trim() && membership.value?.id) {
        try {
          const tx = instant.tx as any
          await instant.transact([
            tx.members[membership.value.id].update({
              name: displayName.value.trim(),
            }),
          ])
        } catch (err) {
          console.warn('[onboarding] Failed to update member name (non-fatal):', err)
        }
      }

      // Mark onboarding complete and set the org from the membership
      const orgId = membership.value?.orgId
      if (orgId) {
        await upsertInstantSetting(user.id, 'user', user.id, 'onboardingComplete', true)
        await upsertInstantSetting(user.id, 'user', user.id, 'lastOrgId', orgId)

        // Try to find an app in this org to set as lastAppId
        try {
          const appResp = await instant.queryOnce({
            applications: {
              $: { where: { orgId } },
            },
          })
          const apps = (appResp.data as any)?.applications || []
          if (apps.length > 0) {
            await upsertInstantSetting(user.id, 'user', user.id, 'lastAppId', apps[0].id)
          }
        } catch {
          // Non-fatal — app will be resolved by middleware
        }
      } else {
        await upsertInstantSetting(user.id, 'user', user.id, 'onboardingComplete', true)
      }

      canClose.value = true

      // Invalidate middleware cache
      const authInitialized = useState<boolean>('auth:initialized')
      authInitialized.value = false

      open.value = false
      await navigateTo('/welcome')
    } catch (err: any) {
      errorMessage.value = err?.message || 'Failed to complete setup'
      console.error('[onboarding] member flow error:', err)
    } finally {
      isSubmitting.value = false
    }
  }

  // ── Owner flow: create org + app ───────────────────────────────────
  const syncOnboardingToInstant = async (params: {
    userId: string
    org: Organization
    app: any
    homeCollection?: any | null
  }) => {
    const { userId, org, app, homeCollection } = params
    const tx = instant.tx as any

    await upsertInstantSetting(userId, 'user', userId, 'onboardingComplete', true)
    await upsertInstantSetting(userId, 'user', userId, 'lastOrgId', org.id)
    await upsertInstantSetting(userId, 'user', userId, 'lastAppId', app.id)

    // Create owner member record alongside the org
    const ownerMemberId = crypto.randomUUID()

    const chunks: any[] = [
      tx.organizations[org.id].update({
        ownerId: userId,
        name: org.name,
        slug: org.slug,
        avatar: (org as any).avatar,
        plan: org.plan,
        createdAt: org.createdAt,
        updatedAt: org.updatedAt,
      }),
      tx.members[ownerMemberId].update({
        ownerId: userId,
        orgId: org.id,
        userId,
        name: org.name,
        role: 'owner',
        status: 'active',
        invitedAt: org.createdAt,
        joinedAt: org.createdAt,
        orgName: org.name,
      }),
      tx.organizations[org.id].link({ members: ownerMemberId }),
      tx.applications[app.id].update({
        ownerId: userId,
        orgId: org.id,
        name: app.name,
        slug: app.slug,
        icon: app.icon,
        color: app.color,
        description: app.description,
        createdAt: app.createdAt,
        updatedAt: app.updatedAt,
      }),
      tx.applications[app.id].link({ organization: org.id }),
    ]

    if (homeCollection?.id) {
      chunks.push(
        tx.collections[homeCollection.id].update({
          ownerId: userId,
          appId: app.id,
          parentId: homeCollection.parentId,
          title: homeCollection.title,
          slug: homeCollection.slug,
          icon: homeCollection.icon,
          type: homeCollection.type,
          order: homeCollection.order,
          isPublished: homeCollection.isPublished,
          createdBy: homeCollection.createdBy,
          createdAt: homeCollection.createdAt,
          updatedAt: homeCollection.updatedAt,
        }),
        tx.collections[homeCollection.id].link({ application: app.id }),
      )
    }

    await instant.transact(chunks)

    await instant.queryOnce({
      organizations: {
        $: { where: { ownerId: userId } },
        applications: { collections: {} },
      },
    })
  }

  const handleOwnerSubmit = async () => {
    if (isSubmitting.value) return
    errorMessage.value = null

    const orgName = newOrgName.value.trim()
    const appName = newAppName.value.trim()
    if (!orgName) { errorMessage.value = 'Please enter a workspace name.'; return }
    if (!appName) { errorMessage.value = 'Please enter an app name.'; return }

    isSubmitting.value = true
    try {
      const user = await resolveUser()
      if (!user) {
        errorMessage.value = 'Session expired. Please sign in again.'
        isSubmitting.value = false
        return
      }

      const now = Date.now()
      const orgId = crypto.randomUUID()
      const appId = crypto.randomUUID()
      const org: Organization = {
        id: orgId,
        ownerId: user.id,
        name: orgName,
        slug: generateSlug(orgName) || crypto.randomUUID(),
        plan: 'free',
        createdAt: now,
        updatedAt: now,
      }
      const app = {
        id: appId,
        orgId,
        name: appName,
        slug: generateSlug(appName) || crypto.randomUUID(),
        icon: 'lucide:layout',
        color: 'bg-primary',
        description: 'Workspace app',
        createdAt: now,
        updatedAt: now,
      }
      const homeCollection = {
        id: crypto.randomUUID(),
        appId,
        parentId: null,
        title: 'Home',
        slug: 'home',
        icon: 'lucide:home',
        type: 'database',
        order: 1,
        isPublished: true,
        createdBy: user.id,
        createdAt: now,
        updatedAt: now,
      }

      currentOrg.value = org
      currentApp.value = app

      await syncOnboardingToInstant({ userId: user.id, org, app, homeCollection })

      newOrgName.value = ''
      newAppName.value = ''
      canClose.value = true

      const authInitialized = useState<boolean>('auth:initialized')
      authInitialized.value = false

      step.value = 4
    } catch (err: any) {
      errorMessage.value = err?.message || 'Onboarding failed'
      console.error('[onboarding] owner flow error:', err)
    } finally {
      isSubmitting.value = false
    }
  }

  // ── Invite helpers ─────────────────────────────────────────────────
  const addInviteEmail = () => {
    const raw = inviteInput.value.trim().toLowerCase()
    if (!raw) return
    const currentUserEmail = cachedUser.value?.email?.toLowerCase()
    const emails = raw.split(/[,;\s]+/).filter((e) => {
      if (!e.includes('@') || inviteEmails.value.includes(e)) return false
      if (currentUserEmail && e === currentUserEmail) {
        $toast?.error('You cannot invite yourself')
        return false
      }
      return true
    })
    if (emails.length) inviteEmails.value.push(...emails)
    inviteInput.value = ''
  }

  const removeInviteEmail = (email: string) => {
    inviteEmails.value = inviteEmails.value.filter((e) => e !== email)
  }

  const sendInvites = async () => {
    if (!inviteEmails.value.length) return
    inviteSending.value = true
    inviteResults.value = []
    try {
      const user = await resolveUser()
      const resp = await $fetch('/api/invite', {
        method: 'POST',
        body: {
          emails: inviteEmails.value,
          orgId: currentOrg.value?.id,
          orgName: currentOrg.value?.name || '',
          appId: currentApp.value?.id,
          worldId: currentApp.value?.id || '',
          worldName: currentApp.value?.name || '',
          inviterId: user?.id,
          inviterName: user?.name || user?.email,
        },
      })
      inviteResults.value = (resp as any)?.results || []
    } catch (err: any) {
      console.error('[onboarding] invite error:', err)
      errorMessage.value = err?.message || 'Failed to send invites'
    } finally {
      inviteSending.value = false
    }
  }

  const copyInviteUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url)
      $toast?.success('Invite link copied!')
    } catch {
      $toast?.error('Failed to copy link')
    }
  }

  const finishOnboarding = async () => {
    open.value = false
    await navigateTo('/welcome')
  }

  // ── Step content ───────────────────────────────────────────────────
  const ownerStepContent = [
    {
      title: 'Welcome to Trellis',
      description: 'Your personal knowledge graph starts here. Let\'s set up your workspace in a few quick steps.',
    },
    {
      title: 'Name your workspace',
      description: 'This is where your team will collaborate. You can change this later.',
    },
    {
      title: 'Create your first app',
      description: 'Apps are how you organize different projects and workflows within your workspace.',
    },
    {
      title: 'Invite your team',
      description: 'Collaboration is better together. Add teammates by email — they\'ll get a link to join.',
    },
  ]

  const memberStepContent = computed(() => [
    {
      title: `Welcome to ${membership.value?.orgName || 'Trellis'}`,
      description: membership.value?.inviterName
        ? `${membership.value.inviterName} invited you to collaborate. Let's get you set up.`
        : 'You\'ve been invited to collaborate. Let\'s get you set up.',
    },
    {
      title: 'Tell us about yourself',
      description: 'How should your teammates know you? This helps everyone collaborate better.',
    },
  ])

  const activeStepContent = computed(() =>
    flow.value === 'member' ? memberStepContent.value : ownerStepContent,
  )

  // ── Navigation ─────────────────────────────────────────────────────
  const validateStep = () => {
    errorMessage.value = null

    if (flow.value === 'owner') {
      if (step.value === 2 && !newOrgName.value.trim()) {
        errorMessage.value = 'Please enter a workspace name.'
        return false
      }
      if (step.value === 3 && !newAppName.value.trim()) {
        errorMessage.value = 'Please enter an app name.'
        return false
      }
    }

    return true
  }

  const goNext = async () => {
    if (!validateStep()) return

    // ── Member flow ──────────────────────────────────────────────
    if (flow.value === 'member') {
      if (step.value === 2) {
        await completeMemberOnboarding()
        return
      }
      step.value += 1
      return
    }

    // ── Owner flow ───────────────────────────────────────────────
    if (step.value === 3) {
      await handleOwnerSubmit()
      return
    }

    if (step.value === 4) {
      if (inviteEmails.value.length > 0) await sendInvites()
      await finishOnboarding()
      return
    }

    if (step.value < totalSteps.value) step.value += 1
  }

  const goPrev = () => {
    if (flow.value === 'owner' && step.value === 4) return
    if (step.value > 1) step.value -= 1
  }

  const handleUpdateOpen = (next: boolean) => {
    if (next) { open.value = true; return }
    open.value = canClose.value
  }
</script>

<template>
  <div class="flex min-h-screen items-center justify-center p-4">
    <UiDialog :open="open" @update:open="handleUpdateOpen">
      <UiDialogContent
        class="w-[min(560px,calc(100vw-2rem))]! gap-0 overflow-x-clip rounded-2xl border border-border bg-card p-0 shadow-2xl [&>button:last-child]:text-white"
        :hide-close="true"
        @escape-key-down.prevent
        @pointer-down-outside.prevent
        @interact-outside.prevent
      >
        <!-- Loading state -->
        <div v-if="flow === 'loading'" class="flex flex-col items-center justify-center py-20 px-8">
          <div class="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p class="mt-4 text-sm text-muted-foreground">Preparing your experience...</p>
        </div>

        <!-- Main content -->
        <div v-else class="space-y-8 px-8 pt-8 pb-8">
          <!-- Header -->
          <div class="flex items-start justify-between">
            <Transition mode="out-in">
              <div :key="`${flow}-${step}`" class="flex-1 space-y-2">
                <!-- Logo + step indicator -->
                <div class="flex items-center gap-3 mb-4">
                  <AppLogo size="36" />
                  <div class="flex items-center gap-1.5">
                    <div
                      v-for="(_, index) in Array(totalSteps)"
                      :key="index"
                      :class="[
                        'h-1.5 rounded-full transition-all duration-300',
                        index + 1 === step ? 'w-6 bg-primary' : index + 1 < step ? 'w-1.5 bg-primary/40' : 'w-1.5 bg-muted',
                      ]"
                    />
                  </div>
                </div>
                <UiDialogHeader class="space-y-1.5 p-0">
                  <UiDialogTitle class="text-xl font-semibold tracking-tight">
                    {{ activeStepContent[step - 1]?.title }}
                  </UiDialogTitle>
                  <UiDialogDescription class="text-sm text-muted-foreground leading-relaxed">
                    {{ activeStepContent[step - 1]?.description }}
                  </UiDialogDescription>
                </UiDialogHeader>
              </div>
            </Transition>
            <button
              type="button"
              class="shrink-0 mt-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              @click="handleLogout">
              Sign out
            </button>
          </div>

          <!-- Error -->
          <div v-if="errorMessage" class="rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">
            {{ errorMessage }}
          </div>

          <!-- ═══════════════════════════════════════════════════════ -->
          <!-- MEMBER FLOW                                            -->
          <!-- ═══════════════════════════════════════════════════════ -->
          <template v-if="flow === 'member'">
            <!-- Step 1: Welcome -->
            <div v-if="step === 1" class="space-y-6">
              <div class="rounded-xl border border-border bg-muted/20 p-5 space-y-4">
                <div class="flex items-center gap-3">
                  <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <Icon name="lucide:building-2" class="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div class="text-sm font-medium text-foreground">{{ membership?.orgName || 'Workspace' }}</div>
                    <div class="text-xs text-muted-foreground capitalize">Joining as {{ membership?.role || 'member' }}</div>
                  </div>
                </div>
                <p class="text-sm text-muted-foreground leading-relaxed">
                  Trellis is a personal knowledge graph that helps teams organize ideas, tasks, and projects
                  in a connected, visual way. Think of it as your team's second brain.
                </p>
              </div>

              <div class="rounded-lg border border-border/50 bg-muted/10 p-4 space-y-3">
                <div class="text-xs font-medium text-muted-foreground uppercase tracking-wide">What you'll be able to do</div>
                <div class="grid gap-2.5">
                  <div class="flex items-start gap-2.5">
                    <Icon name="lucide:check-circle" class="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                    <span class="text-sm text-foreground">Create and manage tasks, notes, and documents</span>
                  </div>
                  <div class="flex items-start gap-2.5">
                    <Icon name="lucide:check-circle" class="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                    <span class="text-sm text-foreground">Collaborate with your team in real time</span>
                  </div>
                  <div class="flex items-start gap-2.5">
                    <Icon name="lucide:check-circle" class="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                    <span class="text-sm text-foreground">Visualize connections between your work</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Step 2: Profile -->
            <div v-else-if="step === 2" class="space-y-6">
              <div class="space-y-4">
                <div class="space-y-2">
                  <label class="text-sm font-medium text-foreground">Display name</label>
                  <input
                    v-model="displayName"
                    type="text"
                    placeholder="How should your team know you?"
                    class="bg-background border-border text-foreground placeholder:text-muted-foreground w-full rounded-lg border px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    @keydown.enter="goNext"
                  />
                  <p class="text-xs text-muted-foreground">This will be visible to other members of the workspace.</p>
                </div>
              </div>

              <div class="rounded-lg border border-border/50 bg-muted/10 p-4">
                <div class="flex items-start gap-3">
                  <Icon name="lucide:info" class="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <p class="text-xs text-muted-foreground leading-relaxed">
                    You can always update your profile, create your own workspace, or adjust your preferences
                    later from Settings.
                  </p>
                </div>
              </div>
            </div>
          </template>

          <!-- ═══════════════════════════════════════════════════════ -->
          <!-- OWNER FLOW                                             -->
          <!-- ═══════════════════════════════════════════════════════ -->
          <template v-else-if="flow === 'owner'">
            <!-- Step 1: Welcome -->
            <div v-if="step === 1" class="space-y-6">
              <div class="rounded-xl border border-border bg-muted/20 p-5 space-y-4">
                <p class="text-sm text-muted-foreground leading-relaxed">
                  Trellis is a personal knowledge graph that helps you organize ideas, tasks, and projects
                  in a connected, visual way. Think of it as your second brain — everything linked, nothing lost.
                </p>
              </div>

              <div class="rounded-lg border border-border/50 bg-muted/10 p-4 space-y-3">
                <div class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Here's what we'll set up</div>
                <div class="grid gap-2.5">
                  <div class="flex items-start gap-2.5">
                    <div class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary mt-0.5">1</div>
                    <span class="text-sm text-foreground">Create your workspace</span>
                  </div>
                  <div class="flex items-start gap-2.5">
                    <div class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary mt-0.5">2</div>
                    <span class="text-sm text-foreground">Name your first app</span>
                  </div>
                  <div class="flex items-start gap-2.5">
                    <div class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary mt-0.5">3</div>
                    <span class="text-sm text-foreground">Invite your team (optional)</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Step 2: Organization -->
            <div v-else-if="step === 2" class="space-y-6">
              <div class="space-y-2">
                <label class="text-sm font-medium text-foreground">Workspace name</label>
                <input
                  v-model="newOrgName"
                  type="text"
                  placeholder="e.g. Acme Inc, My Studio, Personal"
                  class="bg-background border-border text-foreground placeholder:text-muted-foreground w-full rounded-lg border px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  @keydown.enter="goNext"
                />
                <p class="text-xs text-muted-foreground">
                  This is the name of your organization or team. Everyone you invite will see this.
                </p>
              </div>
            </div>

            <!-- Step 3: Application -->
            <div v-else-if="step === 3" class="space-y-6">
              <div class="space-y-2">
                <label class="text-sm font-medium text-foreground">App name</label>
                <input
                  v-model="newAppName"
                  type="text"
                  placeholder="e.g. Product Roadmap, Design System, Wiki"
                  class="bg-background border-border text-foreground placeholder:text-muted-foreground w-full rounded-lg border px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  @keydown.enter="goNext"
                />
                <p class="text-xs text-muted-foreground">
                  Apps help you organize different projects within your workspace. You can create more later.
                </p>
              </div>
            </div>

            <!-- Step 4: Invite team -->
            <div v-else-if="step === 4" class="space-y-6">
              <div class="space-y-2">
                <label class="text-sm font-medium text-foreground">Email addresses</label>
                <div class="flex gap-2">
                  <input
                    v-model="inviteInput"
                    type="email"
                    placeholder="teammate@company.com"
                    class="bg-background border-border text-foreground placeholder:text-muted-foreground flex-1 rounded-lg border px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    @keydown.enter.prevent="addInviteEmail"
                    @keydown.,="addInviteEmail"
                  />
                  <UiButton variant="outline" type="button" @click="addInviteEmail">
                    <Icon name="lucide:plus" class="h-4 w-4" />
                  </UiButton>
                </div>
                <p class="text-xs text-muted-foreground">Press Enter or comma to add. Separate multiple with commas.</p>
              </div>

              <div v-if="inviteEmails.length" class="flex flex-wrap gap-1.5">
                <span
                  v-for="email in inviteEmails"
                  :key="email"
                  class="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                  {{ email }}
                  <button
                    type="button"
                    class="ml-0.5 rounded-full p-0.5 hover:bg-primary/20 transition-colors"
                    @click="removeInviteEmail(email)">
                    <Icon name="lucide:x" class="h-3 w-3" />
                  </button>
                </span>
              </div>

              <div v-if="inviteResults.length" class="space-y-2">
                <div
                  v-for="result in inviteResults"
                  :key="result.email"
                  class="space-y-1">
                  <div class="flex items-center gap-2 text-xs">
                    <Icon
                      :name="result.status === 'sent' ? 'lucide:check-circle' : result.status === 'already_member' ? 'lucide:info' : 'lucide:alert-circle'"
                      :class="result.status === 'sent' ? 'text-emerald-500' : result.status === 'already_member' ? 'text-blue-400' : 'text-red-400'"
                      class="h-3.5 w-3.5 shrink-0" />
                    <span class="text-muted-foreground">{{ result.email }}</span>
                    <span v-if="result.message" class="text-muted-foreground/60">— {{ result.message }}</span>
                  </div>
                  <div v-if="result.inviteUrl" class="flex items-center gap-1.5 pl-5">
                    <input
                      :value="result.inviteUrl"
                      readonly
                      class="bg-muted/50 text-muted-foreground flex-1 rounded border border-border px-2 py-1 text-[10px] font-mono truncate"
                      @click="($event.target as HTMLInputElement).select()" />
                    <button
                      type="button"
                      class="shrink-0 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                      title="Copy invite link"
                      @click="copyInviteUrl(result.inviteUrl)">
                      <Icon name="lucide:copy" class="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>

              <div v-if="!inviteEmails.length && !inviteResults.length" class="rounded-lg border border-dashed border-border/50 p-6 text-center">
                <Icon name="lucide:users-round" class="mx-auto h-8 w-8 text-muted-foreground/40 mb-2" />
                <p class="text-xs text-muted-foreground">
                  No invites yet — you can always invite people later from the Members page.
                </p>
              </div>
            </div>
          </template>

          <!-- ═══════════════════════════════════════════════════════ -->
          <!-- FOOTER                                                 -->
          <!-- ═══════════════════════════════════════════════════════ -->
          <div class="flex items-center justify-between pt-2 border-t border-border/50">
            <div>
              <UiButton
                v-if="step > 1 && !(flow === 'owner' && step === 4)"
                variant="ghost"
                size="sm"
                type="button"
                @click="goPrev">
                <Icon name="lucide:arrow-left" class="-ms-1 me-1.5 h-4 w-4 opacity-60" />
                Back
              </UiButton>
            </div>

            <div class="flex items-center gap-2">
              <UiButton
                v-if="flow === 'owner' && step === 4 && !inviteEmails.length"
                variant="ghost"
                size="sm"
                type="button"
                @click="finishOnboarding">
                Skip for now
              </UiButton>

              <UiButton
                class="group"
                type="button"
                :disabled="isSubmitting || inviteSending"
                @click="goNext">
                <template v-if="flow === 'member' && step === 2">
                  {{ isSubmitting ? 'Setting up...' : 'Join workspace' }}
                </template>
                <template v-else-if="flow === 'owner' && step === 3">
                  {{ isSubmitting ? 'Creating...' : 'Create workspace' }}
                </template>
                <template v-else-if="flow === 'owner' && step === 4">
                  {{ inviteSending ? 'Sending...' : inviteEmails.length ? 'Send invites & finish' : 'Finish setup' }}
                </template>
                <template v-else>
                  Continue
                </template>
                <Icon
                  v-if="!isSubmitting && !inviteSending"
                  name="lucide:arrow-right"
                  class="ms-1.5 -me-0.5 h-4 w-4 opacity-60 transition-transform group-hover:translate-x-0.5"
                />
              </UiButton>
            </div>
          </div>
        </div>
      </UiDialogContent>
    </UiDialog>
  </div>
</template>
