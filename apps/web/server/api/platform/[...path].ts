/**
 * Platform API
 *
 * REST endpoints for managing platform-level resources (orgs, apps, collections,
 * pages, comments, tags, workflows, settings) via the TQL kernel.
 *
 * All platform entities are stored as TQL graph nodes with namespaced IDs:
 *   - platform:org/<slug>
 *   - platform:app/<slug>
 *   - platform:collection/<id>
 *   - platform:page/<id>
 *   - platform:tag/<id>
 *   - platform:workflow/<id>
 *   - comment:<id>
 *   - platform:setting/<scope>/<key>
 *
 * This works in both local and cloud mode since the TQL kernel always runs.
 *
 * Routes:
 *   ── Phase 1: Workspace Context ──
 *   GET    /api/platform/org/list              List all organizations
 *   POST   /api/platform/org/create            Create an organization
 *   GET    /api/platform/org/:id               Get org by ID
 *   GET    /api/platform/app/list              List apps (optionally scoped by orgId)
 *   POST   /api/platform/app/create            Create an app/world
 *   GET    /api/platform/app/:id               Get app by ID
 *   PUT    /api/platform/app/:id               Update an app
 *   DELETE /api/platform/app/:id               Delete an app
 *   GET    /api/platform/context               Get current context (from query or defaults)
 *
 *   ── Phase 2: Collections & Pages ──
 *   GET    /api/platform/collection/list       List collections (scoped by appId)
 *   POST   /api/platform/collection/create     Create a collection
 *   PUT    /api/platform/collection/:id        Update a collection
 *   DELETE /api/platform/collection/:id        Delete a collection
 *   GET    /api/platform/page/list             List pages (scoped by appId)
 *   POST   /api/platform/page/create           Create a page
 *   PUT    /api/platform/page/:id              Update a page
 *   DELETE /api/platform/page/:id              Delete a page
 *
 *   ── Phase 3: Entity Enrichment ──
 *   GET    /api/platform/comment/list/:entityId  List comments on an entity
 *   POST   /api/platform/comment/add             Add a comment
 *   GET    /api/platform/tag/list                 List all tags
 *   POST   /api/platform/tag/create               Create a tag
 *   POST   /api/platform/tag/assign               Assign tags to an entity
 *
 *   ── Phase 4: Bulk & Workflows ──
 *   POST   /api/platform/bulk/update             Batch update entities
 *   POST   /api/platform/bulk/delete             Batch delete entities
 *   GET    /api/platform/workflow/list            List workflows
 *   POST   /api/platform/workflow/create          Create a workflow
 *   PUT    /api/platform/workflow/:id             Update a workflow
 *   DELETE /api/platform/workflow/:id             Delete a workflow
 *
 *   ── Phase 5: Settings, Files & Invites ──
 *   GET    /api/platform/setting/get              Get a setting
 *   POST   /api/platform/setting/set              Set a setting
 *   GET    /api/platform/setting/list             List settings
 *   POST   /api/platform/file/upload              Upload a file (proxy)
 *   POST   /api/platform/invite/send              Send an invite (proxy)
 */

import { useTrellisKernel, pushMutationLog } from '../../plugins/trellis-kernel'
import { emitMutation } from '../../utils/trellis-events'
import { parseApiBody, parseApiQuery } from '../../utils/api-validation'
import {
  PlatformAppCreateBodySchema,
  PlatformAppListQuerySchema,
  PlatformBulkDeleteBodySchema,
  PlatformBulkUpdateBodySchema,
  PlatformCollectionCreateBodySchema,
  PlatformCommentAddBodySchema,
  PlatformContextQuerySchema,
  PlatformDeleteBodySchema,
  PlatformFileUploadBodySchema,
  PlatformInviteSendBodySchema,
  PlatformOptionalAppQuerySchema,
  PlatformOrgCreateBodySchema,
  PlatformPageCreateBodySchema,
  PlatformSettingGetQuerySchema,
  PlatformSettingListQuerySchema,
  PlatformSettingSetBodySchema,
  PlatformTagAssignBodySchema,
  PlatformTagCreateBodySchema,
  PlatformUpdateBodySchema,
  PlatformWorkflowCreateBodySchema,
} from '../../utils/platform-api-schemas'

// ── Helpers ─────────────────────────────────────────────────────────────

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

/** Query all nodes of a given platform type by scanning facts. */
function queryPlatformNodes(
  kernel: ReturnType<typeof useTrellisKernel>,
  prefix: string,
  filterFn?: (_node: Record<string, any>) => boolean,
): Record<string, any>[] {
  const store = kernel.getStore()
  const entityIds = new Set<string>()
  for (const fact of store.getAllFacts()) {
    if (fact.e.startsWith(prefix)) {
      entityIds.add(fact.e)
    }
  }
  const results: Record<string, any>[] = []
  for (const eid of entityIds) {
    const facts = store.getFactsByEntity(eid)
    if (facts.length > 0) {
      const n = factsToNode(eid, facts)
      if (!filterFn || filterFn(n)) {
        results.push(n)
      }
    }
  }
  return results
}

function getNode(kernel: ReturnType<typeof useTrellisKernel>, entityId: string): Record<string, any> | null {
  const store = kernel.getStore()
  const facts = store.getFactsByEntity(entityId)
  if (facts.length === 0) return null
  return factsToNode(entityId, facts)
}

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

export default defineEventHandler(async (event) => {
  let kernel: ReturnType<typeof useTrellisKernel>
  try {
    kernel = useTrellisKernel()
  } catch {
    throw createError({ statusCode: 503, message: 'TQL kernel not initialized' })
  }

  const method = event.method
  const path = event.context.params?.path || ''
  const segments = path.split('/').filter(Boolean)
  const domain = segments[0] || ''
  const action = segments[1] || ''
  const restId = segments.slice(2).join('/')

  // ═══════════════════════════════════════════════════════════════════════
  // Phase 1: Workspace Context (org, app, context)
  // ═══════════════════════════════════════════════════════════════════════

  // ─── GET /api/platform/org/list ──────────────────────────────────────
  if (method === 'GET' && domain === 'org' && action === 'list') {
    const nodes = queryPlatformNodes(kernel, 'platform:org/')
    return { ok: true, orgs: nodes }
  }

  // ─── POST /api/platform/org/create ───────────────────────────────────
  if (method === 'POST' && domain === 'org' && action === 'create') {
    const { name, slug, description, agentId } = await parseApiBody(event, PlatformOrgCreateBodySchema)
    const agent: string = agentId || 'cli'

    const orgSlug = slug || slugify(name)
    const entityId = `platform:org/${orgSlug}`

    // Idempotent: return existing if slug matches
    const existing = getNode(kernel, entityId)
    if (existing) {
      return { ok: true, id: entityId, org: existing, created: false }
    }

    const now = new Date().toISOString()
    const data: Record<string, any> = {
      type: 'org',
      title: name,
      slug: orgSlug,
      description: description || '',
      status: 'active',
      createdAt: now,
      updatedAt: now,
    }

    await kernel.createNode(entityId, data, 'platform', { agentId: agent })
    pushMutationLog({ action: 'createOrg', entityId, data })
    emitMutation({ action: 'createOrg', entityId, type: 'platform', agentId: agent, data })

    return { ok: true, id: entityId, org: { '@id': entityId, ...data }, created: true }
  }

  // ─── GET /api/platform/org/:id ───────────────────────────────────────
  if (method === 'GET' && domain === 'org' && action && action !== 'list') {
    const entityId = `platform:org/${action}${restId ? '/' + restId : ''}`
    const node = getNode(kernel, entityId)
    if (!node) {
      throw createError({ statusCode: 404, message: `Org not found: ${entityId}` })
    }
    return { ok: true, org: node }
  }

  // ─── GET /api/platform/app/list ──────────────────────────────────────
  if (method === 'GET' && domain === 'app' && action === 'list') {
    const { orgId } = parseApiQuery(event, PlatformAppListQuerySchema)
    const nodes = queryPlatformNodes(kernel, 'platform:app/', (node) => {
      if (orgId && node.orgId !== orgId) return false
      return true
    })
    return { ok: true, apps: nodes }
  }

  // ─── POST /api/platform/app/create ───────────────────────────────────
  if (method === 'POST' && domain === 'app' && action === 'create') {
    const { name, slug, orgId, icon, color, description, ontologies, agentId } = await parseApiBody(
      event,
      PlatformAppCreateBodySchema,
    )
    const agent: string = agentId || 'cli'

    const appSlug = slug || slugify(name)
    const entityId = `platform:app/${appSlug}`

    // Idempotent
    const existing = getNode(kernel, entityId)
    if (existing) {
      return { ok: true, id: entityId, app: existing, created: false }
    }

    const now = new Date().toISOString()
    const data: Record<string, any> = {
      type: 'app',
      title: name,
      slug: appSlug,
      orgId: orgId || '',
      icon: icon || 'lucide:layout-grid',
      color: color || '#6366f1',
      description: description || '',
      ontologies: ontologies || [],
      createdAt: now,
      updatedAt: now,
    }

    await kernel.createNode(entityId, data, 'platform', { agentId: agent })
    pushMutationLog({ action: 'createApp', entityId, data })
    emitMutation({ action: 'createApp', entityId, type: 'platform', agentId: agent, data })

    // Link app to org if orgId provided
    if (orgId) {
      try {
        await kernel.link(orgId, 'hasApp', entityId, { agentId: agent })
      } catch {
        /* non-fatal */
      }
    }

    return { ok: true, id: entityId, app: { '@id': entityId, ...data }, created: true }
  }

  // ─── GET /api/platform/app/:id ───────────────────────────────────────
  if (method === 'GET' && domain === 'app' && action && action !== 'list') {
    const entityId = `platform:app/${action}${restId ? '/' + restId : ''}`
    const node = getNode(kernel, entityId)
    if (!node) {
      throw createError({ statusCode: 404, message: `App not found: ${entityId}` })
    }
    return { ok: true, app: node }
  }

  // ─── PUT /api/platform/app/:id ───────────────────────────────────────
  if (method === 'PUT' && domain === 'app' && action) {
    const entityId = `platform:app/${action}${restId ? '/' + restId : ''}`
    const { data, agentId } = await parseApiBody(event, PlatformUpdateBodySchema)
    const agent: string = agentId || 'cli'

    const existing = getNode(kernel, entityId)
    if (!existing) {
      throw createError({ statusCode: 404, message: `App not found: ${entityId}` })
    }

    const updateData = { ...(data || {}), updatedAt: new Date().toISOString() }
    await kernel.updateNode(entityId, updateData, 'platform', { agentId: agent })
    pushMutationLog({ action: 'updateApp', entityId, data: updateData })
    emitMutation({ action: 'updateApp', entityId, type: 'platform', agentId: agent, data: updateData })

    return { ok: true, id: entityId }
  }

  // ─── DELETE /api/platform/app/:id ────────────────────────────────────
  if (method === 'DELETE' && domain === 'app' && action) {
    const entityId = `platform:app/${action}${restId ? '/' + restId : ''}`
    const { agentId } = await parseApiBody(event, PlatformDeleteBodySchema)
    const agent: string = agentId || 'cli'

    const existing = getNode(kernel, entityId)
    if (!existing) {
      throw createError({ statusCode: 404, message: `App not found: ${entityId}` })
    }

    await kernel.deleteNode(entityId, { agentId: agent })
    pushMutationLog({ action: 'deleteApp', entityId })
    emitMutation({ action: 'deleteApp', entityId, agentId: agent })

    return { ok: true, id: entityId }
  }

  // ─── GET /api/platform/context ───────────────────────────────────────
  if (method === 'GET' && domain === 'context') {
    const { orgId, appId } = parseApiQuery(event, PlatformContextQuerySchema)

    let org: Record<string, any> | null = null
    let app: Record<string, any> | null = null

    if (orgId) {
      org = getNode(kernel, orgId.startsWith('platform:org/') ? orgId : `platform:org/${orgId}`)
    }
    if (appId) {
      app = getNode(kernel, appId.startsWith('platform:app/') ? appId : `platform:app/${appId}`)
    }

    // If no specific IDs, return first available
    if (!org) {
      const orgs = queryPlatformNodes(kernel, 'platform:org/')
      org = orgs[0] || null
    }
    if (!app && org) {
      const orgEntityId = org['@id'] as string
      const apps = queryPlatformNodes(kernel, 'platform:app/', (n) => n.orgId === orgEntityId)
      app = apps[0] || null
    }

    return { ok: true, org, app }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Phase 2: Collections & Pages
  // ═══════════════════════════════════════════════════════════════════════

  // ─── GET /api/platform/collection/list ───────────────────────────────
  if (method === 'GET' && domain === 'collection' && action === 'list') {
    const { appId } = parseApiQuery(event, PlatformOptionalAppQuerySchema)
    const nodes = queryPlatformNodes(kernel, 'platform:collection/', (node) => {
      if (appId && node.appId !== appId) return false
      return true
    })
    return { ok: true, collections: nodes }
  }

  // ─── POST /api/platform/collection/create ────────────────────────────
  if (method === 'POST' && domain === 'collection' && action === 'create') {
    const {
      name,
      slug,
      appId,
      type: collType,
      description,
      schema,
      agentId,
    } = await parseApiBody(event, PlatformCollectionCreateBodySchema)
    const agent: string = agentId || 'cli'

    const collSlug = slug || slugify(name)
    const entityId = `platform:collection/${collSlug}`

    const existing = getNode(kernel, entityId)
    if (existing) {
      return { ok: true, id: entityId, collection: existing, created: false }
    }

    const now = new Date().toISOString()
    const data: Record<string, any> = {
      type: 'collection',
      title: name,
      slug: collSlug,
      appId: appId || '',
      collectionType: collType || 'database',
      description: description || '',
      schema: schema || null,
      createdAt: now,
      updatedAt: now,
    }

    await kernel.createNode(entityId, data, 'platform', { agentId: agent })
    pushMutationLog({ action: 'createCollection', entityId, data })
    emitMutation({ action: 'createCollection', entityId, type: 'platform', agentId: agent, data })

    return { ok: true, id: entityId, collection: { '@id': entityId, ...data }, created: true }
  }

  // ─── PUT /api/platform/collection/:id ────────────────────────────────
  if (method === 'PUT' && domain === 'collection' && action) {
    const entityId = `platform:collection/${action}${restId ? '/' + restId : ''}`
    const { data, agentId } = await parseApiBody(event, PlatformUpdateBodySchema)
    const agent: string = agentId || 'cli'

    const existing = getNode(kernel, entityId)
    if (!existing) {
      throw createError({ statusCode: 404, message: `Collection not found: ${entityId}` })
    }

    const updateData = { ...(data || {}), updatedAt: new Date().toISOString() }
    await kernel.updateNode(entityId, updateData, 'platform', { agentId: agent })
    pushMutationLog({ action: 'updateCollection', entityId, data: updateData })
    emitMutation({ action: 'updateCollection', entityId, type: 'platform', agentId: agent, data: updateData })

    return { ok: true, id: entityId }
  }

  // ─── DELETE /api/platform/collection/:id ─────────────────────────────
  if (method === 'DELETE' && domain === 'collection' && action) {
    const entityId = `platform:collection/${action}${restId ? '/' + restId : ''}`
    const { agentId } = await parseApiBody(event, PlatformDeleteBodySchema)
    const agent: string = agentId || 'cli'

    const existing = getNode(kernel, entityId)
    if (!existing) {
      throw createError({ statusCode: 404, message: `Collection not found: ${entityId}` })
    }

    await kernel.deleteNode(entityId, { agentId: agent })
    pushMutationLog({ action: 'deleteCollection', entityId })
    emitMutation({ action: 'deleteCollection', entityId, agentId: agent })

    return { ok: true, id: entityId }
  }

  // ─── GET /api/platform/page/list ─────────────────────────────────────
  if (method === 'GET' && domain === 'page' && action === 'list') {
    const { appId } = parseApiQuery(event, PlatformOptionalAppQuerySchema)
    const nodes = queryPlatformNodes(kernel, 'platform:page/', (node) => {
      if (appId && node.appId !== appId) return false
      return true
    })
    return { ok: true, pages: nodes }
  }

  // ─── POST /api/platform/page/create ──────────────────────────────────
  if (method === 'POST' && domain === 'page' && action === 'create') {
    const { title, appId, dataSource, layout, defaultProjection, description, icon, agentId } = await parseApiBody(
      event,
      PlatformPageCreateBodySchema,
    )
    const agent: string = agentId || 'cli'

    const pageId = `platform:page/${slugify(title)}-${Date.now().toString(36)}`

    const now = new Date().toISOString()
    const data: Record<string, any> = {
      type: 'page',
      title,
      appId: appId || '',
      dataSource: dataSource || 'all',
      layout: layout || 'grid',
      defaultProjection: defaultProjection || 'table',
      description: description || '',
      icon: icon || 'lucide:file',
      createdAt: now,
      updatedAt: now,
    }

    await kernel.createNode(pageId, data, 'platform', { agentId: agent })
    pushMutationLog({ action: 'createPage', entityId: pageId, data })
    emitMutation({ action: 'createPage', entityId: pageId, type: 'platform', agentId: agent, data })

    return { ok: true, id: pageId, page: { '@id': pageId, ...data }, created: true }
  }

  // ─── PUT /api/platform/page/:id ──────────────────────────────────────
  if (method === 'PUT' && domain === 'page' && action) {
    const entityId = `platform:page/${action}${restId ? '/' + restId : ''}`
    const { data, agentId } = await parseApiBody(event, PlatformUpdateBodySchema)
    const agent: string = agentId || 'cli'

    const existing = getNode(kernel, entityId)
    if (!existing) {
      throw createError({ statusCode: 404, message: `Page not found: ${entityId}` })
    }

    const updateData = { ...(data || {}), updatedAt: new Date().toISOString() }
    await kernel.updateNode(entityId, updateData, 'platform', { agentId: agent })
    pushMutationLog({ action: 'updatePage', entityId, data: updateData })
    emitMutation({ action: 'updatePage', entityId, type: 'platform', agentId: agent, data: updateData })

    return { ok: true, id: entityId }
  }

  // ─── DELETE /api/platform/page/:id ───────────────────────────────────
  if (method === 'DELETE' && domain === 'page' && action) {
    const entityId = `platform:page/${action}${restId ? '/' + restId : ''}`
    const { agentId } = await parseApiBody(event, PlatformDeleteBodySchema)
    const agent: string = agentId || 'cli'

    const existing = getNode(kernel, entityId)
    if (!existing) {
      throw createError({ statusCode: 404, message: `Page not found: ${entityId}` })
    }

    await kernel.deleteNode(entityId, { agentId: agent })
    pushMutationLog({ action: 'deletePage', entityId })
    emitMutation({ action: 'deletePage', entityId, agentId: agent })

    return { ok: true, id: entityId }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Phase 3: Entity Enrichment (comments, tags)
  // ═══════════════════════════════════════════════════════════════════════

  // ─── GET /api/platform/comment/list/:entityId ────────────────────────
  if (method === 'GET' && domain === 'comment' && action === 'list') {
    const targetEntityId = restId || segments[2] || ''
    if (!targetEntityId) {
      throw createError({ statusCode: 400, message: 'entityId is required' })
    }

    const nodes = queryPlatformNodes(kernel, 'comment:', (node) => {
      return node.entityId === targetEntityId
    })
    // Sort newest first
    nodes.sort((a, b) => ((b.createdAt as string) || '').localeCompare((a.createdAt as string) || ''))
    return { ok: true, comments: nodes }
  }

  // ─── POST /api/platform/comment/add ──────────────────────────────────
  if (method === 'POST' && domain === 'comment' && action === 'add') {
    const {
      entityId: targetEntityId,
      content,
      commentType,
      authorId,
      authorName,
      metadata,
      agentId,
    } = await parseApiBody(event, PlatformCommentAddBodySchema)
    const agent: string = agentId || 'cli'

    const commentId = `comment:${crypto.randomUUID()}`
    const now = new Date().toISOString()
    const data: Record<string, any> = {
      type: 'comment',
      entityId: targetEntityId,
      entityType: 'entity',
      content,
      commentType: commentType || 'comment',
      authorId: authorId || agent,
      authorName: authorName || agent,
      metadata: metadata || null,
      createdAt: now,
    }

    await kernel.createNode(commentId, data, 'comment', { agentId: agent })

    // Link comment to parent entity
    try {
      const fullEntityId = targetEntityId.includes(':') ? targetEntityId : `entity:${targetEntityId}`
      await kernel.link(fullEntityId, 'hasComment', commentId, { agentId: agent })
    } catch {
      /* non-fatal — parent may not exist in TQL */
    }

    pushMutationLog({ action: 'addComment', entityId: commentId, data })
    emitMutation({ action: 'addComment', entityId: commentId, type: 'comment', agentId: agent, data })

    return { ok: true, id: commentId, comment: { '@id': commentId, ...data } }
  }

  // ─── GET /api/platform/tag/list ──────────────────────────────────────
  if (method === 'GET' && domain === 'tag' && action === 'list') {
    const nodes = queryPlatformNodes(kernel, 'platform:tag/')
    return { ok: true, tags: nodes }
  }

  // ─── POST /api/platform/tag/create ───────────────────────────────────
  if (method === 'POST' && domain === 'tag' && action === 'create') {
    const { name, color, description, agentId } = await parseApiBody(event, PlatformTagCreateBodySchema)
    const agent: string = agentId || 'cli'

    const tagSlug = slugify(name)
    const entityId = `platform:tag/${tagSlug}`

    // Idempotent
    const existing = getNode(kernel, entityId)
    if (existing) {
      return { ok: true, id: entityId, tag: existing, created: false }
    }

    const now = new Date().toISOString()
    const data: Record<string, any> = {
      type: 'tag',
      title: name,
      slug: tagSlug,
      color: color || '',
      description: description || '',
      createdAt: now,
    }

    await kernel.createNode(entityId, data, 'platform', { agentId: agent })
    pushMutationLog({ action: 'createTag', entityId, data })
    emitMutation({ action: 'createTag', entityId, type: 'platform', agentId: agent, data })

    return { ok: true, id: entityId, tag: { '@id': entityId, ...data }, created: true }
  }

  // ─── POST /api/platform/tag/assign ───────────────────────────────────
  if (method === 'POST' && domain === 'tag' && action === 'assign') {
    const { entityId: targetEntityId, tags, agentId } = await parseApiBody(event, PlatformTagAssignBodySchema)
    const agent: string = agentId || 'cli'

    const linked: string[] = []
    for (const tagName of tags) {
      const tagSlug = slugify(tagName)
      const tagEntityId = `platform:tag/${tagSlug}`

      // Auto-create tag if it doesn't exist
      const existing = getNode(kernel, tagEntityId)
      if (!existing) {
        const now = new Date().toISOString()
        await kernel.createNode(
          tagEntityId,
          {
            type: 'tag',
            title: tagName,
            slug: tagSlug,
            color: '',
            createdAt: now,
          },
          'platform',
          { agentId: agent },
        )
      }

      // Link entity to tag
      const fullEntityId = targetEntityId.includes(':') ? targetEntityId : `entity:${targetEntityId}`
      try {
        await kernel.link(fullEntityId, 'taggedWith', tagEntityId, { agentId: agent })
        linked.push(tagSlug)
      } catch {
        /* non-fatal */
      }
    }

    return { ok: true, entityId: targetEntityId, tagsLinked: linked }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Phase 4: Bulk Operations & Workflows
  // ═══════════════════════════════════════════════════════════════════════

  // ─── POST /api/platform/bulk/update ──────────────────────────────────
  if (method === 'POST' && domain === 'bulk' && action === 'update') {
    const { query: eqls, data, agentId } = await parseApiBody(event, PlatformBulkUpdateBodySchema)
    const agent: string = agentId || 'cli'

    // Execute query to find matching entity IDs
    const result = await kernel.query(eqls)
    const rows = result.rows || []
    if (rows.length === 0) {
      return { ok: true, updated: 0, ids: [] }
    }

    // Extract entity IDs from query results (first variable binding)
    const ids: string[] = []
    for (const row of rows) {
      const values = Object.values(row)
      if (values.length > 0 && typeof values[0] === 'string') {
        ids.push(values[0] as string)
      }
    }

    let updated = 0
    for (const entityId of ids) {
      try {
        await kernel.updateNode(entityId, data, 'entity', { agentId: agent })
        updated++
      } catch {
        /* skip failures */
      }
    }

    pushMutationLog({ action: 'bulkUpdate', data: { query: eqls, updated } })
    emitMutation({ action: 'bulkUpdate', entityId: '*', agentId: agent, data: { query: eqls, updated } })

    return { ok: true, updated, ids }
  }

  // ─── POST /api/platform/bulk/delete ──────────────────────────────────
  if (method === 'POST' && domain === 'bulk' && action === 'delete') {
    const { query: eqls, agentId } = await parseApiBody(event, PlatformBulkDeleteBodySchema)
    const agent: string = agentId || 'cli'

    const result = await kernel.query(eqls)
    const rows = result.rows || []
    if (rows.length === 0) {
      return { ok: true, deleted: 0, ids: [] }
    }

    const ids: string[] = []
    for (const row of rows) {
      const values = Object.values(row)
      if (values.length > 0 && typeof values[0] === 'string') {
        ids.push(values[0] as string)
      }
    }

    let deleted = 0
    for (const entityId of ids) {
      try {
        await kernel.deleteNode(entityId, { agentId: agent })
        deleted++
      } catch {
        /* skip failures */
      }
    }

    pushMutationLog({ action: 'bulkDelete', data: { query: eqls, deleted } })
    emitMutation({ action: 'bulkDelete', entityId: '*', agentId: agent, data: { query: eqls, deleted } })

    return { ok: true, deleted, ids }
  }

  // ─── GET /api/platform/workflow/list ─────────────────────────────────
  if (method === 'GET' && domain === 'workflow' && action === 'list') {
    const { appId } = parseApiQuery(event, PlatformOptionalAppQuerySchema)
    const nodes = queryPlatformNodes(kernel, 'platform:workflow/', (node) => {
      if (appId && node.appId !== appId) return false
      return true
    })
    return { ok: true, workflows: nodes }
  }

  // ─── POST /api/platform/workflow/create ──────────────────────────────
  if (method === 'POST' && domain === 'workflow' && action === 'create') {
    const { name, appId, trigger, graph, description, agentId } = await parseApiBody(
      event,
      PlatformWorkflowCreateBodySchema,
    )
    const agent: string = agentId || 'cli'

    const wfId = `platform:workflow/${slugify(name)}-${Date.now().toString(36)}`
    const now = new Date().toISOString()
    const data: Record<string, any> = {
      type: 'workflow',
      title: name,
      appId: appId || '',
      description: description || '',
      trigger: trigger || null,
      graph: graph || null,
      status: 'draft',
      createdAt: now,
      updatedAt: now,
    }

    await kernel.createNode(wfId, data, 'platform', { agentId: agent })
    pushMutationLog({ action: 'createWorkflow', entityId: wfId, data })
    emitMutation({ action: 'createWorkflow', entityId: wfId, type: 'platform', agentId: agent, data })

    return { ok: true, id: wfId, workflow: { '@id': wfId, ...data }, created: true }
  }

  // ─── PUT /api/platform/workflow/:id ──────────────────────────────────
  if (method === 'PUT' && domain === 'workflow' && action) {
    const entityId = `platform:workflow/${action}${restId ? '/' + restId : ''}`
    const { data, agentId } = await parseApiBody(event, PlatformUpdateBodySchema)
    const agent: string = agentId || 'cli'

    const existing = getNode(kernel, entityId)
    if (!existing) {
      throw createError({ statusCode: 404, message: `Workflow not found: ${entityId}` })
    }

    const updateData = { ...(data || {}), updatedAt: new Date().toISOString() }
    await kernel.updateNode(entityId, updateData, 'platform', { agentId: agent })
    pushMutationLog({ action: 'updateWorkflow', entityId, data: updateData })
    emitMutation({ action: 'updateWorkflow', entityId, type: 'platform', agentId: agent, data: updateData })

    return { ok: true, id: entityId }
  }

  // ─── DELETE /api/platform/workflow/:id ────────────────────────────────
  if (method === 'DELETE' && domain === 'workflow' && action) {
    const entityId = `platform:workflow/${action}${restId ? '/' + restId : ''}`
    const { agentId } = await parseApiBody(event, PlatformDeleteBodySchema)
    const agent: string = agentId || 'cli'

    const existing = getNode(kernel, entityId)
    if (!existing) {
      throw createError({ statusCode: 404, message: `Workflow not found: ${entityId}` })
    }

    await kernel.deleteNode(entityId, { agentId: agent })
    pushMutationLog({ action: 'deleteWorkflow', entityId })
    emitMutation({ action: 'deleteWorkflow', entityId, agentId: agent })

    return { ok: true, id: entityId }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Phase 5: Settings, Files & Invites
  // ═══════════════════════════════════════════════════════════════════════

  // ─── GET /api/platform/setting/get ───────────────────────────────────
  if (method === 'GET' && domain === 'setting' && action === 'get') {
    const { key, scope } = parseApiQuery(event, PlatformSettingGetQuerySchema)

    const entityId = `platform:setting/${scope}/${key}`
    const node = getNode(kernel, entityId)
    if (!node) {
      return { ok: true, key, value: null, found: false }
    }

    return { ok: true, key, value: node.value, scope, found: true }
  }

  // ─── POST /api/platform/setting/set ──────────────────────────────────
  if (method === 'POST' && domain === 'setting' && action === 'set') {
    const { key, value, scope: bodyScope, agentId } = await parseApiBody(event, PlatformSettingSetBodySchema)
    const agent: string = agentId || 'cli'
    const scope = bodyScope || 'app'

    const entityId = `platform:setting/${scope}/${key}`
    const now = new Date().toISOString()
    const data: Record<string, any> = {
      type: 'setting',
      key,
      value,
      scope,
      updatedAt: now,
    }

    const existing = getNode(kernel, entityId)
    if (existing) {
      await kernel.updateNode(entityId, data, 'platform', { agentId: agent })
    } else {
      data.createdAt = now
      await kernel.createNode(entityId, data, 'platform', { agentId: agent })
    }

    pushMutationLog({ action: 'setSetting', entityId, data })
    emitMutation({ action: 'setSetting', entityId, type: 'platform', agentId: agent, data })

    return { ok: true, key, value, scope }
  }

  // ─── GET /api/platform/setting/list ──────────────────────────────────
  if (method === 'GET' && domain === 'setting' && action === 'list') {
    const { scope } = parseApiQuery(event, PlatformSettingListQuerySchema)
    const prefix = `platform:setting/${scope}/`
    const nodes = queryPlatformNodes(kernel, prefix)
    return { ok: true, settings: nodes, scope }
  }

  // ─── POST /api/platform/file/upload ──────────────────────────────────
  // Proxy to existing /api/storage/upload
  if (method === 'POST' && domain === 'file' && action === 'upload') {
    const body = await parseApiBody(event, PlatformFileUploadBodySchema)
    const { entityId: targetEntityId, field, agentId } = body

    // For CLI file uploads, the CLI sends the file as base64 in the body
    // since multipart from CLI is complex. The server decodes and re-uploads.
    const { filename, contentType: ct } = body
    const agent: string = agentId || 'cli'

    const storagePath = targetEntityId
      ? `entities/${targetEntityId.replace(/:/g, '/')}/${filename}`
      : `uploads/${Date.now()}-${filename}`

    // Decode base64 and write to a temporary approach — for now just store the URL reference
    // In local mode, we store the file path as a reference on the entity
    const now = new Date().toISOString()
    const fileRef: Record<string, any> = {
      filename,
      contentType: ct || 'application/octet-stream',
      storagePath,
      uploadedAt: now,
      uploadedBy: agent,
    }

    // If attaching to an entity, update the entity's field
    if (targetEntityId && field) {
      const fullId = targetEntityId.includes(':') ? targetEntityId : `entity:${targetEntityId}`
      try {
        await kernel.updateNode(fullId, { [field]: storagePath }, 'entity', { agentId: agent })
      } catch {
        /* non-fatal */
      }
    }

    pushMutationLog({ action: 'fileUpload', entityId: storagePath, data: fileRef })

    return { ok: true, path: storagePath, filename, ...fileRef }
  }

  // ─── POST /api/platform/invite/send ──────────────────────────────────
  // Proxy to existing /api/invite
  if (method === 'POST' && domain === 'invite' && action === 'send') {
    const { email, emails, role, orgId, orgName, agentId } = await parseApiBody(event, PlatformInviteSendBodySchema)
    const agent: string = agentId || 'cli'

    const emailList = emails || (email ? [email] : [])

    // Proxy to existing invite endpoint
    try {
      const result = await $fetch('/api/invite', {
        method: 'POST',
        body: {
          emails: emailList,
          orgId: orgId || '',
          orgName: orgName || '',
          appId: '',
          inviterId: agent,
          inviterName: agent,
          role: role || 'member',
        },
      })
      return result
    } catch (err: any) {
      throw createError({ statusCode: 500, message: err?.message || 'Invite failed' })
    }
  }

  throw createError({ statusCode: 404, message: `Unknown platform API route: ${method} /api/platform/${path}` })
})
