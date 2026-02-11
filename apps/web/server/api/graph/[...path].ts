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

import { useTqlKernel, useWorkspaceConfig, getMutationLog, pushMutationLog } from '../../plugins/tql'
import { emitMutation } from '../../utils/tql-events'

/** Reconstruct a node object from EAV facts, properly handling multi-value attributes */
function factsToNode(entityId: string, facts: Array<{ e: string; a: string; v: unknown }>): Record<string, any> {
  const node: Record<string, any> = { '@id': entityId }
  const attrCounts: Record<string, number> = {}
  for (const fact of facts) {
    attrCounts[fact.a] = (attrCounts[fact.a] || 0) + 1
  }
  for (const fact of facts) {
    if (fact.a === 'type') {
      node['@type'] = fact.v
    } else if (attrCounts[fact.a]! > 1) {
      if (!Array.isArray(node[fact.a])) {
        node[fact.a] = []
      }
      node[fact.a].push(fact.v)
    } else {
      node[fact.a] = fact.v
    }
  }
  return node
}

export default defineEventHandler(async (event) => {
  let kernel
  try {
    kernel = useTqlKernel()
  } catch {
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

  // ─── GET /api/graph/config ────────────────────────────────────────
  // Returns the full workspace config: routes, projections, app metadata,
  // and ontologies. This is the single endpoint the client uses at boot
  // to replace the static app-config.jsonld.
  // Routes/app come from the stored workspace config; ontologies come
  // from the kernel (which may have runtime mutations).
  if (method === 'GET' && route === 'config') {
    const wsConfig = useWorkspaceConfig()
    const kernelWorkspace = await kernel.exportWorkspace()
    return {
      app: wsConfig.workspace.app || null,
      routes: wsConfig.workspace.routes || {},
      projections: kernelWorkspace.workspace.projections || {},
      ontologies: kernelWorkspace.workspace.ontologies || {},
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

    const node = factsToNode(entityId, facts)

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

  // ─── GET /api/graph/log ─────────────────────────────────────────
  if (method === 'GET' && route === 'log') {
    return { entries: getMutationLog().slice().reverse() }
  }

  // ─── POST /api/graph/nodes (batch) ──────────────────────────────────
  if (method === 'POST' && route === 'nodes') {
    const body = await readBody(event)
    const { ids } = body || {}

    if (!Array.isArray(ids) || ids.length === 0) {
      throw createError({ statusCode: 400, message: 'Request body must include "ids" (string[])' })
    }

    const store = kernel.getStore()
    const nodes: Record<string, any>[] = []

    for (const entityId of ids) {
      const facts = store.getFactsByEntity(entityId)
      if (facts.length > 0) {
        nodes.push(factsToNode(entityId, facts))
      }
    }

    return { nodes }
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
    const { action, entityId, data, type, e1, relation, e2, agentId } = body || {}
    const agent: string = agentId || 'browser'

    if (!action) {
      throw createError({ statusCode: 400, message: 'Missing "action" in request body' })
    }

    try {
      switch (action) {
        case 'createNode': {
          if (!entityId || !type) {
            throw createError({ statusCode: 400, message: 'createNode requires "entityId" and "type"' })
          }
          await kernel.createNode(entityId, data || {}, type, { agentId: agent })
          pushMutationLog({ action: 'createNode', entityId, type, data })
          emitMutation({ action: 'createNode', entityId, type, agentId: agent, data })
          return { ok: true, entityId }
        }

        case 'updateNode': {
          if (!entityId || !type) {
            throw createError({ statusCode: 400, message: 'updateNode requires "entityId" and "type"' })
          }
          await kernel.updateNode(entityId, data || {}, type, { agentId: agent })
          pushMutationLog({ action: 'updateNode', entityId, type, data })
          emitMutation({ action: 'updateNode', entityId, type, agentId: agent, data })
          return { ok: true, entityId }
        }

        case 'deleteNode': {
          if (!entityId) {
            throw createError({ statusCode: 400, message: 'deleteNode requires "entityId"' })
          }
          await kernel.deleteNode(entityId, { agentId: agent })
          pushMutationLog({ action: 'deleteNode', entityId })
          emitMutation({ action: 'deleteNode', entityId, agentId: agent })
          return { ok: true, entityId }
        }

        case 'link': {
          if (!e1 || !relation || !e2) {
            throw createError({ statusCode: 400, message: 'link requires "e1", "relation", and "e2"' })
          }
          await kernel.link(e1, relation, e2, { agentId: agent })
          pushMutationLog({ action: 'link', entityId: `${e1} -> ${e2}`, data: { relation } })
          emitMutation({ action: 'link', entityId: `${e1} -> ${e2}`, agentId: agent, data: { relation, e1, e2 } })
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

  // ─── GET /api/graph/ontology/:id ─────────────────────────────────────
  if (method === 'GET' && route === 'ontology') {
    const ontologyId = segments.slice(1).join('/')
    if (!ontologyId) {
      throw createError({ statusCode: 400, message: 'Missing ontology ID' })
    }

    const schema = kernel.getOntology(ontologyId)
    if (!schema) {
      throw createError({ statusCode: 404, message: `Ontology not found: ${ontologyId}` })
    }

    return { ontology: schema }
  }

  // ─── POST /api/graph/ontology ──────────────────────────────────────
  if (method === 'POST' && route === 'ontology') {
    const body = await readBody(event)
    const { schema, agentId } = body || {}
    const agent: string = agentId || 'browser'

    if (!schema || !schema['@id'] || !schema.version || !Array.isArray(schema.fields)) {
      throw createError({ statusCode: 400, message: 'Request body must include "schema" with @id, version, and fields[]' })
    }

    // Ensure @type is set
    schema['@type'] = 'trellis:Schema'

    try {
      await kernel.createOntology(schema, { agentId: agent })
      pushMutationLog({ action: 'createOntology', entityId: schema['@id'], data: { version: schema.version } })
      emitMutation({ action: 'createOntology', entityId: schema['@id'], type: 'ontology', agentId: agent, data: schema })
      return { ok: true, id: schema['@id'] }
    } catch (err: any) {
      throw createError({ statusCode: 409, message: err.message })
    }
  }

  // ─── PUT /api/graph/ontology/:id ───────────────────────────────────
  if (method === 'PUT' && route === 'ontology') {
    const ontologyId = segments.slice(1).join('/')
    if (!ontologyId) {
      throw createError({ statusCode: 400, message: 'Missing ontology ID' })
    }

    const body = await readBody(event)
    const { schema, agentId } = body || {}
    const agent: string = agentId || 'browser'

    if (!schema || !schema.version || !Array.isArray(schema.fields)) {
      throw createError({ statusCode: 400, message: 'Request body must include "schema" with version and fields[]' })
    }

    // Ensure IDs match
    schema['@id'] = ontologyId
    schema['@type'] = 'trellis:Schema'

    try {
      await kernel.updateOntology(schema, { agentId: agent })
      pushMutationLog({ action: 'updateOntology', entityId: ontologyId, data: { version: schema.version } })
      emitMutation({ action: 'updateOntology', entityId: ontologyId, type: 'ontology', agentId: agent, data: schema })
      return { ok: true, id: ontologyId }
    } catch (err: any) {
      if (err.message.includes('not found')) {
        throw createError({ statusCode: 404, message: err.message })
      }
      throw createError({ statusCode: 500, message: err.message })
    }
  }

  // ─── DELETE /api/graph/ontology/:id ────────────────────────────────
  if (method === 'DELETE' && route === 'ontology') {
    const ontologyId = segments.slice(1).join('/')
    if (!ontologyId) {
      throw createError({ statusCode: 400, message: 'Missing ontology ID' })
    }

    const body = await readBody(event).catch(() => ({}))
    const agent: string = body?.agentId || 'browser'

    try {
      await kernel.deleteOntology(ontologyId, { agentId: agent })
      pushMutationLog({ action: 'deleteOntology', entityId: ontologyId })
      emitMutation({ action: 'deleteOntology', entityId: ontologyId, type: 'ontology', agentId: agent })
      return { ok: true, id: ontologyId }
    } catch (err: any) {
      if (err.message.includes('not found')) {
        throw createError({ statusCode: 404, message: err.message })
      }
      throw createError({ statusCode: 500, message: err.message })
    }
  }

  throw createError({ statusCode: 404, message: `Unknown graph API route: ${method} /api/graph/${path}` })
})
