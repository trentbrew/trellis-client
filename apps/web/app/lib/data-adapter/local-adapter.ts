/**
 * LocalAdapter — self-hosted data backend.
 *
 * Wraps the existing `instant-local` adapter as a DataAdapter.
 * Zero behavior change — this is a pure refactor to introduce the interface.
 *
 * Platform data (orgs, apps, collections, settings) → localStorage via instant-local
 * Entities → TQL kernel via /api/graph/* (unchanged)
 * User ontologies → TQL EAV facts via /api/graph/ontology (unchanged)
 * Auth → synthetic local user (no login required, Obsidian-like)
 */

import { createLocalInstantDB } from '~/lib/instant-local'
import type { LocalInstantDBOptions } from '~/lib/instant-local'
import type { DataAdapter, AuthCallback, QueryCallback, TxChunk, AuthUser } from './types'

export interface LocalAdapterOptions extends LocalInstantDBOptions {
  /** Override the default local user identity. */
  localUser?: AuthUser
}

export function createLocalAdapter(options: LocalAdapterOptions = {}): DataAdapter {
  const db = createLocalInstantDB(options)

  const adapter: DataAdapter = {
    mode: 'local',
    entityBackend: 'tql',
    ontologyBackend: 'tql',

    subscribeQuery(query: Record<string, any>, callback: QueryCallback): () => void {
      return db.subscribeQuery(query, callback)
    },

    async queryOnce(query: Record<string, any>) {
      return db.queryOnce(query)
    },

    async transact(chunks: TxChunk | TxChunk[]) {
      return db.transact(chunks)
    },

    get tx() {
      return db.tx
    },

    subscribeAuth(callback: AuthCallback): () => void {
      return db.subscribeAuth(callback)
    },

    get auth() {
      return db.auth
    },

    async getAuth() {
      return db.getAuth()
    },

    // Dev-only helpers (passthrough from instant-local)
    get _store() {
      return db._store
    },

    get demoUsers() {
      return db.demoUsers
    },

    switchUser(userKey: string) {
      db.switchUser(userKey as any)
    },

    updateCurrentUser(patch: Partial<AuthUser> & Record<string, unknown>) {
      db.updateCurrentUser(patch)
    },
  }

  return adapter
}
