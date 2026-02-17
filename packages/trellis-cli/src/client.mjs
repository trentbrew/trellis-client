/**
 * TrellisClient — HTTP client for the TQL Graph API.
 *
 * Zero dependencies beyond Node built-ins (fetch is global in Node 18+).
 * Used by the CLI and can be imported as an SDK by other packages.
 */

export class TrellisClient {
  /** @type {string} */
  #baseUrl
  /** @type {string} */
  #agentId

  /**
   * @param {{ baseUrl?: string, agentId?: string }} [options]
   */
  constructor(options = {}) {
    const defaultApiUrl = `http://localhost:${process.env.TRELLIS_PORT || '1414'}`
    this.#baseUrl = (options.baseUrl || process.env.TRELLIS_API_URL || defaultApiUrl).replace(/\/$/, '')
    this.#agentId = options.agentId || process.env.TRELLIS_AGENT_ID || 'cli'
  }

  get apiBase() {
    return `${this.#baseUrl}/api/graph`
  }

  /**
   * @template T
   * @param {string} path
   * @param {{ method?: string, body?: Record<string, any> }} [options]
   * @returns {Promise<T>}
   */
  async #request(path, options) {
    const url = `${this.apiBase}/${path}`
    const res = await fetch(url, {
      method: options?.method || 'GET',
      headers: options?.body ? { 'Content-Type': 'application/json' } : undefined,
      body: options?.body ? JSON.stringify(options.body) : undefined,
    })

    if (!res.ok) {
      let message
      try {
        const err = await res.json()
        message = err.message || err.statusMessage || res.statusText
      } catch {
        message = res.statusText
      }
      throw new Error(`[${res.status}] ${message}`)
    }

    return res.json()
  }

  // ── Queries ──────────────────────────────────────────────────────────

  /** Execute an EQL-S query. */
  async query(eqls) {
    return this.#request('query', { method: 'POST', body: { query: eqls } })
  }

  /** Execute a named projection. */
  async projection(id) {
    return this.#request('query', { method: 'POST', body: { projection: id } })
  }

  // ── Node Access ──────────────────────────────────────────────────────

  /** Fetch a single node by entity ID. */
  async getNode(entityId) {
    return this.#request(`node/${entityId}`)
  }

  /** Batch fetch multiple nodes by entity IDs. */
  async getNodes(ids) {
    const result = await this.#request('nodes', { method: 'POST', body: { ids } })
    return result.nodes
  }

  // ── Mutations ────────────────────────────────────────────────────────

  /** Create a new node. */
  async createNode(entityId, type, data) {
    return this.#request('mutate', {
      method: 'POST',
      body: { action: 'createNode', entityId, type, data, agentId: this.#agentId },
    })
  }

  /** Update an existing node (full replace). */
  async updateNode(entityId, type, data) {
    return this.#request('mutate', {
      method: 'POST',
      body: { action: 'updateNode', entityId, type, data, agentId: this.#agentId },
    })
  }

  /** Delete a node. */
  async deleteNode(entityId) {
    return this.#request('mutate', {
      method: 'POST',
      body: { action: 'deleteNode', entityId, agentId: this.#agentId },
    })
  }

  /** Create a link between two nodes. */
  async link(e1, relation, e2) {
    return this.#request('mutate', {
      method: 'POST',
      body: { action: 'link', e1, relation, e2, agentId: this.#agentId },
    })
  }

  // ── Introspection ────────────────────────────────────────────────────

  /** Health check. */
  async health() {
    return this.#request('health')
  }

  /** List registered ontologies. */
  async ontologies() {
    return this.#request('ontologies').then((r) => r.ontologies)
  }

  /** Get the EAV catalog. */
  async catalog() {
    return this.#request('catalog').then((r) => r.catalog)
  }

  /** Get mutation log. */
  async log() {
    return this.#request('log').then((r) => r.entries)
  }

  // ── Ontology CRUD ──────────────────────────────────────────────────

  /** Get a single ontology by ID. */
  async getOntology(id) {
    return this.#request(`ontology/${id}`).then((r) => r.ontology)
  }

  /** Create a new ontology. */
  async createOntology(schema) {
    return this.#request('ontology', {
      method: 'POST',
      body: { schema, agentId: this.#agentId },
    })
  }

  /** Update an existing ontology (full replace). */
  async updateOntology(id, schema) {
    return this.#request(`ontology/${id}`, {
      method: 'PUT',
      body: { schema, agentId: this.#agentId },
    })
  }

  /** Add a field to an existing ontology. */
  async addOntologyField(id, field) {
    const existing = await this.getOntology(id)
    const fields = [...(existing.fields || []), field]
    return this.updateOntology(id, { ...existing, fields })
  }

  /** Remove a field from an existing ontology by field name. */
  async removeOntologyField(id, fieldName) {
    const existing = await this.getOntology(id)
    const fields = (existing.fields || []).filter((f) => f.name !== fieldName)
    return this.updateOntology(id, { ...existing, fields })
  }

  /** Delete an ontology. */
  async deleteOntology(id) {
    return this.#request(`ontology/${id}`, {
      method: 'DELETE',
      body: { agentId: this.#agentId },
    })
  }

  // ── SSE Watch ────────────────────────────────────────────────────────

  /**
   * Watch for realtime mutation events via SSE.
   * Returns an AbortController to stop watching.
   * @param {(event: any) => void} onEvent
   * @param {(error: Error) => void} [onError]
   * @returns {AbortController}
   */
  watch(onEvent, onError) {
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
                  const parsed = JSON.parse(currentData)
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
      } catch (err) {
        if (err.name === 'AbortError') return
        onError?.(err)
        if (!controller.signal.aborted) {
          setTimeout(connect, 2000)
        }
      }
    }

    connect()
    return controller
  }
}
