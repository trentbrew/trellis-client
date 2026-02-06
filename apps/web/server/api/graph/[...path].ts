/**
 * TQL Graph API
 *
 * REST endpoints for querying and mutating the TrellisKernel graph.
 *
 * Routes:
 *   POST /api/graph/query       — Execute EQL-S or Datalog query
 *   POST /api/graph/mutate      — Create/update/delete nodes, link/unlink
 *   GET  /api/graph/node/:id    — Fetch a single node with its links
 *   GET  /api/graph/ontologies  — List registered ontologies
 *   GET  /api/graph/catalog     — Auto-generated catalog from EAV store
 *   GET  /api/graph/health      — Health check
 */

export default defineEventHandler(async (event) => {
  const kernel = event.context.nitroApp?.tql
  if (!kernel) {
    throw createError({ statusCode: 503, message: 'TQL kernel not initialized' })
  }

  const method = event.method
  const path = event.context.params?.path || ''
  const segments = path.split('/').filter(Boolean)
  const route = segments[0] || ''

  // ─── GET /api/graph/health ──────────────────────────────────────────
  if (method === 'GET' && route === 'health') {
    const store = kernel.getStore()
    let factCount = 0
    for (const _ of store.getAllFacts()) factCount++
    let linkCount = 0
    for (const _ of store.getAllLinks()) linkCount++

    return {
      status: 'ok',
      factCount,
      linkCount,
    }
  }

  // ─── GET /api/graph/ontologies ──────────────────────────────────────
  if (method === 'GET' && route === 'ontologies') {
    const workspace = await kernel.exportWorkspace()
    return {
      ontologies: workspace.workspace.ontologies || {},
    }
  }

  // ─── GET /api/graph/catalog ─────────────────────────────────────────
  if (method === 'GET' && route === 'catalog') {
    const store = kernel.getStore()
    return {
      catalog: store.getCatalog(),
    }
  }

  // ─── GET /api/graph/projections ─────────────────────────────────────
  if (method === 'GET' && route === 'projections') {
    return {
      projections: kernel.listProjections(),
    }
  }

  // ─── GET /api/graph/node/:id ────────────────────────────────────────
  if (method === 'GET' && route === 'node') {
    const entityId = segments.slice(1).join('/')
    if (!entityId) {
      throw createError({ statusCode: 400, message: 'Missing entity ID' })
    }

    const store = kernel.getStore()
    const facts = store.getFactsByEntity(entityId)

    if (facts.length === 0) {
      throw createError({ statusCode: 404, message: `Entity not found: ${entityId}` })
    }

    // Reconstruct node from facts
    const node: Record<string, any> = { '@id': entityId }
    for (const fact of facts) {
      if (fact.a === 'type') {
        node['@type'] = fact.v
      } else {
        node[fact.a] = fact.v
      }
    }

    // Get linked entities
    const links = store.getAllLinks()
    const outgoing: Array<{ relation: string; target: string }> = []
    const incoming: Array<{ relation: string; source: string }> = []

    for (const link of links) {
      if (link.e1 === entityId) {
        outgoing.push({ relation: link.a, target: link.e2 })
      }
      if (link.e2 === entityId) {
        incoming.push({ relation: link.a, source: link.e1 })
      }
    }

    return {
      node,
      links: { outgoing, incoming },
    }
  }

  // ─── POST /api/graph/query ──────────────────────────────────────────
  if (method === 'POST' && route === 'query') {
    const body = await readBody(event)
    const { query, projection } = body || {}

    // Execute a named projection
    if (projection) {
      try {
        const result = await kernel.executeProjection(projection)
        return { data: result.rows, meta: { executionTime: result.executionTime, plan: result.plan } }
      } catch (err: any) {
        throw createError({ statusCode: 400, message: err.message })
      }
    }

    // Execute an EQL-S query string
    if (!query || typeof query !== 'string') {
      throw createError({ statusCode: 400, message: 'Request body must include "query" (EQL-S string) or "projection" (projection ID)' })
    }

    try {
      const result = await kernel.query(query)
      return {
        data: result.rows,
        meta: {
          executionTime: result.executionTime,
          plan: result.plan,
          trace: result.trace,
        },
      }
    } catch (err: any) {
      throw createError({ statusCode: 400, message: err.message })
    }
  }

  // ─── POST /api/graph/mutate ─────────────────────────────────────────
  if (method === 'POST' && route === 'mutate') {
    const body = await readBody(event)
    const { action, entityId, data, type, e1, relation, e2 } = body || {}

    if (!action) {
      throw createError({ statusCode: 400, message: 'Missing "action" in request body' })
    }

    try {
      switch (action) {
        case 'createNode': {
          if (!entityId || !type) {
            throw createError({ statusCode: 400, message: 'createNode requires "entityId" and "type"' })
          }
          await kernel.createNode(entityId, data || {}, type)
          return { ok: true, entityId }
        }

        case 'updateNode': {
          if (!entityId || !type) {
            throw createError({ statusCode: 400, message: 'updateNode requires "entityId" and "type"' })
          }
          await kernel.updateNode(entityId, data || {}, type)
          return { ok: true, entityId }
        }

        case 'deleteNode': {
          if (!entityId) {
            throw createError({ statusCode: 400, message: 'deleteNode requires "entityId"' })
          }
          await kernel.deleteNode(entityId)
          return { ok: true, entityId }
        }

        case 'link': {
          if (!e1 || !relation || !e2) {
            throw createError({ statusCode: 400, message: 'link requires "e1", "relation", and "e2"' })
          }
          await kernel.link(e1, relation, e2)
          return { ok: true, e1, relation, e2 }
        }

        default:
          throw createError({ statusCode: 400, message: `Unknown action: ${action}` })
      }
    } catch (err: any) {
      if (err.statusCode) throw err
      throw createError({ statusCode: 500, message: err.message })
    }
  }

  throw createError({ statusCode: 404, message: `Unknown graph API route: ${method} /api/graph/${path}` })
})
