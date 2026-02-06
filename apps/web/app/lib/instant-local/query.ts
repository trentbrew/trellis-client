/**
 * InstaQL-compatible query engine for the local store.
 *
 * Supports the same query language as InstantDB:
 *   - Fetch all:          { goals: {} }
 *   - Where (equality):   { goals: { $: { where: { title: 'eat' } } } }
 *   - Where (operators):  { goals: { $: { where: { priority: { $gt: 2 } } } } }
 *   - Logical:            { goals: { $: { where: { or: [...], and: [...] } } } }
 *   - Nested assoc:       { goals: { todos: {} } }
 *   - Pagination:         { goals: { $: { limit: 10, offset: 5, order: { createdAt: 'desc' } } } }
 *
 * Migration: When switching to real InstantDB, this file is no longer needed.
 */

import type { LocalStore } from './store'

interface WhereClause {
  [key: string]: any
}

interface QueryOptions {
  where?: WhereClause
  limit?: number
  offset?: number
  order?: Record<string, 'asc' | 'desc'>
}

/**
 * Execute an InstaQL query against the local store.
 */
export function executeQuery(
  store: LocalStore,
  query: Record<string, any>,
  linkDefs?: Record<string, any>,
): Record<string, any[]> {
  const result: Record<string, any[]> = {}

  for (const [namespace, queryDef] of Object.entries(query)) {
    if (queryDef === undefined) continue

    let entities = store.getAll(namespace)

    const options: QueryOptions = queryDef?.$ || {}

    if (options.where) {
      entities = entities.filter((entity) => matchesWhere(entity, options.where!))
    }

    if (options.order) {
      entities = applyOrder(entities, options.order)
    }

    if (typeof options.offset === 'number' && options.offset > 0) {
      entities = entities.slice(options.offset)
    }
    if (typeof options.limit === 'number' && options.limit > 0) {
      entities = entities.slice(0, options.limit)
    }

    // Resolve nested associations
    const nestedKeys = Object.keys(queryDef).filter((k) => k !== '$')
    if (nestedKeys.length > 0 && linkDefs) {
      entities = entities.map((entity) => {
        const withAssociations = { ...entity }
        for (const nestedKey of nestedKeys) {
          withAssociations[nestedKey] = resolveAssociation(
            store,
            namespace,
            entity.id,
            nestedKey,
            queryDef[nestedKey],
            linkDefs,
          )
        }
        return withAssociations
      })
    }

    result[namespace] = entities
  }

  return result
}

// ── Where clause matching ───────────────────────────────────────────────

function matchesWhere(entity: Record<string, any>, where: WhereClause): boolean {
  for (const [key, condition] of Object.entries(where)) {
    if (key === 'and') {
      if (!Array.isArray(condition)) return false
      if (!condition.every((clause: WhereClause) => matchesWhere(entity, clause))) return false
      continue
    }

    if (key === 'or') {
      if (!Array.isArray(condition)) return false
      if (!condition.some((clause: WhereClause) => matchesWhere(entity, clause))) return false
      continue
    }

    // Dot-notation for association filtering (e.g., 'todos.title')
    // Requires link resolution — skip for now, will match everything
    if (key.includes('.')) continue

    // Operator object: { $gt: 5, $in: [...] }
    if (condition !== null && typeof condition === 'object' && !Array.isArray(condition)) {
      if (!matchesOperator(entity[key], condition)) return false
      continue
    }

    // Simple equality
    if (entity[key] !== condition) return false
  }

  return true
}

function matchesOperator(value: any, operators: Record<string, any>): boolean {
  for (const [op, expected] of Object.entries(operators)) {
    switch (op) {
      case '$in':
        if (!Array.isArray(expected) || !expected.includes(value)) return false
        break
      case '$ne':
        if (value === expected) return false
        break
      case '$gt':
        if (!(value > expected)) return false
        break
      case '$lt':
        if (!(value < expected)) return false
        break
      case '$gte':
        if (!(value >= expected)) return false
        break
      case '$lte':
        if (!(value <= expected)) return false
        break
      case '$like': {
        if (typeof value !== 'string' || typeof expected !== 'string') return false
        const pattern = expected
          .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
          .replace(/%/g, '.*')
          .replace(/_/g, '.')
        if (!new RegExp(`^${pattern}$`, 'i').test(value)) return false
        break
      }
      case '$isNull':
        if (expected === true && value != null) return false
        if (expected === false && value == null) return false
        break
      default:
        break
    }
  }
  return true
}

// ── Ordering ────────────────────────────────────────────────────────────

function applyOrder(entities: any[], order: Record<string, 'asc' | 'desc'>): any[] {
  const entries = Object.entries(order)
  if (entries.length === 0) return entities

  return [...entities].sort((a, b) => {
    for (const [field, direction] of entries) {
      const aVal = a[field]
      const bVal = b[field]
      if (aVal === bVal) continue
      if (aVal == null) return direction === 'asc' ? 1 : -1
      if (bVal == null) return direction === 'asc' ? -1 : 1
      const cmp = aVal < bVal ? -1 : 1
      return direction === 'asc' ? cmp : -cmp
    }
    return 0
  })
}

// ── Association resolution ──────────────────────────────────────────────

function resolveAssociation(
  store: LocalStore,
  fromNs: string,
  fromId: string,
  label: string,
  nestedQuery: any,
  linkDefs: Record<string, any>,
): any[] {
  const linkDef = findLinkDef(linkDefs, fromNs, label)
  if (!linkDef) return []

  const linkedIds = store.getLinks(fromNs, fromId, label)
  if (linkedIds.length === 0) return []

  let targets = linkedIds
    .map((id) => store.get(linkDef.targetNamespace, id))
    .filter((e): e is Record<string, any> & { id: string } => e != null)

  const options: QueryOptions = nestedQuery?.$ || {}
  if (options.where) {
    targets = targets.filter((entity) => matchesWhere(entity, options.where!))
  }
  if (options.order) {
    targets = applyOrder(targets, options.order)
  }
  if (typeof options.offset === 'number' && options.offset > 0) {
    targets = targets.slice(options.offset)
  }
  if (typeof options.limit === 'number' && options.limit > 0) {
    targets = targets.slice(0, options.limit)
  }

  return targets
}

function findLinkDef(
  linkDefs: Record<string, any>,
  fromNs: string,
  label: string,
): { targetNamespace: string; direction: 'forward' | 'reverse' } | null {
  for (const def of Object.values(linkDefs)) {
    if (def.forward?.on === fromNs && def.forward?.label === label) {
      return { targetNamespace: def.reverse.on, direction: 'forward' }
    }
    if (def.reverse?.on === fromNs && def.reverse?.label === label) {
      return { targetNamespace: def.forward.on, direction: 'reverse' }
    }
  }
  return null
}
