/**
 * TrellisClient — HTTP client for the TQL Graph API.
 *
 * Zero dependencies beyond Node built-ins (fetch is global in Node 18+).
 * Used by the CLI and can be imported as an SDK by other packages.
 */

export interface TrellisClientOptions {
  /** Base URL of the Trellis API (default: $TRELLIS_API_URL or http://localhost:$TRELLIS_PORT) */
  baseUrl?: string
  /** Agent identifier sent with mutations */
  agentId?: string
}

export interface QueryResult {
  data: Record<string, unknown>[]
  meta?: {
    executionTime?: number
    plan?: string
    trace?: unknown[]
  }
}

export interface NodeResult {
  node: Record<string, any>
  links: {
    outgoing: Array<{ relation: string; target: string }>
    incoming: Array<{ relation: string; source: string }>
  }
}

export interface HealthResult {
  status: string
  factCount: number
  linkCount: number
}

export interface SummaryResult {
  health: { status: string; factCount: number; linkCount: number; entityCount: number }
  entityTypes: Array<{ type: string; count: number }>
  ontologies: { total: number; system: string[]; user: string[] }
  topAttributes: Array<{ attribute: string; distinctCount: number; cardinality: string }>
  links: { total: number; relations: string[] }
  recentMutations: Array<{ action: string; entityId?: string; timestamp: string }>
}

export interface MutateResult {
  ok: boolean
  entityId?: string
  e1?: string
  relation?: string
  e2?: string
}

export interface MutationEvent {
  id: number
  timestamp: string
  action: string
  entityId?: string
  type?: string
  agentId: string
  data?: Record<string, any>
}

export class TrellisClient {
  private baseUrl: string
  private agentId: string

  constructor(options: TrellisClientOptions = {}) {
    const defaultApiUrl = `http://localhost:${process.env.TRELLIS_PORT || '1414'}`
    this.baseUrl = (options.baseUrl || process.env.TRELLIS_API_URL || defaultApiUrl).replace(/\/$/, '')
    this.agentId = options.agentId || process.env.TRELLIS_AGENT_ID || 'cli'
  }

  private get apiBase(): string {
    return `${this.baseUrl}/api/graph`
  }

  private async request<T>(path: string, options?: { method?: string; body?: Record<string, any> }): Promise<T> {
    const url = `${this.apiBase}/${path}`
    const res = await fetch(url, {
      method: options?.method || 'GET',
      headers: options?.body ? { 'Content-Type': 'application/json' } : undefined,
      body: options?.body ? JSON.stringify(options.body) : undefined,
    })

    if (!res.ok) {
      let message: string
      try {
        const err = await res.json() as Record<string, any>
        message = (err.message as string) || (err.statusMessage as string) || res.statusText
      } catch {
        message = res.statusText
      }
      throw new Error(`[${res.status}] ${message}`)
    }

    return res.json() as Promise<T>
  }

  // ── Queries ──────────────────────────────────────────────────────────

  /** Get a compact graph summary — health, entity types, ontologies, top attributes, recent mutations. */
  async summary(limit?: number): Promise<SummaryResult> {
    const path = limit ? `summary?limit=${limit}` : 'summary'
    return this.request<SummaryResult>(path)
  }

  /** Execute an EQL-S query. */
  async query(eqls: string): Promise<QueryResult> {
    return this.request<QueryResult>('query', {
      method: 'POST',
      body: { query: eqls },
    })
  }

  /** Execute a named projection. */
  async projection(id: string): Promise<QueryResult> {
    return this.request<QueryResult>('query', {
      method: 'POST',
      body: { projection: id },
    })
  }

  // ── Node Access ──────────────────────────────────────────────────────

  /** Fetch a single node by entity ID. */
  async getNode(entityId: string): Promise<NodeResult> {
    return this.request<NodeResult>(`node/${entityId}`)
  }

  /** Batch fetch multiple nodes by entity IDs. */
  async getNodes(ids: string[]): Promise<Record<string, any>[]> {
    const result = await this.request<{ nodes: Record<string, any>[] }>('nodes', {
      method: 'POST',
      body: { ids },
    })
    return result.nodes
  }

  // ── Mutations ────────────────────────────────────────────────────────

  /** Create a new node. */
  async createNode(entityId: string, type: string, data?: Record<string, any>): Promise<MutateResult> {
    return this.request<MutateResult>('mutate', {
      method: 'POST',
      body: { action: 'createNode', entityId, type, data, agentId: this.agentId },
    })
  }

  /** Update an existing node (full replace). */
  async updateNode(entityId: string, type: string, data?: Record<string, any>): Promise<MutateResult> {
    return this.request<MutateResult>('mutate', {
      method: 'POST',
      body: { action: 'updateNode', entityId, type, data, agentId: this.agentId },
    })
  }

  /** Delete a node. */
  async deleteNode(entityId: string): Promise<MutateResult> {
    return this.request<MutateResult>('mutate', {
      method: 'POST',
      body: { action: 'deleteNode', entityId, agentId: this.agentId },
    })
  }

  /** Create a link between two nodes. */
  async link(e1: string, relation: string, e2: string): Promise<MutateResult> {
    return this.request<MutateResult>('mutate', {
      method: 'POST',
      body: { action: 'link', e1, relation, e2, agentId: this.agentId },
    })
  }

  // ── Introspection ────────────────────────────────────────────────────

  /** Health check. */
  async health(): Promise<HealthResult> {
    return this.request<HealthResult>('health')
  }

  /** List registered ontologies. */
  async ontologies(): Promise<Record<string, any>> {
    return this.request<{ ontologies: Record<string, any> }>('ontologies').then((r) => r.ontologies)
  }

  /** Get the EAV catalog. */
  async catalog(): Promise<Record<string, any>> {
    return this.request<{ catalog: Record<string, any> }>('catalog').then((r) => r.catalog)
  }

  /** Get mutation log. */
  async log(): Promise<any[]> {
    return this.request<{ entries: any[] }>('log').then((r) => r.entries)
  }

  // ── Ontology CRUD ──────────────────────────────────────────────────

  /** Get a single ontology by ID. */
  async getOntology(id: string): Promise<Record<string, any>> {
    return this.request<{ ontology: Record<string, any> }>(`ontology/${id}`).then((r) => r.ontology)
  }

  /** Create a new ontology. */
  async createOntology(schema: Record<string, any>): Promise<MutateResult> {
    return this.request<MutateResult>('ontology', {
      method: 'POST',
      body: { schema, agentId: this.agentId },
    })
  }

  /** Update an existing ontology (full replace). */
  async updateOntology(id: string, schema: Record<string, any>): Promise<MutateResult> {
    return this.request<MutateResult>(`ontology/${id}`, {
      method: 'PUT',
      body: { schema, agentId: this.agentId },
    })
  }

  /** Add a field to an existing ontology. */
  async addOntologyField(id: string, field: Record<string, any>): Promise<MutateResult> {
    const existing = await this.getOntology(id)
    const fields = [...(existing.fields || []), field]
    return this.updateOntology(id, { ...existing, fields })
  }

  /** Remove a field from an existing ontology by field name. */
  async removeOntologyField(id: string, fieldName: string): Promise<MutateResult> {
    const existing = await this.getOntology(id)
    const fields = ((existing.fields as any[]) || []).filter((f: any) => f.name !== fieldName)
    return this.updateOntology(id, { ...existing, fields })
  }

  /** Delete an ontology. */
  async deleteOntology(id: string): Promise<MutateResult> {
    return this.request<MutateResult>(`ontology/${id}`, {
      method: 'DELETE',
      body: { agentId: this.agentId },
    })
  }

  // ── Platform API ────────────────────────────────────────────────────

  private get platformBase(): string {
    return `${this.baseUrl}/api/platform`
  }

  private async platformRequest<T>(
    path: string,
    options?: { method?: string; body?: Record<string, any>; query?: Record<string, string> },
  ): Promise<T> {
    let url = `${this.platformBase}/${path}`
    if (options?.query) {
      const params = new URLSearchParams(options.query)
      url += `?${params.toString()}`
    }
    const res = await fetch(url, {
      method: options?.method || 'GET',
      headers: options?.body ? { 'Content-Type': 'application/json' } : undefined,
      body: options?.body ? JSON.stringify(options.body) : undefined,
    })

    if (!res.ok) {
      let message: string
      try {
        const err = (await res.json()) as Record<string, any>
        message = (err.message as string) || (err.statusMessage as string) || res.statusText
      } catch {
        message = res.statusText
      }
      throw new Error(`[${res.status}] ${message}`)
    }

    return res.json() as Promise<T>
  }

  // ── Phase 1: Org / App / Context ───────────────────────────────────

  async listOrgs(): Promise<{ ok: boolean; orgs: Record<string, any>[] }> {
    return this.platformRequest('org/list')
  }

  async createOrg(name: string, slug?: string, description?: string): Promise<Record<string, any>> {
    return this.platformRequest('org/create', {
      method: 'POST',
      body: { name, slug, description, agentId: this.agentId },
    })
  }

  async getOrg(id: string): Promise<Record<string, any>> {
    return this.platformRequest(`org/${id}`)
  }

  async listApps(orgId?: string): Promise<{ ok: boolean; apps: Record<string, any>[] }> {
    const query = orgId ? { orgId } : undefined
    return this.platformRequest('app/list', { query })
  }

  async createApp(data: Record<string, any>): Promise<Record<string, any>> {
    return this.platformRequest('app/create', {
      method: 'POST',
      body: { ...data, agentId: this.agentId },
    })
  }

  async getApp(id: string): Promise<Record<string, any>> {
    return this.platformRequest(`app/${id}`)
  }

  async updateApp(id: string, data: Record<string, any>): Promise<MutateResult> {
    return this.platformRequest(`app/${id}`, {
      method: 'PUT',
      body: { data, agentId: this.agentId },
    })
  }

  async deleteApp(id: string): Promise<MutateResult> {
    return this.platformRequest(`app/${id}`, {
      method: 'DELETE',
      body: { agentId: this.agentId },
    })
  }

  async getContext(orgId?: string, appId?: string): Promise<Record<string, any>> {
    const query: Record<string, string> = {}
    if (orgId) query.orgId = orgId
    if (appId) query.appId = appId
    return this.platformRequest('context', { query })
  }

  // ── Phase 2: Collections & Pages ───────────────────────────────────

  async listCollections(appId?: string): Promise<{ ok: boolean; collections: Record<string, any>[] }> {
    const query = appId ? { appId } : undefined
    return this.platformRequest('collection/list', { query })
  }

  async createCollection(data: Record<string, any>): Promise<Record<string, any>> {
    return this.platformRequest('collection/create', {
      method: 'POST',
      body: { ...data, agentId: this.agentId },
    })
  }

  async updateCollection(id: string, data: Record<string, any>): Promise<MutateResult> {
    return this.platformRequest(`collection/${id}`, {
      method: 'PUT',
      body: { data, agentId: this.agentId },
    })
  }

  async deleteCollection(id: string): Promise<MutateResult> {
    return this.platformRequest(`collection/${id}`, {
      method: 'DELETE',
      body: { agentId: this.agentId },
    })
  }

  async listPages(appId?: string): Promise<{ ok: boolean; pages: Record<string, any>[] }> {
    const query = appId ? { appId } : undefined
    return this.platformRequest('page/list', { query })
  }

  async createPage(data: Record<string, any>): Promise<Record<string, any>> {
    return this.platformRequest('page/create', {
      method: 'POST',
      body: { ...data, agentId: this.agentId },
    })
  }

  async updatePage(id: string, data: Record<string, any>): Promise<MutateResult> {
    return this.platformRequest(`page/${id}`, {
      method: 'PUT',
      body: { data, agentId: this.agentId },
    })
  }

  async deletePage(id: string): Promise<MutateResult> {
    return this.platformRequest(`page/${id}`, {
      method: 'DELETE',
      body: { agentId: this.agentId },
    })
  }

  // ── Phase 3: Comments & Tags ───────────────────────────────────────

  async listComments(entityId: string): Promise<{ ok: boolean; comments: Record<string, any>[] }> {
    return this.platformRequest(`comment/list/${entityId}`)
  }

  async addComment(entityId: string, content: string, options?: Record<string, any>): Promise<Record<string, any>> {
    return this.platformRequest('comment/add', {
      method: 'POST',
      body: { entityId, content, ...options, agentId: this.agentId },
    })
  }

  async listTags(): Promise<{ ok: boolean; tags: Record<string, any>[] }> {
    return this.platformRequest('tag/list')
  }

  async createTag(name: string, color?: string, description?: string): Promise<Record<string, any>> {
    return this.platformRequest('tag/create', {
      method: 'POST',
      body: { name, color, description, agentId: this.agentId },
    })
  }

  async assignTags(entityId: string, tags: string[]): Promise<Record<string, any>> {
    return this.platformRequest('tag/assign', {
      method: 'POST',
      body: { entityId, tags, agentId: this.agentId },
    })
  }

  // ── Phase 4: Bulk & Workflows ──────────────────────────────────────

  async bulkUpdate(eqls: string, data: Record<string, any>): Promise<{ ok: boolean; updated: number; ids: string[] }> {
    return this.platformRequest('bulk/update', {
      method: 'POST',
      body: { query: eqls, data, agentId: this.agentId },
    })
  }

  async bulkDelete(eqls: string): Promise<{ ok: boolean; deleted: number; ids: string[] }> {
    return this.platformRequest('bulk/delete', {
      method: 'POST',
      body: { query: eqls, agentId: this.agentId },
    })
  }

  async listWorkflows(appId?: string): Promise<{ ok: boolean; workflows: Record<string, any>[] }> {
    const query = appId ? { appId } : undefined
    return this.platformRequest('workflow/list', { query })
  }

  async createWorkflow(data: Record<string, any>): Promise<Record<string, any>> {
    return this.platformRequest('workflow/create', {
      method: 'POST',
      body: { ...data, agentId: this.agentId },
    })
  }

  async updateWorkflow(id: string, data: Record<string, any>): Promise<MutateResult> {
    return this.platformRequest(`workflow/${id}`, {
      method: 'PUT',
      body: { data, agentId: this.agentId },
    })
  }

  async deleteWorkflow(id: string): Promise<MutateResult> {
    return this.platformRequest(`workflow/${id}`, {
      method: 'DELETE',
      body: { agentId: this.agentId },
    })
  }

  // ── Phase 5: Settings, Files & Invites ─────────────────────────────

  async getSetting(key: string, scope?: string): Promise<Record<string, any>> {
    const query: Record<string, string> = { key }
    if (scope) query.scope = scope
    return this.platformRequest('setting/get', { query })
  }

  async setSetting(key: string, value: any, scope?: string): Promise<Record<string, any>> {
    return this.platformRequest('setting/set', {
      method: 'POST',
      body: { key, value, scope, agentId: this.agentId },
    })
  }

  async listSettings(scope?: string): Promise<{ ok: boolean; settings: Record<string, any>[]; scope: string }> {
    const query = scope ? { scope } : undefined
    return this.platformRequest('setting/list', { query })
  }

  async uploadFile(fileBase64: string, filename: string, options?: Record<string, any>): Promise<Record<string, any>> {
    return this.platformRequest('file/upload', {
      method: 'POST',
      body: { fileBase64, filename, ...options, agentId: this.agentId },
    })
  }

  async sendInvite(email: string, options?: Record<string, any>): Promise<Record<string, any>> {
    return this.platformRequest('invite/send', {
      method: 'POST',
      body: { email, ...options, agentId: this.agentId },
    })
  }

  // ── SSE Watch ────────────────────────────────────────────────────────

  /**
   * Watch for realtime mutation events via SSE.
   * Returns an AbortController to stop watching.
   */
  watch(onEvent: (event: MutationEvent) => void, onError?: (error: Error) => void): AbortController {
    const controller = new AbortController()
    const url = `${this.apiBase}/events`

    const connect = async () => {
      try {
        const res = await fetch(url, { signal: controller.signal })
        if (!res.ok || !res.body) {
          throw new Error(`SSE connection failed: ${res.status}`)
        }

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          let currentEvent = ''
          let currentData = ''

          for (const line of lines) {
            if (line.startsWith('event: ')) {
              currentEvent = line.slice(7)
            } else if (line.startsWith('data: ')) {
              currentData = line.slice(6)
            } else if (line === '' && currentEvent && currentData) {
              if (currentEvent === 'mutation') {
                try {
                  const parsed = JSON.parse(currentData) as MutationEvent
                  onEvent(parsed)
                } catch {
                  // Malformed event — skip
                }
              }
              currentEvent = ''
              currentData = ''
            }
          }
        }
      } catch (err: any) {
        if (err.name === 'AbortError') return
        onError?.(err)
        // Reconnect after 2s unless aborted
        if (!controller.signal.aborted) {
          setTimeout(connect, 2000)
        }
      }
    }

    connect()
    return controller
  }
}
