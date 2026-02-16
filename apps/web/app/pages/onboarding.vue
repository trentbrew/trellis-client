<script lang="ts" setup>
  import type { Organization } from '~/types/database'

  definePageMeta({
    layout: 'onboarding',
    middleware: ['auth'],
  })

  const instant = useInstantDb()
  // Use useState directly — do NOT import useInstantData() here because it
  // auto-creates a default org/app, bypassing the onboarding wizard.
  const currentOrg = useState<any>('currentOrg')
  const currentApp = useState<any>('currentApp')

  // Read the cached user that the login page stored via waitForAuth().
  // getAuth() returns null when browser tracking prevention blocks storage,
  // but the login page captures the user from subscribeAuth and stores it here.
  const cachedUser = useState<any>('auth:user')

  /**
   * Resolve the current user — try getAuth() first, fall back to cachedUser,
   * and as a last resort subscribe to auth changes briefly.
   */
  async function resolveUser(): Promise<any | null> {
    const fromGetAuth = await instant.getAuth()
    if (fromGetAuth) return fromGetAuth
    if (cachedUser.value) return cachedUser.value

    // Last resort: wait up to 3s for subscribeAuth
    return new Promise((resolve) => {
      let unsub: (() => void) | null = null
      const timer = setTimeout(() => { unsub?.(); resolve(null) }, 3000)
      unsub = instant.subscribeAuth((auth: any) => {
        if (auth?.user) { clearTimeout(timer); unsub?.(); resolve(auth.user) }
      })
    })
  }

  const open = ref(true)
  const canClose = ref(false)

  const newOrgName = ref('')
  const newAppName = ref('')
  const isSubmitting = ref(false)
  const errorMessage = ref<string | null>(null)

  const step = ref(1)
  const totalSteps = 3

  const generateSlug = (value: string) => {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
  }

  onMounted(async () => {})

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
          where: {
            settingKey,
          },
        },
      },
    })

    const existing = (resp.data as any)?.settings?.[0]
    const now = Date.now()

    if (existing?.id) {
      await instant.transact([
        tx.settings[existing.id].update({
          ownerId,
          entityType,
          entityId,
          key,
          value,
          updatedAt: now,
        }),
      ])
      return
    }

    const id = crypto.randomUUID()
    await instant.transact([
      tx.settings[id].create({
        ownerId,
        settingKey,
        entityType,
        entityId,
        key,
        value,
        updatedAt: now,
      }),
    ])
  }

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
      tx.organizations[org.id].link({ applications: app.id }),
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
        tx.applications[app.id].link({ collections: homeCollection.id }),
      )
    }

    await instant.transact(chunks)

    // Hard verification (throws if offline / not connected)
    await instant.queryOnce({
      organizations: {
        $: { where: { ownerId: userId } },
        applications: {
          collections: {},
        },
      },
    })
  }

  const handleSubmit = async () => {
    if (isSubmitting.value) return
    errorMessage.value = null

    const orgName = newOrgName.value.trim()
    const appName = newAppName.value.trim()
    if (!orgName) {
      errorMessage.value = 'Please enter an organization name.'
      return
    }
    if (!appName) {
      errorMessage.value = 'Please enter an app name.'
      return
    }

    isSubmitting.value = true
    try {
      const user = await resolveUser()
      if (!user) {
        console.error('[onboarding] No authenticated user found — cannot complete setup')
        errorMessage.value = 'Session expired. Please sign in again.'
        isSubmitting.value = false
        return
      }
      console.log('[onboarding] user resolved:', user.id)

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

      try {
        await syncOnboardingToInstant({
          userId: user.id,
          org,
          app,
          homeCollection,
        })
      } catch (err: any) {
        console.error('InstantDB onboarding sync failed:', err)
        errorMessage.value = err?.message || 'Failed to sync onboarding to InstantDB.'
        return
      }

      newOrgName.value = ''
      newAppName.value = ''

      canClose.value = true
      open.value = false

      // Invalidate middleware cache so it re-reads onboardingComplete
      const authInitialized = useState<boolean>('auth:initialized')
      authInitialized.value = false

      await navigateTo('/welcome')
    } catch (err: any) {
      errorMessage.value = err?.message || 'Onboarding failed'
      console.error('Onboarding error:', err)
    } finally {
      isSubmitting.value = false
    }
  }

  const stepContent = [
    {
      title: 'Welcome',
      description: 'Set up your organization and first app to get started.',
    },
    {
      title: 'Organization',
      description: 'Enter your organization name to get started.',
    },
    {
      title: 'Application',
      description: 'Name your first app.',
    },
  ]

  const validateStep = () => {
    errorMessage.value = null

    if (step.value === 2) {
      const orgName = newOrgName.value.trim()
      if (!orgName) {
        errorMessage.value = 'Please enter an organization name.'
        return false
      }
    }

    if (step.value === 3) {
      const appName = newAppName.value.trim()
      if (!appName) {
        errorMessage.value = 'Please enter an app name.'
        return false
      }
    }

    return true
  }

  const goNext = async () => {
    if (!validateStep()) return
    if (step.value < totalSteps) {
      step.value += 1
      return
    }

    await handleSubmit()
  }

  const goPrev = () => {
    if (step.value > 1) step.value -= 1
  }

  const handleUpdateOpen = (next: boolean) => {
    if (next) {
      open.value = true
      return
    }

    open.value = canClose.value
  }
</script>

<template>
  <div class="flex justify-center">
    <UiDialog :open="open" @update:open="handleUpdateOpen">
      <UiDialogContent
        class="max-w-[450px] gap-0 overflow-x-clip p-0 [&>button:last-child]:text-white"
        :hide-close="true"
        @escape-key-down.prevent
        @pointer-down-outside.prevent
        @interact-outside.prevent
      >
        <div class="space-y-6 overflow-x-hidden px-6 pt-6 pb-6">
          <Transition mode="out-in">
            <UiDialogHeader :key="step">
              <UiDialogTitle>{{ stepContent[step - 1]?.title }}</UiDialogTitle>
              <UiDialogDescription>{{ stepContent[step - 1]?.description }}</UiDialogDescription>
            </UiDialogHeader>
          </Transition>

          <div v-if="errorMessage" class="border-border bg-card rounded-xl border p-4 text-sm text-red-400">
            {{ errorMessage }}
          </div>

          <div v-if="step === 1" class="space-y-4">
            <div class="text-muted-foreground text-sm">
              You’ll create your organization and app now. You can’t continue until setup is complete.
            </div>
          </div>

          <div v-else-if="step === 2" class="space-y-4">
            <div class="space-y-2">
              <label class="text-foreground text-sm font-medium">Organization name</label>
              <UiInput
                v-model="newOrgName"
                type="text"
                placeholder="My Company"
                class="border-input bg-background text-foreground placeholder:text-muted-foreground w-full rounded-lg border px-3 py-2 text-sm"
              />
              <p class="text-muted-foreground text-xs">This will create a new organization.</p>
            </div>
          </div>

          <div v-else class="space-y-4">
            <div class="space-y-2">
              <label class="text-foreground text-sm font-medium">App name</label>
              <input
                v-model="newAppName"
                type="text"
                placeholder="My App"
                class="border-input bg-background text-foreground placeholder:text-muted-foreground w-full rounded-lg border px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div class="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div class="flex justify-center space-x-1.5 max-sm:order-1">
              <div
                v-for="(_, index) in Array(totalSteps)"
                :key="index"
                :class="['h-1.5 w-1.5 rounded-full bg-primary', index + 1 === step ? 'bg-primary' : 'opacity-20']"
              />
            </div>

            <UiDialogFooter>
              <UiButton v-if="step > 1" variant="outline" type="button" @click="goPrev">
                <Icon
                  name="lucide:arrow-left"
                  class="-ms-1 me-2 size-4 opacity-60 transition-transform group-hover:-translate-x-0.5"
                  aria-hidden="true"
                />
                Prev
              </UiButton>

              <UiButton class="group" type="button" :disabled="isSubmitting" @click="goNext">
                {{ step < totalSteps ? 'Next' : isSubmitting ? 'Setting up...' : 'Finish setup' }}
                <Icon
                  v-if="step < totalSteps"
                  name="lucide:arrow-right"
                  class="ms-2 -me-1 size-4 opacity-60 transition-transform group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </UiButton>
            </UiDialogFooter>
          </div>
        </div>
      </UiDialogContent>
    </UiDialog>
  </div>
</template>
