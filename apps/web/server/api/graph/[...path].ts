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

import { getHeader } from 'h3'
import type { SchemaDefinition } from '@turtle.tech/tql'
import { useTrellisKernel, useWorkspaceConfig, getMutationLog, pushMutationLog } from '../../plugins/trellis-kernel'
import { getZoneGuardStats, getZoneGuardMode, checkMutation, recordStrictRejection } from '../../utils/zone-guard'
import { emitMutation } from '../../utils/trellis-events'
import { zoneFromRequest } from '../../utils/zone-router'
import { captureDecision, shouldCaptureDecision } from '../../utils/campus-decisions'
import { parseApiBody, parseApiQuery, validateApiInput } from '../../utils/api-validation'
import {
  GraphMutateBodySchema,
  GraphNodeParamsSchema,
  GraphNodesBodySchema,
  GraphOntologyCreateBodySchema,
  GraphOntologyDeleteBodySchema,
  GraphOntologyParamsSchema,
  GraphOntologyUpdateBodySchema,
  GraphQueryBodySchema,
  GraphSummaryQuerySchema,
} from '../../utils/graph-api-schemas'

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
    kernel = useTrellisKernel()
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
      zoneGuard: { mode: getZoneGuardMode(), ...getZoneGuardStats() },
    }
  }

  // ─── GET /api/graph/summary ─────────────────────────────────────────
  // Compact, deterministic graph overview for AI agents.
  // Replaces health + schema + catalog for orientation in a single call.
  if (method === 'GET' && route === 'summary') {
    const store = kernel.getStore()
    const { limit } = parseApiQuery(event, GraphSummaryQuerySchema)

    // Count facts and links
    let factCount = 0
    for (const _ of store.getAllFacts()) factCount++
    let linkCount = 0
    for (const _ of store.getAllLinks()) linkCount++

    // Count entities by type
    const typeCounts: Record<string, number> = {}
    const entityIds = new Set<string>()
    for (const fact of store.getAllFacts()) {
      if (fact.a === 'type' && fact.e.startsWith('entity:')) {
        typeCounts[String(fact.v)] = (typeCounts[String(fact.v)] || 0) + 1
        entityIds.add(fact.e)
      }
    }

    const entityTypes = Object.entries(typeCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([type, count]) => ({ type, count }))

    // Ontologies split by tier
    const allOntologies = kernel.listOntologies()
    const systemOntologies: string[] = []
    const userOntologies: string[] = []
    for (const schema of allOntologies) {
      const shortId = schema['@id'].replace(/^(trellis:schema\/|core:)/, '')
      if (schema?.tier === 'user') {
        userOntologies.push(shortId)
      } else if (schema?.tier !== 'core') {
        systemOntologies.push(shortId)
      }
    }

    // Top attributes from catalog (skip internal ones)
    const catalog: Array<{ attribute: string; distinctCount: number; cardinality: string }> = store.getCatalog() || []
    const SKIP_ATTRS = new Set(['@id', '@type', 'id'])
    const topAttributes = catalog
      .filter((c) => !SKIP_ATTRS.has(c.attribute))
      .sort((a, b) => b.distinctCount - a.distinctCount)
      .slice(0, limit)
      .map((c) => ({ attribute: c.attribute, distinctCount: c.distinctCount, cardinality: c.cardinality }))

    // Distinct link relations
    const relations = new Set<string>()
    for (const link of store.getAllLinks()) relations.add(link.a)

    // Recent mutations
    const recentMutations = getMutationLog()
      .slice()
      .reverse()
      .slice(0, 5)
      .map((m) => ({ action: m.action, entityId: m.entityId, timestamp: m.timestamp }))

    return {
      health: { status: 'ok', factCount, linkCount, entityCount: entityIds.size },
      entityTypes,
      ontologies: {
        total: allOntologies.length,
        system: systemOntologies,
        user: userOntologies,
      },
      topAttributes,
      links: { total: linkCount, relations: [...relations] },
      recentMutations,
    }
  }

  // ─── GET /api/graph/ontologies (alias: /api/graph/schema) ──────────
  if (method === 'GET' && (route === 'ontologies' || route === 'schema')) {
    const ontologies: Record<string, any> = {}
    for (const schema of kernel.listOntologies()) {
      ontologies[schema['@id']] = schema
    }
    return { ontologies }
  }

  // ─── GET /api/graph/config ────────────────────────────────────────
  // Returns the full workspace config: routes, projections, app metadata,
  // and ontologies. This is the single endpoint the client uses at boot
  // to replace the static app-config.jsonld.
  // Routes/app come from the stored workspace config; ontologies come
  // from the kernel (which may have runtime mutations).
  if (method === 'GET' && route === 'config') {
    const wsConfig = useWorkspaceConfig()
    const ontologies: Record<string, any> = {}
    for (const schema of kernel.listOntologies()) {
      ontologies[schema['@id']] = schema
    }
    const projections: Record<string, any> = {}
    for (const proj of kernel.listProjections()) {
      projections[proj['@id']] = proj
    }
    return {
      app: wsConfig.workspace.app || null,
      routes: wsConfig.workspace.routes || {},
      projections,
      ontologies,
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
    const { entityId } = validateApiInput(GraphNodeParamsSchema, { entityId: segments.slice(1).join('/') }, 'params')

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

  // ─── POST /api/graph/checkpoint ─────────────────────────────────
  // Persist a snapshot of the current kernel state so that subsequent
  // boots don't have to replay the full op gap. Without this, a dev
  // database with hundreds of thousands of ops will blow past Node's
  // heap and be killed by the OS (SIGKILL via macOS jetsam) during
  // replay.
  if (method === 'POST' && route === 'checkpoint') {
    try {
      await kernel.checkpoint()
      return { ok: true, timestamp: new Date().toISOString() }
    } catch (err: any) {
      throw createError({ statusCode: 500, message: err?.message || 'checkpoint failed' })
    }
  }

  // ─── POST /api/graph/nodes (batch) ──────────────────────────────────
  if (method === 'POST' && route === 'nodes') {
    const { ids } = await parseApiBody(event, GraphNodesBodySchema)

    const store = kernel.getStore()
    const nodes: Record<string, any>[] = []

    // Pre-index all links for O(1) lookup per entity
    const allLinks = store.getAllLinks()
    const outgoingByEntity = new Map<string, Array<{ relation: string; target: string }>>()
    const incomingByEntity = new Map<string, Array<{ relation: string; source: string }>>()
    for (const link of allLinks) {
      if (!outgoingByEntity.has(link.e1)) outgoingByEntity.set(link.e1, [])
      outgoingByEntity.get(link.e1)!.push({ relation: link.a, target: link.e2 })
      if (!incomingByEntity.has(link.e2)) incomingByEntity.set(link.e2, [])
      incomingByEntity.get(link.e2)!.push({ relation: link.a, source: link.e1 })
    }

    for (const entityId of ids) {
      const facts = store.getFactsByEntity(entityId)
      if (facts.length > 0) {
        const node = factsToNode(entityId, facts)
        node._links = {
          outgoing: outgoingByEntity.get(entityId) || [],
          incoming: incomingByEntity.get(entityId) || [],
        }
        nodes.push(node)
      }
    }

    return { nodes }
  }

  // ─── POST /api/graph/query ──────────────────────────────────────────
  if (method === 'POST' && route === 'query') {
    const { query, projection } = await parseApiBody(event, GraphQueryBodySchema)

    // Execute a named projection
    if (projection) {
      try {
        const result = await kernel.executeProjection(projection)
        return { data: result.rows, meta: { executionTime: result.executionTime, plan: result.plan } }
      } catch (err: any) {
        throw createError({ statusCode: 400, message: err.message })
      }
    }

    try {
      if (!query) {
        throw createError({
          statusCode: 400,
          message: 'Request body must include "query" (EQL-S string) or "projection" (projection ID)',
        })
      }
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
    const body = await parseApiBody(event, GraphMutateBodySchema)
    const { action, entityId, data, type, e1, relation, e2, agentId } = body
    const agent: string = agentId || 'browser'

    // Slice 0.5: resolve the originating zone from X-Trellis-Zone header
    // or the Referer pathname (falls back to the founder's Lab).
    const { zoneId, facilityId } = zoneFromRequest(event)

    // Slice 1.1: opt-in Decision auto-capture. Agents and CLI tools that
    // want provenance set the X-Trellis-Capture-Decision: 1 header (or
    // body.captureDecision = true). Browsers leave it off.
    const captureHeader = getHeader(event, 'x-trellis-capture-decision')
    const captureRequested = captureHeader === '1' || captureHeader === 'true' || body?.captureDecision === true

    // Slice 1.3: strict zone-guard pre-check. When TRELLIS_ZONE_GUARD_MODE
    // is "strict", reject denied mutations with 403 before they commit.
    // In "advisory" (default) and "off" modes, this is a pure no-op and
    // the post-hoc onMutation subscriber handles logging/stats.
    if (getZoneGuardMode() === 'strict' && action) {
      const { decision } = checkMutation(kernel, { action, agentId: agent, zoneId })
      if (!decision.allowed) {
        recordStrictRejection()
        console.warn(
          `[zone-guard] REJECT (strict) agent=${agent} action=${action} zone=${zoneId} reason="${decision.reason}"`,
        )
        throw createError({
          statusCode: 403,
          statusMessage: 'Forbidden',
          message: `Zone guard denied ${action} in ${zoneId}: ${decision.reason}`,
          data: { zoneId, facilityId, reason: decision.reason, mode: 'strict' },
        })
      }
    }

    /** Fire a decision-capture after a successful mutation. No-ops when
     *  captureRequested is false or the mutation targets a decision entity. */
    const maybeCapture = async (targetEntityId: string | undefined, targetType: string | undefined) => {
      const input = {
        action,
        agentId: agent,
        zoneId,
        facilityId,
        entityId: targetEntityId,
        entityType: targetType,
        toolInput: { action, entityId: targetEntityId, type: targetType, e1, relation, e2 },
      }
      if (!shouldCaptureDecision(input, captureRequested)) return
      await captureDecision(kernel, input)
    }

    try {
      switch (action) {
        case 'createNode': {
          const nodeData = data || {}
          if (!nodeData.ownerId) {
            nodeData.ownerId = agent
          }
          if (!nodeData.owner) {
            nodeData.owner = agent
          }
          // Slice 0.7: stamp new entities with their creation zone so
          // zone-aware queries work without replaying the op log.
          // Explicit data.zoneId (e.g. seeding) wins; otherwise derive
          // from the request context.
          if (!nodeData.zoneId) {
            nodeData.zoneId = zoneId
          }
          if (!nodeData.facilityId) {
            nodeData.facilityId = facilityId
          }
          await kernel.createNode(entityId, nodeData, type, { agentId: agent })
          pushMutationLog({ action: 'createNode', entityId, type, agentId: agent, zoneId, facilityId, data: nodeData })
          emitMutation({ action: 'createNode', entityId, type, agentId: agent, zoneId, facilityId, data: nodeData })
          await maybeCapture(entityId, typeof nodeData.type === 'string' ? nodeData.type : undefined)
          return { ok: true, entityId }
        }

        case 'updateNode': {
          const updateData = data || {}
          if (!updateData.ownerId) {
            updateData.ownerId = agent
          }
          if (!updateData.owner) {
            updateData.owner = agent
          }
          await kernel.updateNode(entityId, updateData, type, { agentId: agent })
          pushMutationLog({
            action: 'updateNode',
            entityId,
            type,
            agentId: agent,
            zoneId,
            facilityId,
            data: updateData,
          })
          emitMutation({ action: 'updateNode', entityId, type, agentId: agent, zoneId, facilityId, data: updateData })
          return { ok: true, entityId }
        }

        case 'deleteNode': {
          await kernel.deleteNode(entityId, { agentId: agent })
          pushMutationLog({ action: 'deleteNode', entityId, agentId: agent, zoneId, facilityId })
          emitMutation({ action: 'deleteNode', entityId, agentId: agent, zoneId, facilityId })
          await maybeCapture(entityId, undefined)
          return { ok: true, entityId }
        }

        case 'link': {
          await kernel.link(e1, relation, e2, { agentId: agent })
          pushMutationLog({
            action: 'link',
            entityId: `${e1} -> ${e2}`,
            agentId: agent,
            zoneId,
            facilityId,
            data: { relation },
          })
          emitMutation({
            action: 'link',
            entityId: `${e1} -> ${e2}`,
            agentId: agent,
            zoneId,
            facilityId,
            data: { relation, e1, e2 },
          })
          await maybeCapture(`${e1} -> ${e2}`, undefined)
          return { ok: true, e1, relation, e2 }
        }

        case 'unlink': {
          await kernel.unlink(e1, relation, e2, { agentId: agent })
          pushMutationLog({
            action: 'unlink',
            entityId: `${e1} -> ${e2}`,
            agentId: agent,
            zoneId,
            facilityId,
            data: { relation },
          })
          emitMutation({
            action: 'unlink',
            entityId: `${e1} -> ${e2}`,
            agentId: agent,
            zoneId,
            facilityId,
            data: { relation, e1, e2 },
          })
          await maybeCapture(`${e1} -> ${e2}`, undefined)
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
    const { ontologyId } = validateApiInput(
      GraphOntologyParamsSchema,
      { ontologyId: decodeURIComponent(segments.slice(1).join('/')) },
      'params',
    )

    const schema = kernel.getOntology(ontologyId)
    if (!schema) {
      throw createError({ statusCode: 404, message: `Ontology not found: ${ontologyId}` })
    }

    return { ontology: schema }
  }

  // ─── POST /api/graph/ontology ──────────────────────────────────────
  if (method === 'POST' && route === 'ontology') {
    const { schema, agentId } = await parseApiBody(event, GraphOntologyCreateBodySchema)
    const agent: string = agentId || 'browser'

    // Ensure @type is set
    const normalizedSchema = { ...schema, '@type': 'trellis:Schema' as const } as SchemaDefinition

    try {
      await kernel.createOntology(normalizedSchema, { agentId: agent })
      pushMutationLog({
        action: 'createOntology',
        entityId: normalizedSchema['@id'],
        data: { version: normalizedSchema.version },
      })
      emitMutation({
        action: 'createOntology',
        entityId: normalizedSchema['@id'],
        type: 'ontology',
        agentId: agent,
        data: normalizedSchema,
      })
      return { ok: true, id: normalizedSchema['@id'] }
    } catch (err: any) {
      throw createError({ statusCode: 409, message: err.message })
    }
  }

  // ─── PUT /api/graph/ontology/:id ───────────────────────────────────
  if (method === 'PUT' && route === 'ontology') {
    const { ontologyId } = validateApiInput(
      GraphOntologyParamsSchema,
      { ontologyId: decodeURIComponent(segments.slice(1).join('/')) },
      'params',
    )
    const { schema, agentId } = await parseApiBody(event, GraphOntologyUpdateBodySchema)
    const agent: string = agentId || 'browser'

    // Ensure IDs match
    const normalizedSchema = { ...schema, '@id': ontologyId, '@type': 'trellis:Schema' as const } as SchemaDefinition

    // Guard: reject duplicate field names
    const fieldNames = normalizedSchema.fields.map((f: any) => f.name)
    const dupes = fieldNames.filter((n: string, i: number) => fieldNames.indexOf(n) !== i)
    if (dupes.length > 0) {
      throw createError({ statusCode: 409, message: `Duplicate field name(s): ${dupes.join(', ')}` })
    }

    try {
      await kernel.updateOntology(normalizedSchema, { agentId: agent })
      pushMutationLog({ action: 'updateOntology', entityId: ontologyId, data: { version: normalizedSchema.version } })
      emitMutation({
        action: 'updateOntology',
        entityId: ontologyId,
        type: 'ontology',
        agentId: agent,
        data: normalizedSchema,
      })
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
    const { ontologyId } = validateApiInput(
      GraphOntologyParamsSchema,
      { ontologyId: decodeURIComponent(segments.slice(1).join('/')) },
      'params',
    )
    const { agentId } = await parseApiBody(event, GraphOntologyDeleteBodySchema)
    const agent: string = agentId || 'browser'

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

  // ─── POST /api/graph/backfill-integration-edges ────────────────────
  // One-shot backfill: scan all entities with a `source` attribute and
  // link them to the corresponding `integration_connection` node via a
  // `derivedFrom` edge. Idempotent thanks to EAV store link dedupe.
  //
  // Body: { dryRun?: boolean, agentId?: string }
  if (method === 'POST' && route === 'backfill-integration-edges') {
    const body = await readBody(event).catch(() => ({}))
    const agent: string = body?.agentId || 'backfill'
    const dryRun: boolean = !!body?.dryRun

    const store = kernel.getStore()

    // Known source → integrationId map. Extend as new integrations ship.
    // Keys are the `source` attribute values written by each sync path.
    const SOURCE_TO_INTEGRATION: Record<string, string> = {
      'google-calendar': 'google-calendar',
      'google-calendar-enrichment': 'google-calendar',
      gmail: 'gmail',
    }

    // 1. Collect integration_connection nodes, group by integrationId.
    // Prefer connections with connectionStatus='connected', else fall
    // back to the first one we find (connections in 'configuring' state
    // still represent a real user intent).
    const connByIntegration = new Map<string, { id: string; status: string }[]>()
    const factsByEntity = new Map<string, Array<{ a: string; v: unknown }>>()
    for (const fact of store.getAllFacts()) {
      if (!factsByEntity.has(fact.e)) factsByEntity.set(fact.e, [])
      factsByEntity.get(fact.e)!.push({ a: fact.a, v: fact.v })
    }

    for (const [entityId, facts] of factsByEntity) {
      // Entities have two 'type' facts: the kernel namespace ('entity')
      // and the user's data type. Use .some() to match either.
      const isConn = facts.some((f) => f.a === 'type' && f.v === 'integration_connection')
      if (!isConn) continue
      const integrationId = String(facts.find((f) => f.a === 'integrationId')?.v || '')
      if (!integrationId) continue
      const status = String(facts.find((f) => f.a === 'connectionStatus')?.v || 'configuring')
      if (!connByIntegration.has(integrationId)) connByIntegration.set(integrationId, [])
      connByIntegration.get(integrationId)!.push({ id: entityId, status })
    }

    // Optional explicit mapping from the caller: integrationId → connection entity id.
    // Use this when there are multiple connections for the same integration
    // and you want to disambiguate the auto-linking target.
    const defaultsFromBody: Record<string, string> = body?.defaultByIntegration || {}

    // Resolve a single canonical connection per integration only when there's
    // exactly one active connection OR the caller explicitly chose one.
    // Multi-connection integrations without an explicit default will skip
    // orphans that don't carry a `connectionId` attribute — safer than
    // blindly attributing events to the wrong account.
    const singleConn = new Map<string, string>()
    for (const [integrationId, conns] of connByIntegration) {
      if (defaultsFromBody[integrationId]) {
        singleConn.set(integrationId, defaultsFromBody[integrationId]!)
        continue
      }
      const connected = conns.filter((c) => c.status === 'connected')
      if (connected.length === 1) singleConn.set(integrationId, connected[0]!.id)
      else if (conns.length === 1) singleConn.set(integrationId, conns[0]!.id)
    }

    // Known set of all valid connection ids (for validating the
    // `connectionId` attribute we now write on each synced entity).
    const allConnIds = new Set<string>()
    for (const conns of connByIntegration.values()) {
      for (const c of conns) allConnIds.add(c.id)
    }

    // 2. Collect existing derivedFrom edges so we can report skipped counts.
    const existingDerivedFrom = new Map<string, Set<string>>() // e1 -> Set<e2>
    for (const link of store.getAllLinks()) {
      if (link.a !== 'derivedFrom') continue
      if (!existingDerivedFrom.has(link.e1)) existingDerivedFrom.set(link.e1, new Set())
      existingDerivedFrom.get(link.e1)!.add(link.e2)
    }

    const byIntegration: Record<
      string,
      {
        linked: number
        alreadyLinked: number
        noConnection: number
        ambiguous: number
      }
    > = {}
    let totalLinked = 0
    let totalAlreadyLinked = 0
    let totalNoConnection = 0
    let totalAmbiguous = 0

    // 3. Scan entities with a `source` attribute matching a known integration.
    for (const [entityId, facts] of factsByEntity) {
      if (!entityId.startsWith('entity:')) continue
      const sourceFact = facts.find((f) => f.a === 'source')
      if (!sourceFact) continue
      const source = String(sourceFact.v)
      const integrationId = SOURCE_TO_INTEGRATION[source]
      if (!integrationId) continue

      const bucket = (byIntegration[integrationId] ||= {
        linked: 0,
        alreadyLinked: 0,
        noConnection: 0,
        ambiguous: 0,
      })

      // Resolve target connection, preferring any attribute already written
      // by sync code. Fall back to the single/default connection lookup.
      const attrConnId = facts.find((f) => f.a === 'connectionId')?.v as string | undefined
      let connId: string | undefined
      if (attrConnId && allConnIds.has(attrConnId)) {
        connId = attrConnId
      } else if (singleConn.has(integrationId)) {
        connId = singleConn.get(integrationId)!
      }

      if (!connId) {
        const connCount = connByIntegration.get(integrationId)?.length || 0
        if (connCount === 0) {
          bucket.noConnection++
          totalNoConnection++
        } else {
          bucket.ambiguous++
          totalAmbiguous++
        }
        continue
      }

      if (existingDerivedFrom.get(entityId)?.has(connId)) {
        bucket.alreadyLinked++
        totalAlreadyLinked++
        continue
      }

      if (!dryRun) {
        try {
          await kernel.link(entityId, 'derivedFrom', connId, { agentId: agent })
          emitMutation({
            action: 'link',
            entityId: `${entityId} -> ${connId}`,
            agentId: agent,
            data: { relation: 'derivedFrom', e1: entityId, e2: connId },
          })
        } catch (err: any) {
          console.error(`[backfill] link failed for ${entityId} -> ${connId}:`, err.message)
          continue
        }
      }
      bucket.linked++
      totalLinked++
    }

    pushMutationLog({
      action: 'backfill-integration-edges',
      data: {
        linked: totalLinked,
        alreadyLinked: totalAlreadyLinked,
        noConnection: totalNoConnection,
        ambiguous: totalAmbiguous,
        dryRun,
      },
    })

    return {
      ok: true,
      dryRun,
      totals: {
        linked: totalLinked,
        alreadyLinked: totalAlreadyLinked,
        noConnection: totalNoConnection,
        ambiguous: totalAmbiguous,
      },
      byIntegration,
      connectionsByIntegration: Object.fromEntries(
        Array.from(connByIntegration.entries()).map(([k, v]) => [k, v.map((c) => ({ id: c.id, status: c.status }))]),
      ),
      autoResolved: Object.fromEntries(singleConn),
      hint:
        totalAmbiguous > 0
          ? 'Some entities could not be linked because multiple connections exist for their integration and they have no `connectionId` attribute. Pass `defaultByIntegration: { "<integrationId>": "<connection entity id>" }` in the body to resolve them, or re-sync from each connection so the sync code writes the attribute.'
          : undefined,
    }
  }

  // ─── POST /api/graph/backfill-gcal-attribution ─────────────────────
  // Multi-account GCal attribution: for each active google-calendar
  // connection, fetch its events from Google, build a map of
  // googleEventId → connection, and link each TQL event to the
  // connection that actually owns it. Idempotent.
  //
  // Body: { dryRun?: boolean, timeMin?: string, timeMax?: string, agentId?: string }
  if (method === 'POST' && route === 'backfill-gcal-attribution') {
    const body = await readBody(event).catch(() => ({}))
    const agent: string = body?.agentId || 'backfill-gcal'
    const dryRun: boolean = !!body?.dryRun
    // Default to a 2-year window centered on today. Widen if users have older data.
    const twoYearsMs = 2 * 365 * 24 * 60 * 60 * 1000
    const timeMin: string = body?.timeMin || new Date(Date.now() - twoYearsMs).toISOString()
    const timeMax: string = body?.timeMax || new Date(Date.now() + twoYearsMs).toISOString()

    const store = kernel.getStore()

    // 1. Enumerate connected google-calendar connections
    const gcalConns: Array<{ entityId: string; email: string }> = []
    const factsByEntity = new Map<string, Array<{ a: string; v: unknown }>>()
    for (const fact of store.getAllFacts()) {
      if (!factsByEntity.has(fact.e)) factsByEntity.set(fact.e, [])
      factsByEntity.get(fact.e)!.push({ a: fact.a, v: fact.v })
    }

    for (const [entityId, facts] of factsByEntity) {
      if (!facts.some((f) => f.a === 'type' && f.v === 'integration_connection')) continue
      const integrationId = String(facts.find((f) => f.a === 'integrationId')?.v || '')
      if (integrationId !== 'google-calendar') continue
      const status = String(facts.find((f) => f.a === 'connectionStatus')?.v || '')
      if (status !== 'connected') continue
      const email = String(facts.find((f) => f.a === 'accountEmail')?.v || '')
      gcalConns.push({ entityId, email })
    }

    if (gcalConns.length === 0) {
      return { ok: true, dryRun, message: 'No connected google-calendar connections found.', linked: 0 }
    }

    // 2. For each connection, list its calendars and fetch events.
    // Build: googleEventId → { connEntityId, byOrganizer, conflicts }
    // Attribution strategy: prefer the connection whose email matches
    // event.organizer.email (definitive ownership). Fall back to first
    // connection that returned the event.
    const eventOwnership = new Map<string, { connEntityId: string; byOrganizer: boolean; conflicts: string[] }>()
    const perConnection: Record<
      string,
      { calendarsScanned: number; eventsFetched: number; ownedByOrganizer: number; error?: string }
    > = {}

    // Case-insensitive email → connection map for organizer matching
    const connByEmail = new Map<string, string>()
    for (const c of gcalConns) {
      if (c.email) connByEmail.set(c.email.toLowerCase(), c.entityId)
    }

    for (const conn of gcalConns) {
      const connReport = (perConnection[conn.entityId] = {
        calendarsScanned: 0,
        eventsFetched: 0,
        ownedByOrganizer: 0,
      })
      try {
        const calList = await $fetch<{ items?: Array<{ id: string; primary?: boolean }> }>(
          `/api/integrations/google-calendar/events?connectionId=${encodeURIComponent(conn.entityId)}&listCalendars=true`,
        )
        const calendars = calList.items || []
        connReport.calendarsScanned = calendars.length

        for (const cal of calendars) {
          if (!cal.id) continue
          try {
            const eventsResp = await $fetch<{
              items?: Array<{ id: string; organizer?: { email?: string } }>
            }>(
              `/api/integrations/google-calendar/events?connectionId=${encodeURIComponent(conn.entityId)}&calendarId=${encodeURIComponent(cal.id)}&timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}`,
            )
            const items = eventsResp.items || []
            connReport.eventsFetched += items.length

            for (const evt of items) {
              if (!evt.id) continue
              const organizerEmail = evt.organizer?.email?.toLowerCase()
              const organizerConnId = organizerEmail ? connByEmail.get(organizerEmail) : undefined
              const isOrganizerMatch = organizerConnId === conn.entityId

              const existing = eventOwnership.get(evt.id)
              if (!existing) {
                eventOwnership.set(evt.id, {
                  connEntityId: organizerConnId || conn.entityId,
                  byOrganizer: !!organizerConnId,
                  conflicts: [],
                })
                if (isOrganizerMatch) connReport.ownedByOrganizer++
              } else {
                if (existing.connEntityId !== conn.entityId && !existing.conflicts.includes(conn.entityId)) {
                  existing.conflicts.push(conn.entityId)
                }
                // Upgrade first-wins record if we now see the true organizer
                if (isOrganizerMatch && !existing.byOrganizer) {
                  existing.connEntityId = conn.entityId
                  existing.byOrganizer = true
                  connReport.ownedByOrganizer++
                }
              }
            }
          } catch (err: any) {
            console.warn(
              `[backfill-gcal] Failed calendar ${cal.id} on ${conn.entityId}:`,
              err?.statusMessage || err?.message,
            )
          }
        }
      } catch (err: any) {
        connReport.error = err?.statusMessage || err?.message || 'Unknown error'
        console.error(`[backfill-gcal] Connection ${conn.entityId} failed:`, connReport.error)
      }
    }

    // 3. Existing derivedFrom edges for dedupe
    const existingDerivedFrom = new Map<string, Set<string>>()
    for (const link of store.getAllLinks()) {
      if (link.a !== 'derivedFrom') continue
      if (!existingDerivedFrom.has(link.e1)) existingDerivedFrom.set(link.e1, new Set())
      existingDerivedFrom.get(link.e1)!.add(link.e2)
    }

    // 4. Scan TQL gcal events and attribute each
    let linked = 0
    let alreadyLinked = 0
    let attrUpdated = 0
    let attributedByOrganizer = 0
    let attributedByFirstWins = 0
    let notFoundInGoogle = 0
    let conflicted = 0
    const sampleNotFound: string[] = []

    for (const [entityId, facts] of factsByEntity) {
      if (!entityId.startsWith('entity:')) continue
      const source = facts.find((f) => f.a === 'source')?.v
      if (source !== 'google-calendar') continue
      const googleEventId = facts.find((f) => f.a === 'googleEventId')?.v as string | undefined
      if (!googleEventId) continue

      const ownership = eventOwnership.get(googleEventId)
      if (!ownership) {
        notFoundInGoogle++
        if (sampleNotFound.length < 5) sampleNotFound.push(entityId)
        continue
      }

      if (ownership.conflicts.length > 0) conflicted++
      if (ownership.byOrganizer) attributedByOrganizer++
      else attributedByFirstWins++

      const targetConn = ownership.connEntityId

      // Update connectionId attribute if missing or different
      const currentAttr = facts.find((f) => f.a === 'connectionId')?.v
      if (currentAttr !== targetConn) {
        if (!dryRun) {
          try {
            await kernel.updateNode(entityId, { connectionId: targetConn }, 'entity', { agentId: agent })
          } catch (err: any) {
            console.error(`[backfill-gcal] updateNode failed for ${entityId}:`, err.message)
          }
        }
        attrUpdated++
      }

      // Create derivedFrom edge if missing
      if (existingDerivedFrom.get(entityId)?.has(targetConn)) {
        alreadyLinked++
        continue
      }
      if (!dryRun) {
        try {
          await kernel.link(entityId, 'derivedFrom', targetConn, { agentId: agent })
          emitMutation({
            action: 'link',
            entityId: `${entityId} -> ${targetConn}`,
            agentId: agent,
            data: { relation: 'derivedFrom', e1: entityId, e2: targetConn },
          })
        } catch (err: any) {
          console.error(`[backfill-gcal] link failed for ${entityId} -> ${targetConn}:`, err.message)
          continue
        }
      }
      linked++
    }

    pushMutationLog({
      action: 'backfill-gcal-attribution',
      data: {
        linked,
        alreadyLinked,
        attrUpdated,
        attributedByOrganizer,
        attributedByFirstWins,
        notFoundInGoogle,
        conflicted,
        dryRun,
      },
    })

    return {
      ok: true,
      dryRun,
      timeWindow: { timeMin, timeMax },
      connections: gcalConns.map((c) => ({ entityId: c.entityId, email: c.email })),
      perConnection,
      totals: {
        linked,
        alreadyLinked,
        attrUpdated,
        attributedByOrganizer,
        attributedByFirstWins,
        notFoundInGoogle,
        conflicted,
      },
      hint:
        notFoundInGoogle > 0
          ? `${notFoundInGoogle} events in TQL were not found in any connected Google calendar within the time window. They may have been deleted on Google's side, or be outside the window. Widen with timeMin/timeMax to capture older events.`
          : undefined,
      sampleNotFound: sampleNotFound.length > 0 ? sampleNotFound : undefined,
    }
  }

  // ─── POST /api/graph/backfill-gcal-participants ────────────────────
  // For each connected google-calendar account, re-fetch events from
  // Google and upsert `organizer` + `attendees` attrs on any matching
  // TQL event entity (keyed by googleEventId). Existing events that
  // predate the participant-persistence code can be caught up in-place
  // with this one-shot, without triggering a full re-sync.
  //
  // Idempotent: only writes when the serialized value changes.
  //
  // Body: { dryRun?: boolean, timeMin?: string, timeMax?: string, agentId?: string }
  if (method === 'POST' && route === 'backfill-gcal-participants') {
    const body = await readBody(event).catch(() => ({}))
    const agent: string = body?.agentId || 'backfill-gcal-participants'
    const dryRun: boolean = !!body?.dryRun
    const twoYearsMs = 2 * 365 * 24 * 60 * 60 * 1000
    const timeMin: string = body?.timeMin || new Date(Date.now() - twoYearsMs).toISOString()
    const timeMax: string = body?.timeMax || new Date(Date.now() + twoYearsMs).toISOString()

    const store = kernel.getStore()

    // Helper: serialize a participant to "Name <email>" (same format as
    // useGoogleCalendar.mapGCalEventToEntityData — keep in sync).
    const formatParticipant = (p: { email?: string; displayName?: string } | undefined): string | undefined => {
      if (!p?.email) return undefined
      const name = (p.displayName || '').trim()
      return name ? `${name} <${p.email}>` : p.email
    }

    // 1. Enumerate connected google-calendar connections.
    const gcalConns: Array<{ entityId: string; email: string }> = []
    const factsByEntity = new Map<string, Array<{ a: string; v: unknown }>>()
    for (const fact of store.getAllFacts()) {
      if (!factsByEntity.has(fact.e)) factsByEntity.set(fact.e, [])
      factsByEntity.get(fact.e)!.push({ a: fact.a, v: fact.v })
    }
    for (const [entityId, facts] of factsByEntity) {
      if (!facts.some((f) => f.a === 'type' && f.v === 'integration_connection')) continue
      if (facts.find((f) => f.a === 'integrationId')?.v !== 'google-calendar') continue
      if (facts.find((f) => f.a === 'connectionStatus')?.v !== 'connected') continue
      const email = String(facts.find((f) => f.a === 'accountEmail')?.v || '')
      gcalConns.push({ entityId, email })
    }

    if (gcalConns.length === 0) {
      return { ok: true, dryRun, message: 'No connected google-calendar connections found.' }
    }

    // 2. Build googleEventId → TQL entityId map (so we can quickly look up
    //    which TQL event to update for each Google event).
    const gEventIdToEntityId = new Map<string, string>()
    for (const [entityId, facts] of factsByEntity) {
      if (!entityId.startsWith('entity:')) continue
      if (facts.find((f) => f.a === 'source')?.v !== 'google-calendar') continue
      const gid = facts.find((f) => f.a === 'googleEventId')?.v
      if (typeof gid === 'string' && gid) gEventIdToEntityId.set(gid, entityId)
    }

    // 3. For each connection, fetch events and upsert participant attrs.
    type PerConn = {
      calendarsScanned: number
      eventsFetched: number
      organizerWritten: number
      attendeesWritten: number
      organizerSkipped: number
      attendeesSkipped: number
      unmatched: number
      error?: string
    }
    const perConnection: Record<string, PerConn> = {}

    for (const conn of gcalConns) {
      const report: PerConn = (perConnection[conn.entityId] = {
        calendarsScanned: 0,
        eventsFetched: 0,
        organizerWritten: 0,
        attendeesWritten: 0,
        organizerSkipped: 0,
        attendeesSkipped: 0,
        unmatched: 0,
      })
      try {
        const calList = await $fetch<{ items?: Array<{ id: string; primary?: boolean }> }>(
          `/api/integrations/google-calendar/events?connectionId=${encodeURIComponent(conn.entityId)}&listCalendars=true`,
        )
        const calendars = calList.items || []
        report.calendarsScanned = calendars.length

        for (const cal of calendars) {
          if (!cal.id) continue
          try {
            const eventsResp = await $fetch<{
              items?: Array<{
                id: string
                organizer?: { email?: string; displayName?: string }
                attendees?: Array<{ email?: string; displayName?: string; responseStatus?: string }>
              }>
            }>(
              `/api/integrations/google-calendar/events?connectionId=${encodeURIComponent(conn.entityId)}&calendarId=${encodeURIComponent(cal.id)}&timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}`,
            )
            const items = eventsResp.items || []
            report.eventsFetched += items.length

            for (const evt of items) {
              if (!evt.id) continue
              const entityId = gEventIdToEntityId.get(evt.id)
              if (!entityId) {
                report.unmatched++
                continue
              }

              const organizerStr = formatParticipant(evt.organizer)
              const attendeesArr = (evt.attendees || [])
                .map((a) => formatParticipant(a))
                .filter((s): s is string => !!s)

              const facts = factsByEntity.get(entityId) || []
              const currentOrganizer = facts.find((f) => f.a === 'organizer')?.v
              const currentAttendees = facts.filter((f) => f.a === 'attendees').map((f) => f.v)

              const patch: Record<string, any> = {}

              if (organizerStr && organizerStr !== currentOrganizer) {
                patch.organizer = organizerStr
              }

              // Compare multi-value attendees as sorted sets.
              const nextSorted = [...attendeesArr].sort()
              const currSorted = (currentAttendees as string[]).slice().sort()
              const attendeesChanged =
                nextSorted.length !== currSorted.length || nextSorted.some((v, i) => v !== currSorted[i])
              if (attendeesArr.length > 0 && attendeesChanged) {
                patch.attendees = attendeesArr
              }

              if (Object.keys(patch).length === 0) {
                if (organizerStr) report.organizerSkipped++
                if (attendeesArr.length > 0) report.attendeesSkipped++
                continue
              }

              if (!dryRun) {
                try {
                  await kernel.updateNode(entityId, patch, 'entity', { agentId: agent })
                } catch (err: any) {
                  console.warn(`[backfill-gcal-participants] updateNode failed for ${entityId}:`, err?.message)
                  continue
                }
              }

              if (patch.organizer) report.organizerWritten++
              if (patch.attendees) report.attendeesWritten++
            }
          } catch (err: any) {
            console.warn(
              `[backfill-gcal-participants] Failed calendar ${cal.id} on ${conn.entityId}:`,
              err?.statusMessage || err?.message,
            )
          }
        }
      } catch (err: any) {
        report.error = err?.statusMessage || err?.message || 'Unknown error'
        console.error(`[backfill-gcal-participants] Connection ${conn.entityId} failed:`, report.error)
      }
    }

    const totals = Object.values(perConnection).reduce(
      (acc, r) => ({
        calendarsScanned: acc.calendarsScanned + r.calendarsScanned,
        eventsFetched: acc.eventsFetched + r.eventsFetched,
        organizerWritten: acc.organizerWritten + r.organizerWritten,
        attendeesWritten: acc.attendeesWritten + r.attendeesWritten,
        organizerSkipped: acc.organizerSkipped + r.organizerSkipped,
        attendeesSkipped: acc.attendeesSkipped + r.attendeesSkipped,
        unmatched: acc.unmatched + r.unmatched,
      }),
      {
        calendarsScanned: 0,
        eventsFetched: 0,
        organizerWritten: 0,
        attendeesWritten: 0,
        organizerSkipped: 0,
        attendeesSkipped: 0,
        unmatched: 0,
      },
    )

    pushMutationLog({ action: 'backfill-gcal-participants', data: { totals, dryRun } })

    return {
      ok: true,
      dryRun,
      timeWindow: { timeMin, timeMax },
      connections: gcalConns.map((c) => ({ entityId: c.entityId, email: c.email })),
      perConnection,
      totals,
    }
  }

  // ─── POST /api/graph/backfill-links ─────────────────────────────────
  // Convert implicit attribute-pointers (connectionId, integrationId, etc.)
  // into real TQL links, and synthesize missing parent entities (email
  // threads, recurring series, calendars, people parsed from email headers).
  //
  // Designed to be idempotent: existing links are pre-indexed and skipped,
  // synthesized entity ids are derived deterministically from their source
  // signal (threadId, recurringEventId, calendarId, email), so re-runs are
  // cheap. Each step reports `{linked, created, skipped, missing}`.
  //
  // Body: {
  //   steps?: string[],  // subset of step names; omit to run all
  //   dryRun?: boolean,
  //   agentId?: string,
  // }
  if (method === 'POST' && route === 'backfill-links') {
    const body = await readBody(event).catch(() => ({}))
    const dryRun: boolean = !!body?.dryRun
    const steps: string[] | null = Array.isArray(body?.steps) && body.steps.length > 0 ? (body.steps as string[]) : null
    const agent: string = body?.agentId || 'backfill-links'
    const shouldRun = (name: string) => !steps || steps.includes(name)

    const store = kernel.getStore()

    // ── Pre-index all entity facts and existing links in one pass ────────
    const entityAttrs = new Map<string, Record<string, any>>()
    for (const fact of store.getAllFacts()) {
      if (!fact.e.startsWith('entity:')) continue
      if (!entityAttrs.has(fact.e)) entityAttrs.set(fact.e, {})
      const rec = entityAttrs.get(fact.e)!
      if (rec[fact.a] === undefined) {
        rec[fact.a] = fact.v
      } else if (Array.isArray(rec[fact.a])) {
        rec[fact.a].push(fact.v)
      } else {
        rec[fact.a] = [rec[fact.a], fact.v]
      }
    }

    const existingLinks = new Set<string>()
    for (const l of store.getAllLinks()) {
      existingLinks.add(`${l.e1}|${l.a}|${l.e2}`)
    }

    const exists = (eid: string): boolean => entityAttrs.has(eid)
    const hasType = (eid: string, t: string): boolean => {
      const attrs = entityAttrs.get(eid)
      if (!attrs) return false
      const types = Array.isArray(attrs.type) ? attrs.type : attrs.type ? [attrs.type] : []
      return types.includes(t)
    }

    const slugify = (s: string): string =>
      s
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 60)

    // ── Link/create helpers (all mutations go through here) ─────────────
    async function doLink(e1: string, relation: string, e2: string): Promise<'linked' | 'skipped' | 'missing'> {
      if (!exists(e1) || !exists(e2)) return 'missing'
      const key = `${e1}|${relation}|${e2}`
      if (existingLinks.has(key)) return 'skipped'
      if (!dryRun) {
        try {
          await kernel.link(e1, relation, e2, { agentId: agent })
        } catch {
          return 'missing'
        }
      }
      existingLinks.add(key)
      return 'linked'
    }

    async function doCreate(
      id: string,
      type: string,
      data: Record<string, any>,
    ): Promise<'created' | 'skipped' | 'failed'> {
      if (exists(id)) return 'skipped'
      const nodeData = { ...data, type }
      if (!dryRun) {
        try {
          await kernel.createNode(id, nodeData, 'entity', { agentId: agent })
        } catch {
          return 'failed'
        }
      }
      entityAttrs.set(id, { ...nodeData })
      return 'created'
    }

    async function ensureOntology(schema: Record<string, any>): Promise<void> {
      if (kernel.getOntology(schema['@id'])) return
      if (dryRun) return
      try {
        await kernel.createOntology(schema as any, { agentId: agent })
      } catch {
        // Race/duplicate — fine.
      }
    }

    // ── Ontology schemas for synthesized types ──────────────────────────
    const EMAIL_THREAD_SCHEMA = {
      '@id': 'trellis:schema/email_thread',
      '@type': 'trellis:Schema',
      version: '1.0.0',
      fields: [
        { name: 'title', valueType: 'title', required: true },
        { name: 'description', valueType: 'rich_text' },
        { name: 'threadId', valueType: 'rich_text' },
        { name: 'createdAt', valueType: 'date' },
        { name: 'updatedAt', valueType: 'date' },
      ],
    }
    const RECURRING_SERIES_SCHEMA = {
      '@id': 'trellis:schema/recurring_event_series',
      '@type': 'trellis:Schema',
      version: '1.0.0',
      fields: [
        { name: 'title', valueType: 'title', required: true },
        { name: 'description', valueType: 'rich_text' },
        { name: 'recurringEventId', valueType: 'rich_text' },
        { name: 'createdAt', valueType: 'date' },
        { name: 'updatedAt', valueType: 'date' },
      ],
    }
    const CALENDAR_SCHEMA = {
      '@id': 'trellis:schema/calendar',
      '@type': 'trellis:Schema',
      version: '1.0.0',
      fields: [
        { name: 'title', valueType: 'title', required: true },
        { name: 'description', valueType: 'rich_text' },
        { name: 'googleCalendarId', valueType: 'rich_text' },
        { name: 'connectionId', valueType: 'rich_text' },
        { name: 'createdAt', valueType: 'date' },
        { name: 'updatedAt', valueType: 'date' },
      ],
    }

    type StepResult = {
      linked?: number
      created?: number
      skipped?: number
      missing?: number
      failed?: number
      noMatch?: number
    }
    const results: Record<string, StepResult> = {}

    async function runStep(name: string, fn: () => Promise<StepResult>): Promise<void> {
      if (!shouldRun(name)) return
      try {
        results[name] = await fn()
      } catch (err: any) {
        results[name] = { failed: 1 }
        ;(results[name] as any).error = err?.message || String(err)
      }
    }

    // ── Tally helper ────────────────────────────────────────────────────
    const tally = () => ({ linked: 0, skipped: 0, missing: 0, created: 0, failed: 0 })
    const bump = (t: ReturnType<typeof tally>, r: 'linked' | 'skipped' | 'missing') => {
      t[r]++
    }

    // ── STEP: connection ────────────────────────────────────────────────
    // entity.connectionId → link `belongsTo` → integration_connection
    await runStep('connection', async () => {
      const t = tally()
      for (const [eid, attrs] of entityAttrs) {
        const conn = attrs.connectionId
        if (typeof conn !== 'string') continue
        bump(t, await doLink(eid, 'belongsTo', conn))
      }
      return t
    })

    // ── STEP: integration ───────────────────────────────────────────────
    // integration_connection.integrationId → link `instanceOf` → integration_definition
    await runStep('integration', async () => {
      const t = tally()
      for (const [eid, attrs] of entityAttrs) {
        if (!hasType(eid, 'integration_connection')) continue
        const integrationId = attrs.integrationId
        if (typeof integrationId !== 'string') continue
        const defId = `entity:integration-def-${integrationId}`
        bump(t, await doLink(eid, 'instanceOf', defId))
      }
      return t
    })

    // ── STEP: workflow ──────────────────────────────────────────────────
    // workflow-run.workflowId → link `instanceOf` → workflow
    await runStep('workflow', async () => {
      const t = tally()
      for (const [eid, attrs] of entityAttrs) {
        if (!hasType(eid, 'workflow-run')) continue
        const wfId = attrs.workflowId
        if (typeof wfId !== 'string') continue
        const targetId = wfId.startsWith('entity:') ? wfId : `entity:${wfId}`
        bump(t, await doLink(eid, 'instanceOf', targetId))
      }
      return t
    })

    // ── STEP: channel ───────────────────────────────────────────────────
    // entity.channelId → link `postedIn` → channel entity
    await runStep('channel', async () => {
      const t = tally()
      for (const [eid, attrs] of entityAttrs) {
        const chId = attrs.channelId
        if (typeof chId !== 'string') continue
        const targetId = chId.startsWith('entity:') ? chId : `entity:${chId}`
        bump(t, await doLink(eid, 'postedIn', targetId))
      }
      return t
    })

    // ── STEP: author ────────────────────────────────────────────────────
    // entity.authorId | userId | createdBy → link `createdBy` → person.
    // If no matching person entity exists, synthesize one keyed on the
    // authorId. authorName is used for the display title when available.
    await runStep('author', async () => {
      const t = { created: 0, linked: 0, skipped: 0, missing: 0, failed: 0 }
      for (const [eid, attrs] of entityAttrs) {
        const auth = (attrs.authorId || attrs.userId || attrs.createdBy) as string | undefined
        if (typeof auth !== 'string' || !auth) continue
        const candidates = [
          auth.startsWith('entity:') ? auth : null,
          `entity:${auth}`,
          `entity:person-${auth}`,
          `entity:user-${auth}`,
        ].filter(Boolean) as string[]
        let target = candidates.find((c) => exists(c))

        if (!target) {
          // Synthesize a person entity for this author.
          const synthId = `entity:person-user-${slugify(auth)}`
          if (!exists(synthId)) {
            const displayName =
              (typeof attrs.authorName === 'string' && attrs.authorName) ||
              (typeof attrs.userName === 'string' && attrs.userName) ||
              auth
            const cr = await doCreate(synthId, 'person', {
              title: displayName,
              userId: auth,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            })
            if (cr === 'created') t.created++
            else if (cr === 'failed') t.failed++
          }
          target = synthId
        }

        if (!exists(target)) {
          t.missing++
          continue
        }
        bump(t, await doLink(eid, 'createdBy', target))
      }
      return t
    })

    // NOTE: No `org` step. `orgId` in this codebase is a workspace
    // partition identifier (values: "local" + legacy cloud-mode UUIDs),
    // not a knowledge-graph edge. Linking every entity to a single
    // "workspace" hub would add visual noise without adding signal. The
    // organization entity type is reserved for real-world orgs (Acuity,
    // MIT, etc.) which get linked via content enrichment instead.

    // ── STEP: email-threads (synthesis) ─────────────────────────────────
    await runStep('email-threads', async () => {
      await ensureOntology(EMAIL_THREAD_SCHEMA)
      const t = { created: 0, linked: 0, skipped: 0, missing: 0, failed: 0 }
      const threadIdToEntityId = new Map<string, string>()
      for (const [eid, attrs] of entityAttrs) {
        if (!hasType(eid, 'email')) continue
        const threadId = (attrs.threadId || attrs.gmailThreadId) as string | undefined
        if (typeof threadId !== 'string' || !threadId) continue
        let threadEid = threadIdToEntityId.get(threadId)
        if (!threadEid) {
          threadEid = `entity:email-thread-${slugify(threadId)}`
          threadIdToEntityId.set(threadId, threadEid)
          if (!exists(threadEid)) {
            const cr = await doCreate(threadEid, 'email_thread', {
              title: (attrs.subject as string) || `Thread ${threadId}`,
              threadId,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            })
            if (cr === 'created') t.created++
            else if (cr === 'failed') t.failed++
          }
        }
        bump(t, await doLink(eid, 'belongsTo', threadEid))
      }
      return t
    })

    // ── STEP: recurring-series (synthesis) ──────────────────────────────
    await runStep('recurring-series', async () => {
      await ensureOntology(RECURRING_SERIES_SCHEMA)
      const t = { created: 0, linked: 0, skipped: 0, missing: 0, failed: 0 }
      const seriesIdToEntityId = new Map<string, string>()
      for (const [eid, attrs] of entityAttrs) {
        if (!hasType(eid, 'event')) continue
        const recId = attrs.recurringEventId as string | undefined
        if (typeof recId !== 'string' || !recId) continue
        let seriesEid = seriesIdToEntityId.get(recId)
        if (!seriesEid) {
          seriesEid = `entity:recurring-series-${slugify(recId)}`
          seriesIdToEntityId.set(recId, seriesEid)
          if (!exists(seriesEid)) {
            const cr = await doCreate(seriesEid, 'recurring_event_series', {
              title: (attrs.title as string) || `Recurring Series`,
              recurringEventId: recId,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            })
            if (cr === 'created') t.created++
            else if (cr === 'failed') t.failed++
          }
        }
        bump(t, await doLink(eid, 'instanceOf', seriesEid))
      }
      return t
    })

    // ── STEP: calendars (synthesis) ─────────────────────────────────────
    // Per (connection × calendarId) → calendar entity. Events link to
    // calendar (belongsTo); calendar links to connection (belongsTo).
    await runStep('calendars', async () => {
      await ensureOntology(CALENDAR_SCHEMA)
      const t = { created: 0, linked: 0, skipped: 0, missing: 0, failed: 0 }
      const calKeyToEntityId = new Map<string, string>()
      for (const [eid, attrs] of entityAttrs) {
        if (!hasType(eid, 'event')) continue
        const calId = attrs.googleCalendarId as string | undefined
        const connId = attrs.connectionId as string | undefined
        if (typeof calId !== 'string' || typeof connId !== 'string') continue
        const connSlug = connId.replace(/^entity:integration-conn-/, '')
        const key = `${connSlug}|${calId}`
        let calEid = calKeyToEntityId.get(key)
        if (!calEid) {
          calEid = `entity:calendar-${slugify(connSlug)}-${slugify(calId)}`
          calKeyToEntityId.set(key, calEid)
          if (!exists(calEid)) {
            const cr = await doCreate(calEid, 'calendar', {
              title: `${calId} — ${connSlug}`,
              googleCalendarId: calId,
              connectionId: connId,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            })
            if (cr === 'created') t.created++
            else if (cr === 'failed') t.failed++
          }
          // calendar → connection link
          const connLink = await doLink(calEid, 'belongsTo', connId)
          if (connLink === 'linked') t.linked++
          else if (connLink === 'skipped') t.skipped++
        }
        bump(t, await doLink(eid, 'belongsTo', calEid))
      }
      return t
    })

    // ── Shared person helpers (used by people-from-emails + event-attendees) ──
    // Index existing person entities by any email-like attr.
    const personByEmail = new Map<string, string>()
    for (const [eid, attrs] of entityAttrs) {
      if (!hasType(eid, 'person')) continue
      const emails: string[] = []
      for (const key of ['email', 'accountEmail']) {
        const v = attrs[key]
        if (typeof v === 'string') emails.push(v)
        else if (Array.isArray(v)) emails.push(...v.filter((x: any) => typeof x === 'string'))
      }
      for (const e of emails) personByEmail.set(e.toLowerCase(), eid)
    }

    const parseEmailAddr = (raw: string): { name?: string; email: string } | null => {
      if (!raw) return null
      const angle = raw.match(/"?([^"<]*)"?\s*<([^>]+)>/)
      if (angle) {
        const name = (angle[1] || '').trim().replace(/^"|"$/g, '')
        return { name: name || undefined, email: angle[2]!.trim().toLowerCase() }
      }
      const bare = raw.match(/([^\s<>@]+@[^\s<>]+)/)
      if (bare) return { email: bare[1]!.toLowerCase() }
      return null
    }

    const splitAddresses = (val: unknown): string[] => {
      if (!val) return []
      if (Array.isArray(val)) {
        return val
          .filter((x) => typeof x === 'string')
          .flatMap((s: string) => s.split(/,(?![^<]*>)/))
          .map((s) => s.trim())
          .filter(Boolean)
      }
      const raw = typeof val === 'string' ? val : ''
      return raw
        .split(/,(?![^<]*>)/)
        .map((s) => s.trim())
        .filter(Boolean)
    }

    // Upsert a person entity for a given email. Tracks its own counters
    // via the stepCounter argument so the caller decides which step the
    // synthesis is attributed to.
    async function upsertPerson(
      email: string,
      name: string | undefined,
      stepCounter: { created: number; failed: number },
    ): Promise<string | null> {
      const key = email.toLowerCase()
      const existing = personByEmail.get(key)
      if (existing) return existing
      const slug = slugify(email)
      if (!slug) return null
      const personEid = `entity:person-email-${slug}`
      if (exists(personEid)) {
        personByEmail.set(key, personEid)
        return personEid
      }
      const cr = await doCreate(personEid, 'person', {
        title: name || email,
        accountEmail: email,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      if (cr === 'created') {
        stepCounter.created++
        personByEmail.set(key, personEid)
        return personEid
      }
      if (cr === 'failed') {
        stepCounter.failed++
        return null
      }
      return personEid
    }

    // ── STEP: people-from-emails (synthesis) ────────────────────────────
    // Parse email `from` / `to` / `cc` headers, synthesize person entities
    // keyed on address, link email→person with `sentBy` / `receivedBy`.
    await runStep('people-from-emails', async () => {
      const t = { created: 0, linked: 0, skipped: 0, missing: 0, failed: 0, noMatch: 0 }
      for (const [eid, attrs] of entityAttrs) {
        if (!hasType(eid, 'email')) continue
        // from (sender)
        const fromRaw = typeof attrs.from === 'string' ? attrs.from : ''
        const fromParsed = parseEmailAddr(fromRaw)
        if (fromParsed) {
          const pid = await upsertPerson(fromParsed.email, fromParsed.name, t)
          if (pid) bump(t, await doLink(eid, 'sentBy', pid))
        } else if (fromRaw) {
          t.noMatch++
        }
        // to + cc (recipients)
        for (const field of ['to', 'cc'] as const) {
          for (const addr of splitAddresses(attrs[field])) {
            const parsed = parseEmailAddr(addr)
            if (!parsed) {
              t.noMatch++
              continue
            }
            const pid = await upsertPerson(parsed.email, parsed.name, t)
            if (pid) bump(t, await doLink(eid, 'receivedBy', pid))
          }
        }
      }
      return t
    })

    // ── STEP: event-attendees (synthesis) ───────────────────────────────
    // Parse `organizer` + `attendees` attrs on event entities (populated by
    // GCal sync or POST /api/graph/backfill-gcal-participants), synthesize
    // person entities, and link events→persons via `organizedBy` /
    // `attendedBy`.
    await runStep('event-attendees', async () => {
      const t = { created: 0, linked: 0, skipped: 0, missing: 0, failed: 0, noMatch: 0 }
      for (const [eid, attrs] of entityAttrs) {
        if (!hasType(eid, 'event')) continue
        // organizer (single participant)
        const organizerRaw = typeof attrs.organizer === 'string' ? attrs.organizer : ''
        const organizerParsed = parseEmailAddr(organizerRaw)
        if (organizerParsed) {
          const pid = await upsertPerson(organizerParsed.email, organizerParsed.name, t)
          if (pid) bump(t, await doLink(eid, 'organizedBy', pid))
        } else if (organizerRaw) {
          t.noMatch++
        }
        // attendees (multi-value)
        for (const addr of splitAddresses(attrs.attendees)) {
          const parsed = parseEmailAddr(addr)
          if (!parsed) {
            t.noMatch++
            continue
          }
          const pid = await upsertPerson(parsed.email, parsed.name, t)
          if (pid) bump(t, await doLink(eid, 'attendedBy', pid))
        }
      }
      return t
    })

    const grandTotalLinked = Object.values(results).reduce((sum, r) => sum + (r.linked || 0), 0)
    const grandTotalCreated = Object.values(results).reduce((sum, r) => sum + (r.created || 0), 0)
    pushMutationLog({
      action: 'backfill-links',
      data: { dryRun, linked: grandTotalLinked, created: grandTotalCreated, steps: results },
    })

    return {
      ok: true,
      dryRun,
      totals: { linked: grandTotalLinked, created: grandTotalCreated },
      steps: results,
    }
  }

  // ─── GET /api/graph/embeddings ──────────────────────────────────────
  // Returns a compact payload of every entity's embedding vector keyed
  // by entity id. The `embedding` attribute is stored as many single-float
  // facts (one per dimension), so we reconstruct them here before sending
  // over the wire.
  //
  // Query params:
  //   ?ids=entity:a,entity:b   — restrict to specific ids (optional)
  //
  // Response: { model: string, dimensions: number, vectors: Record<string, number[]> }
  if (method === 'GET' && route === 'embeddings') {
    const url = getRequestURL(event)
    const idsParam = url.searchParams.get('ids') || ''
    const idFilter = idsParam
      ? new Set(
          idsParam
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
        )
      : null

    const store = kernel.getStore()
    const vectorsByEntity = new Map<string, number[]>()
    let model: string | null = null

    for (const fact of store.getAllFacts()) {
      if (!fact.e.startsWith('entity:')) continue
      if (idFilter && !idFilter.has(fact.e)) continue
      if (fact.a === 'embedding' && typeof fact.v === 'number') {
        if (!vectorsByEntity.has(fact.e)) vectorsByEntity.set(fact.e, [])
        vectorsByEntity.get(fact.e)!.push(fact.v)
      } else if (fact.a === 'embeddingModel' && !model && typeof fact.v === 'string') {
        model = fact.v
      }
    }

    const vectors: Record<string, number[]> = {}
    let dimensions = 0
    for (const [id, vec] of vectorsByEntity) {
      vectors[id] = vec
      if (vec.length > dimensions) dimensions = vec.length
    }

    return {
      ok: true,
      model: model || 'unknown',
      dimensions,
      count: vectorsByEntity.size,
      vectors,
    }
  }

  // ─── POST /api/graph/backfill-embeddings ────────────────────────────
  // Generate and persist semantic embeddings on every user entity.
  //
  // For each entity, we concatenate title + type + description + notes +
  // location + tags into a single "source text", hash it, and embed via
  // the local Ollama proxy (/api/llm/embed, default model nomic-embed-text).
  // The vector and its source hash are written back as attributes:
  //   - embedding:       number[]  (768 floats for nomic-embed-text)
  //   - embeddingModel:  string    (model identifier)
  //   - embeddingHash:   string    (fnv-1a of the source text)
  //
  // Re-running is idempotent: entities whose current embeddingHash matches
  // their current source text are skipped. Pass `force: true` to re-embed
  // everything (e.g. after a model change).
  //
  // Body: { model?: string, batchSize?: number, force?: boolean,
  //         limit?: number, dryRun?: boolean, agentId?: string }
  if (method === 'POST' && route === 'backfill-embeddings') {
    const body = await readBody(event).catch(() => ({}))
    const agent: string = body?.agentId || 'backfill-embeddings'
    const dryRun: boolean = !!body?.dryRun
    const force: boolean = !!body?.force
    const model: string = body?.model || process.env.TRELLIS_EMBED_MODEL || 'nomic-embed-text'
    const batchSize: number = Math.max(1, Math.min(64, Number(body?.batchSize) || 16))
    const limit: number = Math.max(0, Number(body?.limit) || 0) // 0 = no limit

    const store = kernel.getStore()

    // 1. Collect all user entity facts in a single pass.
    const factsByEntity = new Map<string, Array<{ a: string; v: unknown }>>()
    for (const fact of store.getAllFacts()) {
      if (!fact.e.startsWith('entity:')) continue
      if (!factsByEntity.has(fact.e)) factsByEntity.set(fact.e, [])
      factsByEntity.get(fact.e)!.push({ a: fact.a, v: fact.v })
    }

    // Build the text we'll embed. Keep it short, content-focused, and
    // stable across runs so the hash dedupe works.
    const SOURCE_FIELDS = ['title', 'type', 'description', 'notes', 'location', 'summary', 'category']
    const buildSourceText = (facts: Array<{ a: string; v: unknown }>): string => {
      const parts: string[] = []
      for (const field of SOURCE_FIELDS) {
        const vals = facts.filter((f) => f.a === field).map((f) => f.v)
        for (const v of vals) {
          if (typeof v === 'string' && v.trim()) parts.push(v.trim())
        }
      }
      // Tags are useful semantic anchors too.
      const tags = facts.filter((f) => f.a === 'tags').map((f) => f.v)
      for (const t of tags) {
        if (typeof t === 'string') parts.push(`#${t}`)
      }
      return parts.join(' \u2014 ')
    }

    // FNV-1a 32-bit hash — fast, adequate for cache-key purposes.
    const hashString = (s: string): string => {
      let h = 0x811c9dc5
      for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i)
        h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0
      }
      return h.toString(16).padStart(8, '0')
    }

    // 2. Decide which entities need embedding.
    interface PendingEmbed {
      entityId: string
      text: string
      hash: string
    }
    const pending: PendingEmbed[] = []
    let skipped = 0
    let noContent = 0

    for (const [entityId, facts] of factsByEntity) {
      const text = buildSourceText(facts)
      if (!text) {
        noContent++
        continue
      }
      const hash = hashString(`${model}:${text}`)
      if (!force) {
        const existingHash = facts.find((f) => f.a === 'embeddingHash')?.v
        const hasVector = facts.some((f) => f.a === 'embedding')
        if (existingHash === hash && hasVector) {
          skipped++
          continue
        }
      }
      pending.push({ entityId, text, hash })
      if (limit > 0 && pending.length >= limit) break
    }

    if (dryRun || pending.length === 0) {
      return {
        ok: true,
        dryRun,
        model,
        totals: {
          embedded: 0,
          skipped,
          noContent,
          pending: pending.length,
          total: factsByEntity.size,
        },
      }
    }

    // 3. Embed in batches via the local endpoint. We call ourselves through
    //    $fetch so the model / host config lives in one place.
    let embedded = 0
    let failed = 0
    const errors: string[] = []

    for (let i = 0; i < pending.length; i += batchSize) {
      const batch = pending.slice(i, i + batchSize)
      let vectors: number[][]
      try {
        const res = await $fetch<{ embeddings: number[][] }>('/api/llm/embed', {
          method: 'POST',
          body: { model, input: batch.map((b) => b.text) },
        })
        vectors = res.embeddings
      } catch (err: any) {
        failed += batch.length
        errors.push(`batch ${i}-${i + batch.length}: ${err?.message || String(err)}`)
        continue
      }

      for (let j = 0; j < batch.length; j++) {
        const pendingItem = batch[j]!
        const vec = vectors[j]
        if (!Array.isArray(vec) || vec.length === 0) {
          failed++
          continue
        }
        try {
          await kernel.updateNode(
            pendingItem.entityId,
            {
              embedding: vec,
              embeddingModel: model,
              embeddingHash: pendingItem.hash,
            },
            'entity',
            { agentId: agent },
          )
          embedded++
        } catch (err: any) {
          failed++
          errors.push(`${pendingItem.entityId}: ${err?.message || String(err)}`)
        }
      }
    }

    pushMutationLog({
      action: 'backfill-embeddings',
      data: { model, embedded, skipped, failed, noContent, total: factsByEntity.size },
    })

    return {
      ok: true,
      model,
      totals: {
        embedded,
        skipped,
        failed,
        noContent,
        pending: pending.length,
        total: factsByEntity.size,
      },
      errors: errors.length > 0 ? errors.slice(0, 10) : undefined,
    }
  }

  // ─── DELETE /api/graph/purge ────────────────────────────────────────
  // Deletes all user entity nodes (entity: prefix). Preserves ontologies,
  // system nodes, and kernel structure. Admin-only operation.
  if (method === 'DELETE' && route === 'purge') {
    const body = await readBody(event).catch(() => ({}))
    const agent: string = body?.agentId || 'browser'

    const store = kernel.getStore()
    const entityIds = new Set<string>()
    for (const fact of store.getAllFacts()) {
      if (fact.e.startsWith('entity:')) {
        entityIds.add(fact.e)
      }
    }

    let deleted = 0
    for (const entityId of entityIds) {
      try {
        await kernel.deleteNode(entityId, { agentId: agent })
        deleted++
      } catch {
        // skip nodes that fail (e.g. already gone)
      }
    }

    pushMutationLog({ action: 'purge', data: { deleted } })
    emitMutation({ action: 'purge', entityId: '*', agentId: agent, data: { deleted } })
    return { ok: true, deleted }
  }

  throw createError({ statusCode: 404, message: `Unknown graph API route: ${method} /api/graph/${path}` })
})
