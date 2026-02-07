/**
 * Local InstantDB adapter — drop-in replacement for @instantdb/core.
 *
 * Provides the same API surface as a real InstantDB `db` instance:
 *   - subscribeQuery / queryOnce  (InstaQL reads)
 *   - transact / tx               (InstaML writes)
 *   - subscribeAuth / auth         (authentication)
 *   - id()                         (UUID generation)
 *
 * Migration path:
 *   1. Replace `createLocalInstantDB()` in the plugin with the real
 *      `init({ appId, schema })` from `@instantdb/core` or `@instantdb/vue`.
 *   2. Remove the `demoUsers` / `switchUser` dev helpers.
 *   3. Delete the `instant-local/` directory entirely.
 *   No consumer code changes needed — composables, pages, and libs all use
 *   the same `db.subscribeQuery` / `db.transact` / `db.tx` surface.
 */

import { LocalStore } from './store'
import { executeQuery } from './query'
import { createTxProxy, processTransactions, type TxChunk } from './tx'

// ── Public types ────────────────────────────────────────────────────────

export interface LocalInstantDBOptions {
  /** localStorage key prefix. Default: 'instant-local' */
  storageKey?: string
  /** Schema definition — only `links` are used for association resolution */
  schema?: { entities?: any; links?: Record<string, any>; rooms?: any }
  /** Log all operations to console */
  verbose?: boolean
}

type AuthPayload = { user: any } | { error: any }
type AuthCallback = (_payload: AuthPayload) => void
type QueryCallback = (_result: { data?: Record<string, any[]>; error?: any }) => void

// ── Factory ─────────────────────────────────────────────────────────────

export function createLocalInstantDB(options: LocalInstantDBOptions = {}) {
  const storageKey = options.storageKey || 'instant-local'
  const verbose = options.verbose || false
  const linkDefs = options.schema?.links || {}

  const store = new LocalStore(storageKey)
  const tx = createTxProxy()

  // ── Auth state ──────────────────────────────────────────────────────

  const authStorageKey = `${storageKey}:auth`
  const authSubscribers = new Set<AuthCallback>()

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
      role: 'corporate_admin' as const,
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

  let currentUser: any = (() => {
    if (typeof localStorage === 'undefined') return defaultUser
    try {
      const raw = localStorage.getItem(authStorageKey)
      if (!raw) return defaultUser
      const parsed = JSON.parse(raw)
      return parsed && typeof parsed === 'object' ? parsed : defaultUser
    } catch {
      return defaultUser
    }
  })()

  const emitAuth = () => {
    authSubscribers.forEach((cb) => {
      try {
        cb({ user: currentUser })
      } catch {
        /* subscriber error — swallow */
      }
    })
  }

  const persistAuth = () => {
    if (typeof localStorage === 'undefined') return
    try {
      if (currentUser) {
        localStorage.setItem(authStorageKey, JSON.stringify(currentUser))
      } else {
        localStorage.removeItem(authStorageKey)
      }
    } catch {
      /* storage unavailable */
    }
  }

  if (currentUser?.id === demoUsers.admin.id && currentUser?.role !== demoUsers.admin.role) {
    currentUser = { ...currentUser, role: demoUsers.admin.role }
    persistAuth()
  }

  // ── Query helpers ───────────────────────────────────────────────────

  const runQuery = (query: Record<string, any>): Record<string, any[]> => {
    return executeQuery(store, query, linkDefs)
  }

  const notifySubscribers = (affectedNamespaces: Set<string>) => {
    for (const sub of store.getSubscriptions()) {
      const isAffected = [...sub.namespaces].some((ns) => affectedNamespaces.has(ns))
      if (isAffected) {
        try {
          const data = runQuery(sub.query)
          sub.callback({ data })
        } catch (error) {
          sub.callback({ error })
        }
      }
    }
  }

  // ── Public API (matches InstantDB) ──────────────────────────────────

  const subscribeQuery = (query: Record<string, any>, callback: QueryCallback): (() => void) => {
    if (verbose) console.log('[instant-local] subscribeQuery:', JSON.stringify(query))

    const subId = store.addSubscription(query, callback)

    // Fire initial data asynchronously (matches real InstantDB behavior)
    void Promise.resolve().then(() => {
      try {
        const data = runQuery(query)
        callback({ data })
      } catch (error) {
        callback({ error })
      }
    })

    return () => {
      store.removeSubscription(subId)
    }
  }

  const queryOnce = async (
    query: Record<string, any>,
  ): Promise<{ data: Record<string, any[]>; pageInfo?: any }> => {
    if (verbose) console.log('[instant-local] queryOnce:', JSON.stringify(query))
    const data = runQuery(query)
    return { data }
  }

  const transact = async (chunks: TxChunk | TxChunk[]): Promise<void> => {
    const chunkArray = Array.isArray(chunks) ? chunks : [chunks]

    if (verbose) {
      const summary = chunkArray.map((c: any) => `${c?.namespace}[${c?.entityId}].${c?.actions?.map((a: any) => a.type).join('+')}`)
      console.log('[instant-local] transact:', summary)
    }

    const affectedNamespaces = processTransactions(store, chunkArray, linkDefs)
    store.persist()
    notifySubscribers(affectedNamespaces)
  }

  /**
   * subscribeAuth — fires callback synchronously with current user
   * (matches the existing mock behavior that useInstantAuth depends on).
   */
  const subscribeAuth = (callback: AuthCallback): (() => void) => {
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
    persistAuth()
    emitAuth()
  }

  const signInWithIdToken = async (_args: any) => {
    currentUser = {
      ...defaultUser,
      id:
        'demo-user-' +
        (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : Date.now()),
    }
    persistAuth()
    emitAuth()
  }

  const switchUser = (userKey: keyof typeof demoUsers) => {
    const newUser = demoUsers[userKey]
    if (!newUser) return
    currentUser = { ...newUser }
    persistAuth()
    emitAuth()
    if (typeof window !== 'undefined') {
      window.location.reload()
    }
  }

  const getAuth = async () => currentUser

  // ── Return db instance ──────────────────────────────────────────────

  return {
    // InstantDB-compatible API
    subscribeQuery,
    queryOnce,
    transact,
    tx,
    subscribeAuth,
    auth: {
      signOut,
      signInWithIdToken,
    },
    getAuth,

    // Dev-only helpers (not in real InstantDB SDK — remove on migration)
    demoUsers,
    switchUser,

    // Internal store access for seeding and debugging
    _store: store,
  } as any
}

/**
 * Generate a UUID — matches InstantDB's `id()` export.
 */
export function id(): string {
  return crypto.randomUUID()
}

export type { TxChunk } from './tx'
