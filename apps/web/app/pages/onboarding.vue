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
  const isSubmitting = ref(false)
  const errorMessage = ref<string | null>(null)
  const displayName = ref('')

  // ── Slide direction for transitions ────────────────────────────────
  const slideDirection = ref<'forward' | 'back'>('forward')

  // ── Owner flow state ───────────────────────────────────────────────
  const newOrgName = ref('')
  const newAppName = ref('')
  const inviteEmails = ref<string[]>([])
  const inviteInput = ref('')
  const inviteSending = ref(false)
  const inviteResults = ref<{ email: string; status: string; message?: string; inviteToken?: string; inviteUrl?: string }[]>([])

  // ── Onboarding theme: force 'notion' + system dark/light for new users ────
  const themeStore = useThemeStore()
  const colorMode = useColorMode()

  onMounted(() => {
    colorMode.preference = 'system'
    const mode = (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') as 'light' | 'dark'
    themeStore.setPreset('notion', mode)

    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); goNext() }
      if (e.key === 'ArrowLeft') { e.preventDefault(); goPrev() }
    }
    window.addEventListener('keydown', onKey)
    onUnmounted(() => window.removeEventListener('keydown', onKey))
  })

  // ── Organization branding ───────────────────────────────────────
  const orgAvatar = ref<string | null>(null)
  const avatarInputRef = ref<HTMLInputElement | null>(null)

  const handleAvatarUpload = (e: Event) => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      $toast?.error('Logo image must be under 2 MB')
      return
    }
    const reader = new FileReader()
    reader.onload = (ev) => { orgAvatar.value = ev.target?.result as string }
    reader.readAsDataURL(file)
  }

  // ── World templates ───────────────────────────────────────────
  interface WorldTemplate { id: string; name: string; icon: string; description: string; color: string }

  const WORLD_TEMPLATES: WorldTemplate[] = [
    { id: 'blank',              name: 'Blank',          icon: 'lucide:sparkles',      description: 'Start from scratch',                color: 'text-muted-foreground' },
    { id: 'project-management', name: 'Projects',       icon: 'lucide:folder-kanban', description: 'Tasks, milestones & sprints',         color: 'text-blue-500' },
    { id: 'crm',                name: 'CRM',            icon: 'lucide:users',         description: 'Contacts, companies & deals',          color: 'text-emerald-500' },
    { id: 'knowledge',          name: 'Knowledge Base', icon: 'lucide:library',       description: 'Notes, bookmarks & reference docs',    color: 'text-violet-500' },
    { id: 'events',             name: 'Events',         icon: 'lucide:calendar-days', description: 'Events, venues & attendees',           color: 'text-amber-500' },
    { id: 'hr',                 name: 'HR',             icon: 'lucide:users-round',   description: 'Employees, departments & time-off',    color: 'text-rose-500' },
  ]

  const selectedTemplate = ref<string>('blank')

  const selectTemplate = (tpl: WorldTemplate) => {
    selectedTemplate.value = tpl.id
    // Pre-fill the world name only if it's empty or currently set to another template name
    const templateNames = new Set(WORLD_TEMPLATES.map((t) => t.name))
    if (!newAppName.value.trim() || templateNames.has(newAppName.value)) {
      newAppName.value = tpl.id === 'blank' ? '' : tpl.name
    }
  }

  // ── Step management ────────────────────────────────────────────────
  // Member flow:  1=welcome  2=profile  3=done (redirect)
  // Owner flow:   1=welcome  2=concepts  3=org  4=app  5=invite
  const step = ref(1)
  const totalSteps = computed(() => flow.value === 'member' ? 2 : 5)

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
    try {
      await instant.transact([
        tx.settings[id].create({
          ownerId, settingKey, entityType, entityId, key, value, updatedAt: now,
        }),
      ])
    } catch (err: any) {
      // Unique constraint violation — record exists but wasn't visible to queryOnce
      if (err?.message?.includes('unique') || err?.message?.includes('already exists')) {
        const retryResp = await instant.queryOnce({
          settings: { $: { where: { settingKey } } },
        })
        const retryExisting = (retryResp.data as any)?.settings?.[0]
        if (retryExisting?.id) {
          await instant.transact([
            tx.settings[retryExisting.id].update({
              ownerId, entityType, entityId, key, value, updatedAt: now,
            }),
          ])
          return
        }
      }
      throw err
    }
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

      // Invalidate middleware cache
      const authInitialized = useState<boolean>('auth:initialized')
      authInitialized.value = false

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
        name: displayName.value.trim() || (cachedUser.value?.name) || (cachedUser.value?.email) || 'Owner',
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
        accessLevel: app.accessLevel,
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
    const appName = newAppName.value.trim() || 'Default Space'
    if (!orgName) { errorMessage.value = 'Please enter a workspace name.'; return }

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
        avatar: orgAvatar.value || undefined,
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
        description: 'My first world',
        accessLevel: 'open',
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

      const authInitialized = useState<boolean>('auth:initialized')
      authInitialized.value = false

      step.value = 5
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
          role: 'member',
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
    await navigateTo('/welcome')
  }

  // ── Step content ───────────────────────────────────────────────────
  const ownerStepContent = [
    {
      title: 'Welcome to Trellis',
      description: 'A living knowledge graph for teams.',
    },
    {
      title: 'How it\'s organized',
      description: 'Trellis uses a simple, three-level structure to keep your work connected and clear.',
    },
    {
      title: 'Name your organization',
      description: 'This is the top-level container for your team. Everyone you invite will belong here.',
    },
    {
      title: 'Create your first world',
      description: 'Worlds organize your work into focused spaces — like a project, product, or team hub.',
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
      if (step.value === 3 && !newOrgName.value.trim()) {
        errorMessage.value = 'Please enter an organization name.'
        return false
      }
    }

    return true
  }

  const goNext = async () => {
    if (!validateStep()) return
    slideDirection.value = 'forward'

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
    if (step.value === 4) {
      await handleOwnerSubmit()
      return
    }

    if (step.value === 5) {
      if (inviteEmails.value.length > 0) await sendInvites()
      await finishOnboarding()
      return
    }

    if (step.value < totalSteps.value) step.value += 1
  }

  const goPrev = () => {
    if (flow.value === 'owner' && step.value === 5) return
    if (step.value > 1) {
      slideDirection.value = 'back'
      step.value -= 1
    }
  }

</script>

<template>
  <div class="relative z-10 flex min-h-dvh flex-col">

    <!-- ── Persistent chrome ──────────────────────────────────────── -->
    <header class="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-5 pointer-events-none">
      <div class="pointer-events-auto">
        <AppLogo size="32" />
      </div>
      <button
        type="button"
        class="pointer-events-auto text-xs text-muted-foreground hover:text-foreground transition-colors"
        @click="handleLogout">
        Sign out
      </button>
    </header>

    <!-- ── Loading state ──────────────────────────────────────────── -->
    <Transition name="ob-fade">
      <div v-if="flow === 'loading'" class="flex flex-1 flex-col items-center justify-center gap-4 min-h-dvh">
        <div class="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p class="text-sm text-muted-foreground">Preparing your experience...</p>
      </div>
    </Transition>

    <!-- ── Slide stage ─────────────────────────────────────────────── -->
    <div v-if="flow !== 'loading'" class="flex flex-1 flex-col">
      <Transition :name="slideDirection === 'forward' ? 'ob-slide-fwd' : 'ob-slide-back'" mode="out-in">
        <div
          :key="`${flow}-${step}`"
          class="flex flex-1 flex-col items-center justify-center px-6 py-24 min-h-dvh"
        >
          <div class="w-full max-w-lg mx-auto flex flex-col gap-8">

            <!-- Slide heading -->
            <div class="space-y-2 text-center">
              <h1 class="text-3xl font-bold tracking-tight text-foreground">
                {{ activeStepContent[step - 1]?.title }}
              </h1>
              <p class="text-base text-muted-foreground leading-relaxed">
                {{ activeStepContent[step - 1]?.description }}
              </p>
            </div>

            <!-- Error banner -->
            <Transition name="ob-fade">
              <div v-if="errorMessage" class="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400 text-center">
                {{ errorMessage }}
              </div>
            </Transition>

            <!-- ══════════════════════════════════════════════════════ -->
            <!-- MEMBER FLOW                                           -->
            <!-- ══════════════════════════════════════════════════════ -->
            <template v-if="flow === 'member'">

              <!-- Member Step 1: Welcome -->
              <div v-if="step === 1" class="space-y-4">
                <div class="rounded-2xl border border-border bg-card/60 backdrop-blur-sm p-6 space-y-4">
                  <div class="flex items-center gap-3">
                    <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <Icon name="lucide:building-2" class="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div class="text-sm font-semibold text-foreground">{{ membership?.orgName || 'Workspace' }}</div>
                      <div class="text-xs text-muted-foreground capitalize">Joining as {{ membership?.role || 'member' }}</div>
                    </div>
                  </div>
                  <p class="text-sm text-muted-foreground leading-relaxed">
                    Trellis is a living knowledge graph that helps teams organize ideas, tasks, and projects
                    in a connected, visual way. Think of it as your team's second brain.
                  </p>
                </div>

                <div class="rounded-2xl border border-border/50 bg-card/40 backdrop-blur-sm p-5 space-y-3">
                  <div class="text-xs font-semibold text-muted-foreground uppercase tracking-widest">What you'll be able to do</div>
                  <div class="grid gap-3">
                    <div class="flex items-start gap-3">
                      <Icon name="lucide:check-circle" class="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                      <span class="text-sm text-foreground">{{ membership?.role === 'guest' ? 'View content shared with you' : 'Create and manage tasks, notes, and documents' }}</span>
                    </div>
                    <div class="flex items-start gap-3">
                      <Icon name="lucide:check-circle" class="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                      <span class="text-sm text-foreground">{{ membership?.role === 'guest' ? 'Explore connected entities in the knowledge graph' : 'Collaborate with your team in real time' }}</span>
                    </div>
                    <div class="flex items-start gap-3">
                      <Icon name="lucide:check-circle" class="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                      <span class="text-sm text-foreground">{{ membership?.role === 'guest' ? 'Request access to additional content from admins' : 'Visualize connections between your work' }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Member Step 2: Profile -->
              <div v-else-if="step === 2" class="space-y-5">
                <div class="space-y-3">
                  <label class="text-sm font-medium text-foreground">Display name</label>
                  <input
                    v-model="displayName"
                    type="text"
                    autofocus
                    placeholder="How should your team know you?"
                    class="ob-input w-full rounded-xl border border-border bg-card/60 backdrop-blur-sm px-5 py-4 text-base text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    @keydown.enter="goNext"
                  />
                  <p class="text-xs text-muted-foreground">Visible to other members of the organization.</p>
                </div>
                <div class="flex items-start gap-3 rounded-xl border border-border/40 bg-muted/10 p-4">
                  <Icon name="lucide:info" class="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <p class="text-xs text-muted-foreground leading-relaxed">
                    You can update your profile, create your own workspace, or adjust preferences later from Settings.
                  </p>
                </div>
              </div>
            </template>

          <!-- ═══════════════════════════════════════════════════════ -->
          <!-- OWNER FLOW                                             -->
          <!-- ═══════════════════════════════════════════════════════ -->
          <template v-else-if="flow === 'owner'">

              <!-- Owner Step 1: Welcome hero -->
              <div v-if="step === 1" class="space-y-6">
                <OnboardingBeam />
                <div class="space-y-3 text-center">
                  <p class="text-sm text-muted-foreground leading-relaxed">
                    Trellis is a <span class="text-foreground font-semibold">living knowledge graph</span> —
                    a workspace where your team's tasks, notes, people, and projects are all connected to each other.
                  </p>
                  <p class="text-sm text-muted-foreground leading-relaxed">
                    Unlike traditional siloed tools, every piece of information can be linked to any other.
                    Nothing falls through the cracks. Nothing gets lost.
                  </p>
                </div>
                <div class="grid grid-cols-3 gap-3">
                  <div class="rounded-2xl border border-border/50 bg-card/40 backdrop-blur-sm p-4 text-center space-y-2">
                    <Icon name="lucide:link-2" class="h-5 w-5 text-primary mx-auto" />
                    <div class="text-xs font-semibold text-foreground">Everything linked</div>
                  </div>
                  <div class="rounded-2xl border border-border/50 bg-card/40 backdrop-blur-sm p-4 text-center space-y-2">
                    <Icon name="lucide:users" class="h-5 w-5 text-primary mx-auto" />
                    <div class="text-xs font-semibold text-foreground">Built for teams</div>
                  </div>
                  <div class="rounded-2xl border border-border/50 bg-card/40 backdrop-blur-sm p-4 text-center space-y-2">
                    <Icon name="lucide:layers" class="h-5 w-5 text-primary mx-auto" />
                    <div class="text-xs font-semibold text-foreground">Infinitely flexible</div>
                  </div>
                </div>
              </div>

              <!-- Owner Step 2: How it's organized -->
              <div v-else-if="step === 2" class="space-y-3">
                <div class="flex items-start gap-4 rounded-2xl border border-border bg-card/60 backdrop-blur-sm p-5">
                  <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                    <Icon name="lucide:building-2" class="h-5 w-5 text-primary" />
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="text-sm font-semibold text-foreground">Organization</div>
                    <p class="text-xs text-muted-foreground mt-1 leading-relaxed">Your team's home base. One login, shared members, and a central place to hold all your worlds.</p>
                    <div class="mt-2 text-[10px] text-muted-foreground/50 italic">e.g. "Acme Inc" · "My Studio" · "Personal"</div>
                  </div>
                </div>
                <div class="flex justify-center py-1">
                  <Icon name="lucide:arrow-down" class="h-4 w-4 text-muted-foreground/30" />
                </div>
                <div class="flex items-start gap-4 rounded-2xl border border-border bg-card/60 backdrop-blur-sm p-5">
                  <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10">
                    <Icon name="lucide:globe-2" class="h-5 w-5 text-emerald-500" />
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="text-sm font-semibold text-foreground">World</div>
                    <p class="text-xs text-muted-foreground mt-1 leading-relaxed">A focused space for a specific project, product, or team workflow. Each world has its own structure.</p>
                    <div class="mt-2 text-[10px] text-muted-foreground/50 italic">e.g. "Product Roadmap" · "Design System" · "Q1 Planning"</div>
                  </div>
                </div>
                <div class="flex justify-center py-1">
                  <Icon name="lucide:arrow-down" class="h-4 w-4 text-muted-foreground/30" />
                </div>
                <div class="flex items-start gap-4 rounded-2xl border border-border bg-card/60 backdrop-blur-sm p-5">
                  <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-500/10">
                    <Icon name="lucide:shapes" class="h-5 w-5 text-violet-500" />
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="text-sm font-semibold text-foreground">Entities</div>
                    <p class="text-xs text-muted-foreground mt-1 leading-relaxed">The atomic units of your knowledge graph — tasks, notes, people, files, and more. Everything connects.</p>
                    <div class="mt-2 text-[10px] text-muted-foreground/50 italic">tasks · notes · people · files · bookmarks · events · and more</div>
                  </div>
                </div>
              </div>

              <!-- Owner Step 3: Organization name + logo -->
              <div v-else-if="step === 3" class="space-y-6">
                <div class="flex items-center gap-5">
                  <div class="flex flex-col items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      class="relative flex h-20 w-20 items-center justify-center rounded-2xl border-2 border-dashed border-border transition-all hover:border-primary/60 hover:bg-muted/20 overflow-hidden focus:outline-none focus:ring-2 focus:ring-primary/30"
                      aria-label="Upload organization logo"
                      @click="avatarInputRef?.click()">
                      <img v-if="orgAvatar" :src="orgAvatar" class="h-full w-full object-cover" alt="Org logo" />
                      <div v-else class="flex flex-col items-center gap-1.5">
                        <Icon name="lucide:image-plus" class="h-6 w-6 text-muted-foreground/30" />
                        <span class="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/30">Logo</span>
                      </div>
                    </button>
                    <button v-if="orgAvatar" type="button" class="text-[10px] text-muted-foreground/50 hover:text-destructive transition-colors" @click="orgAvatar = null">Remove</button>
                    <input ref="avatarInputRef" type="file" accept="image/png,image/jpeg,image/webp,image/gif" class="sr-only" @change="handleAvatarUpload" />
                  </div>
                  <div class="flex-1 space-y-3">
                    <input
                      v-model="newOrgName"
                      type="text"
                      autofocus
                      placeholder="e.g. Acme Inc, My Studio…"
                      class="w-full rounded-xl border border-border bg-card/60 backdrop-blur-sm px-5 py-4 text-base text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                      @keydown.enter="goNext"
                    />
                    <p class="text-xs text-muted-foreground">Everyone you invite will see this name.</p>
                  </div>
                </div>
              </div>

              <!-- Owner Step 4: World name + template -->
              <div v-else-if="step === 4" class="space-y-5">
                <div class="space-y-3">
                  <input
                    v-model="newAppName"
                    type="text"
                    autofocus
                    placeholder="Default Space"
                    class="w-full rounded-xl border border-border bg-card/60 backdrop-blur-sm px-5 py-4 text-base text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    @keydown.enter="goNext"
                  />
                  <p class="text-xs text-muted-foreground">Worlds organize your work into focused spaces. You can create more later.</p>
                </div>
                <div class="space-y-2">
                  <div class="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Start from a template</div>
                  <div class="grid grid-cols-3 gap-2">
                    <button
                      v-for="tpl in WORLD_TEMPLATES"
                      :key="tpl.id"
                      type="button"
                      class="flex flex-col items-start gap-2 rounded-xl border p-3 text-left transition-all focus:outline-none focus:ring-2 focus:ring-primary/30"
                      :class="selectedTemplate === tpl.id ? 'border-primary/40 bg-primary/5 ring-1 ring-primary/20' : 'border-border/50 bg-card/30 hover:border-border hover:bg-card/60'"
                      @click="selectTemplate(tpl)">
                      <div class="flex items-center justify-between w-full">
                        <Icon :name="tpl.icon" class="h-4 w-4" :class="tpl.color" />
                        <Icon v-if="selectedTemplate === tpl.id" name="lucide:check-circle-2" class="h-3.5 w-3.5 text-primary" />
                      </div>
                      <div class="w-full">
                        <div class="text-[11px] font-semibold text-foreground leading-tight">{{ tpl.name }}</div>
                        <div class="text-[10px] text-muted-foreground leading-snug mt-0.5">{{ tpl.description }}</div>
                      </div>
                    </button>
                  </div>
                </div>
              </div>

              <!-- Owner Step 5: Invite team -->
              <div v-else-if="step === 5" class="space-y-5">
                <div class="space-y-3">
                  <div class="flex gap-2">
                    <input
                      v-model="inviteInput"
                      type="email"
                      autofocus
                      placeholder="teammate@company.com"
                      class="flex-1 rounded-xl border border-border bg-card/60 backdrop-blur-sm px-5 py-4 text-base text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                      @keydown.enter.prevent="addInviteEmail"
                      @keydown.,="addInviteEmail"
                    />
                    <button type="button" class="rounded-xl border border-border bg-card/60 px-4 hover:bg-muted/30 transition-all" @click="addInviteEmail">
                      <Icon name="lucide:plus" class="h-4 w-4 text-foreground" />
                    </button>
                  </div>
                  <p class="text-xs text-muted-foreground">Press Enter or comma to add multiple.</p>
                </div>

                <div v-if="inviteEmails.length" class="flex flex-wrap gap-1.5">
                  <span
                    v-for="email in inviteEmails"
                    :key="email"
                    class="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                    {{ email }}
                    <button type="button" class="ml-0.5 rounded-full p-0.5 hover:bg-primary/20 transition-colors" @click="removeInviteEmail(email)">
                      <Icon name="lucide:x" class="h-3 w-3" />
                    </button>
                  </span>
                </div>

                <div v-if="inviteResults.length" class="space-y-2">
                  <div v-for="result in inviteResults" :key="result.email" class="space-y-1">
                    <div class="flex items-center gap-2 text-xs">
                      <Icon
                        :name="result.status === 'sent' ? 'lucide:check-circle' : result.status === 'already_member' ? 'lucide:info' : 'lucide:alert-circle'"
                        :class="result.status === 'sent' ? 'text-emerald-500' : result.status === 'already_member' ? 'text-blue-400' : 'text-red-400'"
                        class="h-3.5 w-3.5 shrink-0" />
                      <span class="text-muted-foreground">{{ result.email }}</span>
                      <span v-if="result.message" class="text-muted-foreground/60">— {{ result.message }}</span>
                    </div>
                    <div v-if="result.inviteUrl" class="flex items-center gap-1.5 pl-5">
                      <input :value="result.inviteUrl" readonly class="bg-muted/50 text-muted-foreground flex-1 rounded border border-border px-2 py-1 text-[10px] font-mono truncate" @click="($event.target as HTMLInputElement).select()" />
                      <button type="button" class="shrink-0 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors" title="Copy invite link" @click="copyInviteUrl(result.inviteUrl)">
                        <Icon name="lucide:copy" class="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>

                <div v-if="!inviteEmails.length && !inviteResults.length" class="rounded-2xl border border-dashed border-border/40 p-8 text-center">
                  <Icon name="lucide:users-round" class="mx-auto h-8 w-8 text-muted-foreground/30 mb-3" />
                  <p class="text-sm text-muted-foreground">No invites yet — you can always add teammates later from the Members page.</p>
                </div>
              </div>

            </template>

          </div>
        </div>
      </Transition>
    </div>

    <!-- ── Floating nav bar ───────────────────────────────────────── -->
    <div v-if="flow !== 'loading'" class="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-5">
      <!-- Step dots -->
      <div class="flex items-center gap-1.5">
        <div
          v-for="(_, index) in Array(totalSteps)"
          :key="index"
          :class="[
            'rounded-full transition-all duration-300',
            index + 1 === step ? 'w-5 h-1.5 bg-foreground' : index + 1 < step ? 'w-1.5 h-1.5 bg-foreground/40' : 'w-1.5 h-1.5 bg-foreground/15',
          ]"
        />
      </div>

      <!-- Nav buttons -->
      <div class="flex items-center gap-3">
        <button
          v-if="step > 1 && !(flow === 'owner' && step === 5)"
          type="button"
          class="flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-all"
          @click="goPrev">
          <Icon name="lucide:arrow-left" class="h-4 w-4" />
          Back
        </button>

        <button
          v-if="flow === 'owner' && step === 5 && !inviteEmails.length"
          type="button"
          class="rounded-xl px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-all"
          @click="finishOnboarding">
          Skip for now
        </button>

        <button
          type="button"
          class="group flex items-center gap-2 rounded-xl bg-foreground px-5 py-2.5 text-sm font-semibold text-background hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-40"
          :disabled="isSubmitting || inviteSending"
          @click="goNext">
          <template v-if="flow === 'member' && step === 2">
            {{ isSubmitting ? 'Setting up…' : 'Join organization' }}
          </template>
          <template v-else-if="flow === 'owner' && step === 4">
            {{ isSubmitting ? 'Creating…' : 'Set up workspace' }}
          </template>
          <template v-else-if="flow === 'owner' && step === 5">
            {{ inviteSending ? 'Sending…' : inviteEmails.length ? 'Send invites & finish' : 'Finish setup' }}
          </template>
          <template v-else>
            Continue
          </template>
          <Icon
            v-if="!isSubmitting && !inviteSending"
            name="lucide:arrow-right"
            class="h-4 w-4 transition-transform group-hover:translate-x-0.5"
          />
        </button>
      </div>
    </div>

  </div>
</template>

<style scoped>
/* Slide forward: new slide enters from right, old exits to left */
.ob-slide-fwd-enter-active,
.ob-slide-fwd-leave-active,
.ob-slide-back-enter-active,
.ob-slide-back-leave-active {
  transition: opacity 300ms ease, transform 350ms cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

.ob-slide-fwd-enter-from { opacity: 0; transform: translateX(40px); }
.ob-slide-fwd-leave-to   { opacity: 0; transform: translateX(-40px); }
.ob-slide-back-enter-from { opacity: 0; transform: translateX(-40px); }
.ob-slide-back-leave-to   { opacity: 0; transform: translateX(40px); }

.ob-fade-enter-active,
.ob-fade-leave-active { transition: opacity 250ms ease; }
.ob-fade-enter-from,
.ob-fade-leave-to { opacity: 0; }
</style>
