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

const ENABLE_AUTH_MIDDLEWARE = true

export default defineNuxtRouteMiddleware(async (to) => {
  if (!ENABLE_AUTH_MIDDLEWARE) return
  if (!import.meta.client) return

  // Local mode (self-hosted) — no login required, skip auth entirely
  const dataMode = useRuntimeConfig().public.dataMode || 'local'
  if (dataMode === 'local') return

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

  // Try getAuth() first, then fall back to cached user from login page.
  // After signInWithIdToken, the WebSocket reconnects asynchronously —
  // getAuth() may return null before the reconnection completes, but
  // the login page stores the confirmed user in cachedUser via waitForAuth().
  const getAuthResult = await instant.getAuth()
  let user = getAuthResult || cachedUser.value

  log('auth resolve', {
    getAuthResult: getAuthResult ? `user:${getAuthResult.id}` : null,
    cachedUser: cachedUser.value ? `user:${cachedUser.value.id}` : null,
    resolved: user ? `user:${user.id}` : null,
  })

  // Test bypass mode - create mock user for automated testing
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

  // ── Step 1: Check onboarding status ────────────────────────────────
  // New users must complete onboarding (create org + first world) before
  // we run any heavy setup like demo seeding or data migrations.
  const isOnboardingComplete = (await getSetting('user', user.id, 'onboardingComplete')) === true

  if (!isOnboardingComplete) {
    if (isOnboardingRoute) {
      log('allow onboarding route (onboarding incomplete)')
      return
    }
    if (isAuthRoute) {
      log('allow auth route (onboarding incomplete)')
      return
    }
    log('redirect -> /onboarding (onboarding incomplete)')
    return navigateTo('/onboarding')
  }

  // ── Step 2: Onboarding complete — ensure org/app and run post-setup ─
  // At this point the onboarding page has already created the user's org,
  // first world (app), and set onboardingComplete + lastOrgId + lastAppId.

  // Reactive status message — the /welcome page reads this to show real-time progress
  const setupStatus = useState<string>('setup:status', () => '')

  // If coming from auth or onboarding, redirect to /welcome immediately so the
  // loading screen renders while we run heavy setup in the background.
  if (isAuthRoute || isOnboardingRoute) {
    log('redirect -> /welcome (setup complete, will run post-setup on next tick)')
    return navigateTo('/welcome')
  }

  // For the /welcome route (or any other route), run post-setup.
  // On /welcome this runs while the loading screen is already visible.
  const isWelcomeRoute = to.path === '/welcome'

  const runPostSetup = async () => {
    const personalOrgId = await getSetting('user', user.id, 'lastOrgId')

    if (personalOrgId) {
      if (forceDemoSeed && import.meta.dev) {
        await upsertSetting('user', user.id, 'demoSeedVersion', 0)
      }

      try {
        setupStatus.value = 'Seeding demo data…'
        await ensureDemoSeedV1({
          instant,
          tx,
          userId: user.id,
          orgId: personalOrgId,
          getSetting,
          upsertSetting,
        })
      } catch (err) {
        console.warn('[auth.global] Demo seed failed (non-fatal):', (err as any)?.message || err)
      }
    }

    // Data migrations
    try {
      setupStatus.value = 'Running data migrations…'
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
    } catch (err) {
      console.warn('[auth.global] Data migration failed (non-fatal):', (err as any)?.message || err)
    }

    // Resolve org and app
    setupStatus.value = 'Loading your workspace…'
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

    try {
      await ensureValidOrgAndApp()
    } catch (err) {
      console.warn('[auth.global] ensureValidOrgAndApp failed (non-fatal):', (err as any)?.message || err)
    }

    setupStatus.value = 'Almost ready…'

    log('post-setup complete', {
      currentOrgId: currentOrg.value?.id ?? null,
      currentAppId: currentApp.value?.id ?? null,
    })

    // Mark as initialized and cache user for fast path on subsequent navigations
    authInitialized.value = true
    cachedUser.value = user
    demoSeedChecked.value = true
  }

  if (isWelcomeRoute) {
    // Fire-and-forget: let the welcome page render immediately with the loading
    // screen, while post-setup runs in the background. The welcome page polls
    // currentOrg/currentApp and navigates to /workspace/tasks when ready.
    runPostSetup()
    log('allow /welcome (post-setup running in background)')
    return
  }

  // For all other routes, run post-setup synchronously (blocking) so the page
  // has org/app state available when it renders.
  await runPostSetup()

  log('allow route')
})
