import { CURRENT_DATA_VERSION, migrateUserToV1, migrateUserToV2, migrateUserToV3, migrateUserToV4 } from '~/lib/instantDataMigrations'
import { pickOrgAndApp } from '~/lib/pickOrgAndApp'
import { parseHybridSlug } from '~/composables/useWorkspacePath'

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
  const isAuthRoute = to.path.startsWith('/auth')
  const isOnboardingRoute = to.path.startsWith('/onboarding')
  const isInviteRoute = to.path.startsWith('/invite')
  const isPublicRoute =
    to.path === '/' || to.path.startsWith('/guide') || to.path.startsWith('/explore') || to.path.startsWith('/docs')

  const instant = useInstantDb()
  const tx = instant.tx as any

  // If already initialized and not going to auth/onboarding routes, skip heavy checks.
  if (
    authInitialized.value &&
    cachedUser.value &&
    !isAuthRoute &&
    !isOnboardingRoute
  ) {
    // On the fast path, still resolve orgSlug if present in the URL
    // so workspace switching via URL works on subsequent navigations.
    // The orgSlug uses hybrid format: "{slug}-{first8ofId}"
    const fastOrgSlug = to.params?.orgSlug as string | undefined
    if (fastOrgSlug) {
      const currentOrg = useState<any>('currentOrg')
      // Check if the current org already matches this hybrid slug
      const currentHybrid = currentOrg.value?.id
        ? `${currentOrg.value.slug}-${currentOrg.value.id.substring(0, 8)}`
        : null
      if (currentHybrid !== fastOrgSlug) {
        try {
          const parsed = parseHybridSlug(fastOrgSlug)
          const orgsResp = await instant.queryOnce({ organizations: {} })
          const allOrgs = ((orgsResp.data as any)?.organizations || []) as any[]
          let matchedOrg: any = null
          if (parsed) {
            // Hybrid slug: find org whose ID starts with the 8-char prefix
            matchedOrg = allOrgs.find((o: any) => o.id.startsWith(parsed.idPrefix))
          }
          if (!matchedOrg) {
            // Fallback: try matching as a plain slug for backward compat
            matchedOrg = allOrgs.find((o: any) => o.slug === fastOrgSlug)
          }
          if (matchedOrg) {
            currentOrg.value = matchedOrg
            const currentApp = useState<any>('currentApp')
            const appResp = await instant.queryOnce({
              applications: { $: { where: { orgId: matchedOrg.id } } },
            })
            const orgApps = ((appResp.data as any)?.applications || []) as any[]
            if (orgApps.length > 0) currentApp.value = orgApps[0]
            log('fast path: resolved org from hybrid slug:', fastOrgSlug, '→', matchedOrg.id)
          }
        } catch {
          // Non-fatal — keep current org
        }
      }
    }
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
    if (isAuthRoute || isPublicRoute || isInviteRoute) return
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
    // ── Resolve pending invites ──────────────────────────────────────
    // If this user was invited to a workspace before signing up,
    // link them to the org by resolving their pending member records.
    const invitesResolved = useState<boolean>('auth:invitesResolved', () => false)
    if (!invitesResolved.value && user.email) {
      try {
        setupStatus.value = 'Checking invitations…'
        const result = await $fetch('/api/resolve-invites', {
          method: 'POST',
          body: { userId: user.id, email: user.email },
        })
        if ((result as any)?.resolved > 0) {
          log('resolved', (result as any).resolved, 'pending invites')
        }
        invitesResolved.value = true
      } catch (err) {
        console.warn('[auth.global] Invite resolution failed (non-fatal):', (err as any)?.message || err)
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

      if (nextDataVersion < 3) {
        const migrationOrgId = await getSetting('user', user.id, 'lastOrgId')
        if (typeof migrationOrgId === 'string' && migrationOrgId) {
          await migrateUserToV3(instant, user.id, migrationOrgId)
        }
        nextDataVersion = 3
      }

      if (nextDataVersion < 4) {
        const migrationOrgId = await getSetting('user', user.id, 'lastOrgId')
        if (typeof migrationOrgId === 'string' && migrationOrgId) {
          await migrateUserToV4(instant, user.id, migrationOrgId)
        }
        nextDataVersion = 4
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

      // Query all orgs visible to this user (owned + member via permissions)
      const resp = await instant.queryOnce({
        organizations: {},
        applications: {},
      })

      let orgs = ((resp.data as any)?.organizations || []) as any[]
      let allApps = ((resp.data as any)?.applications || []) as any[]

      log('ensureValidOrgAndApp: visible orgs =', orgs.length, ', apps =', allApps.length, ', lastOrgId =', lastOrgId)

      // Check if the target org (lastOrgId) is already in the visible list.
      // For invited members, the admin SDK may have created the org→member link
      // but the client SDK's permission-gated query hasn't caught up yet.
      const lastOrgInList = typeof lastOrgId === 'string' && lastOrgId
        ? orgs.find((o: any) => o.id === lastOrgId)
        : null

      if (!lastOrgInList && typeof lastOrgId === 'string' && lastOrgId) {
        log('ensureValidOrgAndApp: lastOrgId not in visible list — trying server-side resolver')
        try {
          // Use the server-side workspace-context endpoint which uses the admin SDK
          // to bypass client permissions and fetch the org + apps directly.
          const serverCtx = await $fetch('/api/workspace-context', {
            params: { userId: user.id },
          }) as any

          if (serverCtx?.org) {
            // Merge the server-resolved org into the visible list
            if (!orgs.find((o: any) => o.id === serverCtx.org.id)) {
              orgs = [...orgs, serverCtx.org]
            }
            const serverApps = serverCtx.apps || []
            for (const app of serverApps) {
              if (!allApps.find((a: any) => a.id === app.id)) {
                allApps = [...allApps, app]
              }
            }
            log('ensureValidOrgAndApp: server resolved org + apps:', serverCtx.org.id, ', apps =', serverApps.length)
          } else {
            log('ensureValidOrgAndApp: server resolver returned no org')
          }
        } catch (err) {
          log('ensureValidOrgAndApp: server resolver failed (non-fatal):', (err as any)?.message)

          // Fallback: try client-side direct lookup (may work if permissions just propagated)
          try {
            const orgResp = await instant.queryOnce({
              organizations: {
                $: { where: { id: lastOrgId } },
                applications: {},
              },
            })
            const memberOrgs = ((orgResp.data as any)?.organizations || []) as any[]
            if (memberOrgs.length > 0) {
              orgs = memberOrgs
              const orgApps = memberOrgs.flatMap((o: any) => o.applications || [])
              if (orgApps.length > 0) allApps = [...allApps, ...orgApps]
              log('ensureValidOrgAndApp: client fallback found org, apps =', orgApps.length)
            }
          } catch (fallbackErr) {
            log('ensureValidOrgAndApp: client fallback also failed:', (fallbackErr as any)?.message)
          }
        }
      }

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

    // ── ID-based routing: resolve orgSlug from URL ────────────────────
    // Routes under /w/:orgSlug/... have the workspace encoded in the URL.
    // If present, override currentOrg to match the slug so the user lands
    // in the correct workspace regardless of their lastOrgId setting.
    const orgSlugParam = to.params?.orgSlug as string | undefined
    if (orgSlugParam) {
      // Check if current org already matches
      const currentHybrid = currentOrg.value?.id
        ? `${currentOrg.value.slug}-${currentOrg.value.id.substring(0, 8)}`
        : null
      if (currentHybrid !== orgSlugParam) {
        try {
          const parsed = parseHybridSlug(orgSlugParam)
          const orgsResp = await instant.queryOnce({ organizations: {} })
          const allOrgs = ((orgsResp.data as any)?.organizations || []) as any[]
          let matchedOrg: any = null
          if (parsed) {
            // Hybrid slug: find org whose ID starts with the 8-char prefix
            matchedOrg = allOrgs.find((o: any) => o.id.startsWith(parsed.idPrefix))
          }
          if (!matchedOrg) {
            // Fallback: try matching as a plain slug for backward compat
            matchedOrg = allOrgs.find((o: any) => o.slug === orgSlugParam)
          }
          if (matchedOrg) {
            currentOrg.value = matchedOrg
            // Also resolve the app for this org
            const appResp = await instant.queryOnce({
              applications: { $: { where: { orgId: matchedOrg.id } } },
            })
            const orgApps = ((appResp.data as any)?.applications || []) as any[]
            if (orgApps.length > 0) {
              currentApp.value = orgApps[0]
            }
            log('resolved org from hybrid slug:', orgSlugParam, '→', matchedOrg.id)
          } else {
            log('orgSlug not found:', orgSlugParam, '— keeping current org')
          }
        } catch (err) {
          log('orgSlug resolution failed (non-fatal):', (err as any)?.message)
        }
      }
    }

    setupStatus.value = 'Almost ready…'

    log('post-setup complete', {
      currentOrgId: currentOrg.value?.id ?? null,
      currentAppId: currentApp.value?.id ?? null,
    })

    // Mark as initialized and cache user for fast path on subsequent navigations
    authInitialized.value = true
    cachedUser.value = user
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
