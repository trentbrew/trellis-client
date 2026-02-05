import { CURRENT_DATA_VERSION, migrateUserToV1, migrateUserToV2 } from '~/lib/instantDataMigrations'
import { pickOrgAndApp } from '~/lib/pickOrgAndApp'
import { ensureDemoSeedV1 } from '~/lib/demoSeed'

/**
 * Test bypass mode - only enabled in dev/test environments
 * Enable via:
 * - Environment variable: ENABLE_TEST_AUTH_BYPASS=true
 * - URL query param: ?testAuthBypass=true
 *
 * Creates a mock user for automated testing.
 * ⚠️ NEVER enable in production!
 */
const isTestBypassEnabled = () => {
  // Only allow in dev/test environments
  if (import.meta.env.PROD) return false

  // Check environment variable
  if (process.env.ENABLE_TEST_AUTH_BYPASS === 'true') return true

  // Vitest/test-utils runs in a test environment with a mocked InstantDB instance
  if (process.env.VITEST) return true

  // Check URL query param (only in dev/test)
  if (import.meta.client && typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search)
    if (params.get('testAuthBypass') === 'true') return true
  }

  return false
}

const createMockTestUser = () => {
  return {
    id: 'test-user-' + crypto.randomUUID(),
    email: 'test@example.com',
    name: 'Test User',
    avatar: null,
  } as any
}

const ENABLE_AUTH_MIDDLEWARE = false

export default defineNuxtRouteMiddleware(async (to) => {
  if (!ENABLE_AUTH_MIDDLEWARE) return
  if (!import.meta.client) return

  const log = (...args: any[]) => {
    if (!import.meta.dev) return
    console.log('[auth.global]', ...args)
  }

  // Cache state to avoid repeated DB queries on every navigation
  const authInitialized = useState<boolean>('auth:initialized', () => false)
  const cachedUser = useState<any>('auth:user', () => null)
  const demoSeedChecked = useState<boolean>('demo:seedChecked', () => false)

  const isAuthRoute = to.path.startsWith('/auth')
  const isOnboardingRoute = to.path.startsWith('/onboarding')
  const isPublicRoute =
    to.path === '/' || to.path.startsWith('/guide') || to.path.startsWith('/explore') || to.path.startsWith('/docs')
  const forceDemoSeed = String((to.query as any)?.seedDemo || '') === 'true'

  const instant = useInstantDb()
  const tx = instant.tx as any

  // If already initialized and not going to auth/onboarding routes, skip heavy checks.
  // However, we must ensure demo seeding has run at least once per session for existing users.
  if (
    authInitialized.value &&
    cachedUser.value &&
    !isAuthRoute &&
    !isOnboardingRoute &&
    demoSeedChecked.value &&
    !forceDemoSeed
  ) {
    log('fast path (cached)')
    return
  }

  // Test bypass mode - create mock user for automated testing
  let user = await instant.getAuth()
  const testBypassEnabled = isTestBypassEnabled()

  if (testBypassEnabled && !user) {
    const mockUser = createMockTestUser()
    log('⚠️ TEST BYPASS ENABLED - using mock user:', mockUser.id)
    user = mockUser

    // Store mock user in state for composables that need it
    const mockUserState = useState<any>('test:mockUser')
    mockUserState.value = mockUser
  }

  log('enter', {
    to: to.fullPath,
    isAuthRoute,
    isOnboardingRoute,
    hasUser: !!user,
    testBypassEnabled,
  })

  if (!user) {
    if (isAuthRoute || isPublicRoute) return
    log('redirect -> /auth/login (no user)')
    return navigateTo('/auth/login')
  }

  const currentOrg = useState<any>('currentOrg')
  const currentApp = useState<any>('currentApp')

  // In test bypass mode, skip database operations and use mock data
  if (testBypassEnabled) {
    log('⚠️ TEST BYPASS: skipping database operations')
    // Set minimal state for test bypass
    currentOrg.value = null
    currentApp.value = null

    // Skip onboarding check in test mode
    if (!isOnboardingRoute && !isAuthRoute) {
      log('allow route (test bypass)')
      return
    }

    // Allow auth/onboarding routes in test mode
    if (isAuthRoute || isOnboardingRoute) {
      log('allow route (test bypass - auth/onboarding)')
      return
    }
  }

  const getSetting = async (entityType: 'user' | 'org' | 'app' | 'collection', entityId: string, key: string) => {
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
    return (resp.data as any)?.settings?.[0]?.value
  }

  const upsertSetting = async (
    entityType: 'user' | 'org' | 'app' | 'collection',
    entityId: string,
    key: string,
    value: any,
  ) => {
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
    const ownerId = user.id

    if (existing?.id) {
      await instant.transact([
        tx.settings[existing.id].update({
          ownerId,
          settingKey,
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

  let personalOrgId = await getSetting('user', user.id, 'personalOrgId')
  if (typeof personalOrgId !== 'string' || !personalOrgId) {
    const now = Date.now()
    const createdId = crypto.randomUUID()

    await instant.transact([
      tx.organizations[createdId].create({
        ownerId: user.id,
        name: 'Personal',
        slug: 'personal',
        plan: 'free',
        createdAt: now,
        updatedAt: now,
      }),
    ])

    await upsertSetting('user', user.id, 'personalOrgId', createdId)
    personalOrgId = createdId
  }

  if (forceDemoSeed && import.meta.dev) {
    await upsertSetting('user', user.id, 'demoSeedVersion', 0)
  }

  await ensureDemoSeedV1({
    instant,
    tx,
    userId: user.id,
    orgId: personalOrgId,
    getSetting,
    upsertSetting,
  })

  const demoAppResp = await instant.queryOnce({
    applications: {
      $: {
        where: {
          ownerId: user.id,
          orgId: personalOrgId,
          slug: 'personal',
        },
      },
    },
  })
  const demoPersonalAppId = (demoAppResp.data as any)?.applications?.[0]?.id

  const onboardingComplete = await getSetting('user', user.id, 'onboardingComplete')
  if (onboardingComplete !== true) {
    await upsertSetting('user', user.id, 'onboardingComplete', true)

    const lastOrgId = await getSetting('user', user.id, 'lastOrgId')
    if (typeof lastOrgId !== 'string' || !lastOrgId) {
      await upsertSetting('user', user.id, 'lastOrgId', personalOrgId)
    }

    const lastAppId = await getSetting('user', user.id, 'lastAppId')
    if ((typeof lastAppId !== 'string' || !lastAppId) && typeof demoPersonalAppId === 'string' && demoPersonalAppId) {
      await upsertSetting('user', user.id, 'lastAppId', demoPersonalAppId)
    }
  }

  const rawDataVersion = await getSetting('user', user.id, 'dataVersion')
  const dataVersion = typeof rawDataVersion === 'number' ? rawDataVersion : 0

  let nextDataVersion = dataVersion

  if (nextDataVersion < 1) {
    await migrateUserToV1(instant, user.id)
    nextDataVersion = 1
  }

  if (nextDataVersion < 2) {
    await migrateUserToV2(instant, user.id)
    nextDataVersion = 2
  }

  if (nextDataVersion !== dataVersion && nextDataVersion === CURRENT_DATA_VERSION) {
    await upsertSetting('user', user.id, 'dataVersion', CURRENT_DATA_VERSION)
  }

  const isOnboardingComplete = (await getSetting('user', user.id, 'onboardingComplete')) === true

  if (!isOnboardingComplete && !isOnboardingRoute) {
    log('redirect -> /onboarding (onboarding incomplete)')
    return navigateTo('/onboarding')
  }

  // Set current org and app if available, but don't block navigation
  const ensureValidOrgAndApp = async () => {
    const lastOrgId = await getSetting('user', user.id, 'lastOrgId')
    const lastAppId = await getSetting('user', user.id, 'lastAppId')

    const resp = await instant.queryOnce({
      organizations: {
        $: { where: { ownerId: user.id } },
      },
      applications: {
        $: { where: { ownerId: user.id } },
      },
    })

    const orgs = ((resp.data as any)?.organizations || []) as any[]
    const allApps = ((resp.data as any)?.applications || []) as any[]

    const picked = pickOrgAndApp({
      orgs,
      apps: allApps,
      lastOrgId,
      lastAppId,
    })

    currentOrg.value = picked.org
    currentApp.value = picked.app
  }

  await ensureValidOrgAndApp()

  log('post-ensureValidOrgAndApp', {
    currentOrgId: currentOrg.value?.id ?? null,
    currentAppId: currentApp.value?.id ?? null,
    to: to.fullPath,
  })

  // If on an auth route and onboarding is complete, navigate to welcome
  if (isAuthRoute && isOnboardingComplete) {
    log('redirect -> /welcome (auth route, onboarding complete)')
    return navigateTo('/welcome')
  }

  // If on an onboarding route and onboarding is complete, navigate to welcome
  if (isOnboardingRoute && isOnboardingComplete) {
    log('redirect -> /welcome (onboarding route, onboarding complete)')
    return navigateTo('/welcome')
  }

  // If on an auth route and onboarding is not complete, allow it (e.g., login page)
  if (isAuthRoute && !isOnboardingComplete) {
    log('allow auth route (onboarding incomplete)')
    return
  }

  // If on an onboarding route and onboarding is not complete, allow it
  if (isOnboardingRoute && !isOnboardingComplete) {
    log('allow onboarding route (onboarding incomplete)')
    return
  }

  // Mark as initialized and cache user for fast path on subsequent navigations
  authInitialized.value = true
  cachedUser.value = user
  demoSeedChecked.value = true

  log('allow route')
})
