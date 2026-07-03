/**
 * DataAdapter — unified interface for Trellis data backends.
 *
 * Two implementations:
 *   - LocalAdapter  (self-hosted): instant-local + TQL kernel
 *   - CloudAdapter  (hosted):      @instantdb/core with real auth & sync
 *
 * Every composable talks to this interface via `useInstantDb()`.
 * The active implementation is injected by `plugins/instant.client.ts`
 * based on the `TRELLIS_DATA_MODE` env var.
 */

// ── Callback types ──────────────────────────────────────────────────────

export type AuthUser = {
  id: string
  email?: string | null
  name?: string | null
  avatar?: string | null
  role?: string | null
}

export type AuthPayload = { user: AuthUser | null } | { error: any }
export type AuthCallback = (_payload: AuthPayload) => void

export type QueryResult = { data?: Record<string, any[]>; error?: any }
export type QueryCallback = (_result: QueryResult) => void

// ── Transaction types (mirrors instant-local/tx.ts) ─────────────────────

export interface TxAction {
  type: 'create' | 'update' | 'merge' | 'delete' | 'link' | 'unlink'
  data?: Record<string, any>
  opts?: Record<string, any>
}

export interface TxChunk {
  __txChunk: true
  namespace: string
  entityId: string
  actions: TxAction[]
}

// ── DataAdapter interface ───────────────────────────────────────────────

export type DataMode = 'local' | 'cloud'

export interface DataAdapter {
  /** Which mode this adapter is running in. */
  readonly mode: DataMode

  /**
   * Where entities are stored.
   * - 'tql'     → entities live in the TQL kernel (server-side SQLite)
   * - 'adapter' → entities live in this adapter's database (e.g. InstantDB)
   */
  readonly entityBackend: 'tql' | 'adapter'

  /**
   * Where user ontologies are stored.
   * - 'tql'     → user ontologies stored as TQL EAV facts
   * - 'adapter' → user ontologies stored in this adapter's database
   */
  readonly ontologyBackend: 'tql' | 'adapter'

  // ── Queries ─────────────────────────────────────────────────────────

  /** Subscribe to a reactive query. Returns an unsubscribe function. */
  subscribeQuery(_query: Record<string, any>, _callback: QueryCallback): () => void

  /** One-shot query. Returns data directly. */
  queryOnce(_query: Record<string, any>): Promise<{ data: Record<string, any[]>; pageInfo?: any }>

  // ── Mutations ───────────────────────────────────────────────────────

  /** Execute one or more transaction chunks. */
  transact(_chunks: TxChunk | TxChunk[]): Promise<void>

  /** Transaction proxy — `db.tx.namespace[id].action(data)` */
  readonly tx: any

  // ── Auth ────────────────────────────────────────────────────────────

  /** Subscribe to auth state changes. Returns an unsubscribe function. */
  subscribeAuth(_callback: AuthCallback): () => void

  /** Auth actions (sign out, sign in, magic codes). */
  readonly auth: {
    signOut(): Promise<void>
    signInWithIdToken(_args: any): Promise<void>
    signInWithCustomToken?(_token: string): Promise<void>
    sendMagicCode(_args: any): Promise<void>
    verifyMagicCode(_args: any): Promise<void>
  }

  /** Get current auth user (async). */
  getAuth(): Promise<AuthUser | null>

  // ── Internal / dev helpers ──────────────────────────────────────────

  /** Raw underlying database instance — only available on CloudAdapter.
   *  Used for features not in the DataAdapter interface (e.g. rooms/presence). */
  readonly _rawDb?: any

  /** Internal store access — only available on LocalAdapter. */
  readonly _store?: any

  /** Demo user helpers — only available on LocalAdapter in dev mode. */
  readonly demoUsers?: Record<string, AuthUser>
  switchUser?(_userKey: string): void
  updateCurrentUser?(_patch: Partial<AuthUser> & Record<string, unknown>): void
}
