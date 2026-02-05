/**
 * Test bypass mode - only enabled in dev/test environments
 * When enabled, returns a mock InstantDB instance that bypasses auth
 */
const isTestBypassEnabled = () => {
  if (process.env.VITEST) return true
  if (process.env.ENABLE_TEST_AUTH_BYPASS === 'true') return true

  // In production, never allow bypass.
  if (process.env.NODE_ENV === 'production') return false

  if (import.meta.client && typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search)
    if (params.get('testAuthBypass') === 'true') return true
  }
  return false
}

export default defineNuxtPlugin(() => {
  const storageKey = 'platform-sandbox:mockInstantAuthUser'

  const createEntityProxy = () => {
    return new Proxy(
      {},
      {
        get() {
          return {
            create: () => ({ __mock: true }),
            update: () => ({ __mock: true }),
            delete: () => ({ __mock: true }),
            link: () => ({ __mock: true }),
            unlink: () => ({ __mock: true }),
          }
        },
      },
    )
  }

  const tx = new Proxy(
    {},
    {
      get() {
        return createEntityProxy()
      },
    },
  )

  const demoUsers = {
    superadmin: {
      id: 'user-superadmin',
      email: 'superadmin@platform-sandbox.local',
      name: 'Super Admin',
      avatar: null,
      role: 'super_admin' as const,
    },
    admin: {
      id: 'user-admin',
      email: 'admin@platform-sandbox.local',
      name: 'Admin User',
      avatar: null,
      role: 'admin' as const,
    },
    manager: {
      id: 'user-manager',
      email: 'manager@platform-sandbox.local',
      name: 'Facility Manager',
      avatar: null,
      role: 'facility_manager' as const,
    },
    guest: {
      id: 'user-guest',
      email: 'guest@platform-sandbox.local',
      name: 'Guest User',
      avatar: null,
      role: 'guest' as const,
    },
  }

  const defaultUser = demoUsers.admin

  const loadUser = () => {
    if (!import.meta.client) return defaultUser
    try {
      const raw = localStorage.getItem(storageKey)
      if (!raw) return defaultUser
      const parsed = JSON.parse(raw)
      return parsed && typeof parsed === 'object' ? parsed : defaultUser
    } catch {
      return defaultUser
    }
  }

  let currentUser: any = loadUser()

  // eslint-disable-next-line no-unused-vars
  const authSubscribers = new Set<(payload: { user: any }) => void>()
  const emitAuth = () => {
    authSubscribers.forEach((cb) => {
      try {
        cb({ user: currentUser })
      } catch {
        return
      }
    })
  }

  const mockFacilities = [
    {
      id: 'platform-sandbox-facility-1',
      organizationId: 'org_northwind',
      name: 'Auburn',
      slug: 'auburn',
      location: { city: 'Auburn', state: 'WA' },
    },
  ]

  const queryOnce = async (query: any) => {
    const data: any = {}
    const keys = query && typeof query === 'object' ? Object.keys(query) : []

    keys.forEach((k) => {
      if (k === 'facilities') {
        data.facilities = mockFacilities
        return
      }
      if (k === 'facilityMembers') {
        data.facilityMembers = [
          {
            id: 'member-1',
            facilityId: mockFacilities[0]!.id,
            organizationId: 'org_northwind',
            userId: currentUser?.id || defaultUser.id,
            role: currentUser?.role || defaultUser.role,
            status: 'active',
          },
        ]
        return
      }

      // Default empty arrays for collection-like entities
      data[k] = []
    })

    return { data }
  }

  const subscribeQuery = (query: any, callback: any) => {
    void queryOnce(query)
      .then((resp) => {
        callback?.({ data: resp.data })
      })
      .catch((error) => {
        callback?.({ error })
      })
    return () => {}
  }

  const subscribeAuth = (callback: any) => {
    if (typeof callback === 'function') {
      authSubscribers.add(callback)
      callback({ user: currentUser })
    }
    return () => {
      if (typeof callback === 'function') authSubscribers.delete(callback)
    }
  }

  const signOut = async () => {
    currentUser = null
    if (import.meta.client) {
      try {
        localStorage.removeItem(storageKey)
      } catch {
        return
      }
    }
    emitAuth()
  }

  const signInWithIdToken = async (args: any) => {
    void args
    currentUser = {
      ...defaultUser,
      id: 'demo-user-' + (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : Date.now()),
    }
    if (import.meta.client) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(currentUser))
      } catch {
        return
      }
    }
    emitAuth()
  }

  const switchUser = (userKey: keyof typeof demoUsers) => {
    const newUser = demoUsers[userKey]
    if (!newUser) return
    currentUser = { ...newUser }
    if (import.meta.client) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(currentUser))
      } catch {
        return
      }
    }
    emitAuth()
    // Reload to refresh all state
    if (import.meta.client) {
      window.location.reload()
    }
  }

  const instantDb = {
    subscribeQuery,
    subscribeAuth,
    queryOnce,
    transact: async () => {},
    tx,
    auth: {
      signOut,
      signInWithIdToken,
    },
    getAuth: async () => currentUser,
    demoUsers,
    switchUser,
  } as any

  if (import.meta.dev && isTestBypassEnabled()) {
    console.warn('⚠️ TEST BYPASS ENABLED - using mock InstantDB')
  }

  return {
    provide: {
      instantDb,
    },
  }
})
