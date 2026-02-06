/**
 * InstantDB-compatible transaction proxy and processor.
 *
 * Builds transaction chunks via the same Proxy pattern as InstantDB:
 *   db.tx.goals[id()].create({ title: 'eat' })
 *   db.tx.goals[id()].update({ title: 'sleep' }).link({ todos: workoutId })
 *
 * Migration: When switching to real InstantDB, this file is no longer needed —
 * the real SDK's `db.tx` proxy replaces it.
 */

import type { LocalStore } from './store'

// ── Types ───────────────────────────────────────────────────────────────

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

// ── Proxy builder ───────────────────────────────────────────────────────

/**
 * Creates a Proxy matching InstantDB's `db.tx.NAMESPACE[id].action(data)` pattern.
 * Each action returns the same chunk for chaining.
 */
export function createTxProxy(): any {
  return new Proxy(
    {},
    {
      get(_target, namespace: string) {
        return new Proxy(
          {},
          {
            get(_target2, entityId: string) {
              return createActionChain(namespace, entityId)
            },
          },
        )
      },
    },
  )
}

function createActionChain(namespace: string, entityId: string): TxChunk {
  const chunk: TxChunk = {
    __txChunk: true,
    namespace,
    entityId,
    actions: [],
  }

  const handler: ProxyHandler<TxChunk> = {
    get(target, prop: string) {
      if (prop === '__txChunk' || prop === 'namespace' || prop === 'entityId' || prop === 'actions') {
        return target[prop as keyof TxChunk]
      }

      // Symbol properties (e.g. Symbol.toPrimitive) — return undefined
      if (typeof prop === 'symbol') return undefined

      const actionMethod = (type: TxAction['type']) => {
        return (...args: any[]) => {
          const action: TxAction = { type }
          if (type === 'update' && args.length >= 2) {
            action.data = args[0]
            action.opts = args[1]
          } else if (args[0] !== undefined) {
            action.data = args[0]
          }
          target.actions.push(action)
          return new Proxy(target, handler)
        }
      }

      switch (prop) {
        case 'create':
          return actionMethod('create')
        case 'update':
          return actionMethod('update')
        case 'merge':
          return actionMethod('merge')
        case 'delete':
          return () => {
            target.actions.push({ type: 'delete' })
            return new Proxy(target, handler)
          }
        case 'link':
          return actionMethod('link')
        case 'unlink':
          return actionMethod('unlink')
        default:
          return undefined
      }
    },
  }

  return new Proxy(chunk, handler)
}

// ── Transaction processor ───────────────────────────────────────────────

/**
 * Apply an array of transaction chunks to the store.
 * Returns the set of namespaces that were modified.
 */
export function processTransactions(
  store: LocalStore,
  chunks: TxChunk[],
  linkDefs?: Record<string, any>,
): Set<string> {
  const affected = new Set<string>()

  for (const chunk of chunks) {
    if (!chunk || !(chunk as any).__txChunk) continue

    const { namespace, entityId, actions } = chunk
    affected.add(namespace)

    for (const action of actions) {
      switch (action.type) {
        case 'create': {
          store.set(namespace, entityId, action.data || {})
          break
        }

        case 'update': {
          const existing = store.get(namespace, entityId)
          const upsert = action.opts?.upsert !== false
          if (existing) {
            store.set(namespace, entityId, { ...existing, ...action.data, id: entityId })
          } else if (upsert) {
            store.set(namespace, entityId, action.data || {})
          }
          break
        }

        case 'merge': {
          store.merge(namespace, entityId, action.data || {})
          break
        }

        case 'delete': {
          store.delete(namespace, entityId)
          break
        }

        case 'link': {
          if (action.data && linkDefs) {
            for (const [label, targetIds] of Object.entries(action.data)) {
              const ids = Array.isArray(targetIds) ? targetIds : [targetIds]
              for (const targetId of ids) {
                store.addLink(namespace, entityId, label, targetId)
                const reverse = findReverseLink(linkDefs, namespace, label)
                if (reverse) {
                  store.addLink(reverse.namespace, targetId, reverse.label, entityId)
                  affected.add(reverse.namespace)
                }
              }
            }
          }
          break
        }

        case 'unlink': {
          if (action.data && linkDefs) {
            for (const [label, targetIds] of Object.entries(action.data)) {
              const ids = Array.isArray(targetIds) ? targetIds : [targetIds]
              for (const targetId of ids) {
                store.removeLink(namespace, entityId, label, targetId)
                const reverse = findReverseLink(linkDefs, namespace, label)
                if (reverse) {
                  store.removeLink(reverse.namespace, targetId, reverse.label, entityId)
                  affected.add(reverse.namespace)
                }
              }
            }
          }
          break
        }
      }
    }
  }

  return affected
}

function findReverseLink(
  linkDefs: Record<string, any>,
  fromNs: string,
  label: string,
): { namespace: string; label: string } | null {
  for (const def of Object.values(linkDefs)) {
    if (def.forward?.on === fromNs && def.forward?.label === label) {
      return { namespace: def.reverse.on, label: def.reverse.label }
    }
    if (def.reverse?.on === fromNs && def.reverse?.label === label) {
      return { namespace: def.forward.on, label: def.forward.label }
    }
  }
  return null
}
