/**
 * CloudAdapter — InstantDB cloud data backend.
 *
 * Wraps the real `@instantdb/core` SDK as a DataAdapter.
 * Requires a valid InstantDB app ID and network connectivity.
 *
 * Platform data (orgs, apps, collections, settings) → InstantDB cloud
 * Entities → InstantDB entities namespace
 * User ontologies → InstantDB settings namespace
 * Core/system ontologies → TQL kernel (always, served via /api/graph/ontologies)
 * Auth → Real InstantDB auth (Google, email, magic link)
 */

import { init } from '@instantdb/core'
import type { DataAdapter, AuthCallback, QueryCallback, TxChunk, AuthUser } from './types'

export interface CloudAdapterOptions {
  /** InstantDB application ID (required). */
  appId: string
  /** InstantDB schema definition. */
  schema?: any
  /** Enable verbose logging. */
  verbose?: boolean
  /** Custom WebSocket URI (for self-hosted InstantDB). */
  websocketURI?: string
  /** Custom API URI (for self-hosted InstantDB). */
  apiURI?: string
  /** Show InstantDB devtools. Defaults to true in dev. */
  devtool?: boolean
}

export function createCloudAdapter(options: CloudAdapterOptions): DataAdapter {
  const { appId, schema, verbose, websocketURI, apiURI, devtool } = options

  if (!appId) {
    throw new Error('[CloudAdapter] appId is required. Set INSTANT_APP_ID in your .env file.')
  }

  // Only pass websocketURI/apiURI when explicitly provided.
  // When omitted, InstantDB defaults to its cloud servers (api.instantdb.com).
  // Passing `undefined` causes the SDK to resolve against the current page origin,
  // which breaks in dev (ws://localhost:<TRELLIS_PORT>/undefined).
  const initOpts: Record<string, any> = { appId, schema, verbose, devtool }
  if (websocketURI) initOpts.websocketURI = websocketURI
  if (apiURI) initOpts.apiURI = apiURI

  const db = init(initOpts as any)

  const adapter: DataAdapter = {
    mode: 'cloud',
    entityBackend: 'adapter',
    ontologyBackend: 'adapter',
    _rawDb: db,

    subscribeQuery(query: Record<string, any>, callback: QueryCallback): () => void {
      return db.subscribeQuery(query, (result: any) => {
        if (result.error) {
          callback({ error: result.error })
        } else {
          callback({ data: result.data })
        }
      })
    },

    async queryOnce(query: Record<string, any>) {
      const result = await db.queryOnce(query)
      return { data: result.data as Record<string, any[]>, pageInfo: (result as any).pageInfo }
    },

    async transact(chunks: TxChunk | TxChunk[]) {
      // The real InstantDB SDK expects its own tx chunks from db.tx,
      // not our local TxChunk format. In cloud mode, consumers should
      // use db.tx directly (which they already do via `useInstantDb().tx`).
      // This method is here for interface compliance.
      const chunkArray = Array.isArray(chunks) ? chunks : [chunks]
      await (db as any).transact(chunkArray)
    },

    get tx() {
      return (db as any).tx
    },

    subscribeAuth(callback: AuthCallback): () => void {
      return db.subscribeAuth((auth: any) => {
        if (auth.error) {
          callback({ error: auth.error })
        } else if (auth.user) {
          const user: AuthUser = {
            id: auth.user.id,
            email: auth.user.email || null,
            name: (auth.user as any).name || null,
            avatar: (auth.user as any).imageURL || (auth.user as any).avatar || null,
            role: null,
          }
          callback({ user })
        } else {
          callback({ user: null })
        }
      })
    },

    get auth() {
      return {
        async signOut() {
          await (db.auth as any).signOut()
        },
        async signInWithIdToken(args: any) {
          await (db.auth as any).signInWithIdToken(args)
        },
        async sendMagicCode(args: any) {
          await (db.auth as any).sendMagicCode(args)
        },
        async verifyMagicCode(args: any) {
          await (db.auth as any).signInWithMagicCode(args)
        },
      }
    },

    async getAuth() {
      try {
        // getAuth() returns the user object directly (not wrapped in { user })
        const user = await (db as any).getAuth()
        if (!user) return null
        return {
          id: user.id,
          email: user.email || null,
          name: (user as any).name || null,
          avatar: (user as any).imageURL || (user as any).avatar || null,
          role: null,
        }
      } catch {
        return null
      }
    },
  }

  return adapter
}
