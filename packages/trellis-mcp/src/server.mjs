/**
 * Trellis MCP Server
 *
 * Exposes the Trellis graph API as MCP tools for AI agents
 * (OpenCode, Claude Code, Gemini CLI, etc.).
 *
 * Connects to the running Trellis dev server via HTTP (same REST
 * endpoints the CLI uses) and translates MCP tool calls into
 * graph mutations/queries. Mutations flow through the SSE event
 * bus, so the browser UI updates in realtime.
 *
 * Uses the low-level MCP Server class with raw JSON Schema to avoid
 * Zod version compatibility issues across the pnpm workspace.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'

// ── Config ──────────────────────────────────────────────────────────────────

const BASE_URL = (process.env.TRELLIS_API_URL || 'http://localhost:4141').replace(/\/$/, '')
const AGENT_ID = process.env.TRELLIS_AGENT_ID || 'mcp'
const API = `${BASE_URL}/api/graph`

// ── HTTP helper ─────────────────────────────────────────────────────────────

async function request(path, options) {
  const url = `${API}/${path}`
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

function ok(data) {
  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] }
}

function err(message) {
  return { content: [{ type: 'text', text: `Error: ${message}` }], isError: true }
}

// ── Entity type reference ───────────────────────────────────────────────────

const ENTITY_TYPES = [
  'task', 'event', 'trip', 'payment', 'appointment', 'reminder', 'deadline', 'milestone',
  'note', 'file', 'page', 'template', 'slide_deck', 'bookmark',
  'person', 'contact', 'organization', 'vendor',
  'project', 'folder', 'collection', 'goal',
]

// ── Entity type schema resource ─────────────────────────────────────────────

const ENTITY_SCHEMA = {
  classes: {
    temporal: {
      description: 'Has date/time span, lives on a calendar',
      types: ['task', 'event', 'trip', 'payment', 'appointment', 'reminder', 'deadline', 'milestone'],
      baseProjections: ['calendar', 'list', 'table', 'kanban', 'timeline'],
    },
    document: {
      description: 'Has rich content body, no inherent temporality',
      types: ['note', 'file', 'page', 'template', 'slide_deck', 'bookmark'],
      baseProjections: ['list', 'card-grid', 'table'],
    },
    actor: {
      description: 'Represents a person or entity with identity',
      types: ['person', 'contact', 'organization', 'vendor'],
      baseProjections: ['table', 'card-grid', 'list', 'graph'],
    },
    container: {
      description: 'Groups/organizes other entities',
      types: ['project', 'folder', 'collection', 'goal'],
      baseProjections: ['list', 'kanban', 'table'],
    },
  },
  commonFields: {
    all: ['id', 'type', 'title', 'description', 'tags', 'owner', 'involved', 'category', 'references', 'createdAt', 'updatedAt'],
    temporal: ['startDate', 'endDate', 'allDay', 'startTime', 'endTime', 'priority', 'urgency', 'reminders', 'recurrence'],
    document: ['content', 'pinned', 'wordCount'],
    actor: ['email', 'phone', 'avatar', 'role', 'relationships'],
    container: ['children', 'progress', 'status', 'parentId'],
  },
  enums: {
    priority: ['critical', 'high', 'medium', 'low'],
    urgency: ['urgent', 'not-urgent'],
    taskStatus: ['pending', 'in-progress', 'on-track', 'due-soon', 'overdue', 'completed'],
    containerStatus: ['active', 'archived', 'completed', 'on-hold'],
  },
  relations: ['assignedTo', 'belongsTo', 'references', 'dependsOn', 'parentOf', 'childOf'],
}

// ── Tool definitions (JSON Schema) ──────────────────────────────────────────

const TOOLS = [
  {
    name: 'query_graph',
    description: 'Execute an EQL-S query against the Trellis knowledge graph. Example: FIND tasks AS t WHERE t.priority = "high" RETURN t.title, t.startDate',
    inputSchema: {
      type: 'object',
      properties: { query: { type: 'string', description: 'EQL-S query string' } },
      required: ['query'],
    },
  },
  {
    name: 'get_node',
    description: 'Fetch a single entity by its ID, including its properties and links (outgoing/incoming references).',
    inputSchema: {
      type: 'object',
      properties: { entityId: { type: 'string', description: 'The entity ID to fetch (e.g. "task-1")' } },
      required: ['entityId'],
    },
  },
  {
    name: 'get_nodes',
    description: 'Batch fetch multiple entities by their IDs.',
    inputSchema: {
      type: 'object',
      properties: { ids: { type: 'array', items: { type: 'string' }, description: 'Array of entity IDs' } },
      required: ['ids'],
    },
  },
  {
    name: 'create_node',
    description: `Create a new entity in the Trellis graph. Appears in the UI in realtime via SSE. Valid types: ${ENTITY_TYPES.join(', ')}`,
    inputSchema: {
      type: 'object',
      properties: {
        entityId: { type: 'string', description: 'Unique ID for the new entity (e.g. "task-abc123")' },
        type: { type: 'string', description: `Entity type`, enum: ENTITY_TYPES },
        data: { type: 'object', description: 'Entity properties (title, description, startDate, priority, etc.)' },
      },
      required: ['entityId', 'type'],
    },
  },
  {
    name: 'update_node',
    description: 'Update an existing entity. Provide only the fields you want to change.',
    inputSchema: {
      type: 'object',
      properties: {
        entityId: { type: 'string', description: 'ID of the entity to update' },
        type: { type: 'string', description: 'Entity type (must match existing)' },
        data: { type: 'object', description: 'Properties to update (merged with existing)' },
      },
      required: ['entityId', 'type', 'data'],
    },
  },
  {
    name: 'delete_node',
    description: 'Delete an entity from the Trellis graph. Permanent.',
    inputSchema: {
      type: 'object',
      properties: { entityId: { type: 'string', description: 'ID of the entity to delete' } },
      required: ['entityId'],
    },
  },
  {
    name: 'link_nodes',
    description: 'Create a semantic link between two entities (e.g. assignedTo, belongsTo, references, dependsOn).',
    inputSchema: {
      type: 'object',
      properties: {
        e1: { type: 'string', description: 'Source entity ID' },
        relation: { type: 'string', description: 'Relation name (assignedTo, belongsTo, references, dependsOn, parentOf, childOf)' },
        e2: { type: 'string', description: 'Target entity ID' },
      },
      required: ['e1', 'relation', 'e2'],
    },
  },
  {
    name: 'graph_health',
    description: 'Check graph health — returns fact count, link count, and status.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'get_schema',
    description: 'Get registered ontologies (type schemas) from the graph.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'get_catalog',
    description: 'Get the auto-generated EAV catalog showing all attributes and their value distributions.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'get_mutation_log',
    description: 'Get the recent mutation log showing what changes have been made to the graph.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'get_ontology',
    description: 'Get a single ontology (type schema) by ID.',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string', description: 'Ontology ID (e.g. "trellis:schema/invoice")' } },
      required: ['id'],
    },
  },
  {
    name: 'create_ontology',
    description: 'Create a new ontology (type schema). The new type will auto-appear in the Trellis UI sidebar. Fields use Notion-compatible value types: title, rich_text, number, select, multi_select, status, date, people, files, checkbox, url, email, phone_number, relation, rollup, formula.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Ontology ID (e.g. "trellis:schema/invoice")' },
        version: { type: 'string', description: 'Schema version (default: "1.0.0")' },
        fields: {
          type: 'array',
          description: 'Array of field definitions: { name, valueType, required?, description?, selectOptions? }',
          items: { type: 'object' },
        },
      },
      required: ['id', 'fields'],
    },
  },
  {
    name: 'update_ontology',
    description: 'Update an existing ontology (full replace of fields and version).',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Ontology ID to update' },
        version: { type: 'string', description: 'New version string' },
        fields: { type: 'array', description: 'New field definitions (replaces all existing)', items: { type: 'object' } },
      },
      required: ['id', 'fields'],
    },
  },
  {
    name: 'delete_ontology',
    description: 'Delete an ontology. Removes the type schema — existing entities of that type remain but the type disappears from the UI.',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string', description: 'Ontology ID to delete' } },
      required: ['id'],
    },
  },
]

// ── Tool handlers ───────────────────────────────────────────────────────────

const HANDLERS = {
  async query_graph({ query }) {
    return ok(await request('query', { method: 'POST', body: { query } }))
  },

  async get_node({ entityId }) {
    return ok(await request(`node/${entityId}`))
  },

  async get_nodes({ ids }) {
    return ok(await request('nodes', { method: 'POST', body: { ids } }))
  },

  async create_node({ entityId, type, data }) {
    return ok(await request('mutate', {
      method: 'POST',
      body: { action: 'createNode', entityId, type, data: data || {}, agentId: AGENT_ID },
    }))
  },

  async update_node({ entityId, type, data }) {
    return ok(await request('mutate', {
      method: 'POST',
      body: { action: 'updateNode', entityId, type, data, agentId: AGENT_ID },
    }))
  },

  async delete_node({ entityId }) {
    return ok(await request('mutate', {
      method: 'POST',
      body: { action: 'deleteNode', entityId, agentId: AGENT_ID },
    }))
  },

  async link_nodes({ e1, relation, e2 }) {
    return ok(await request('mutate', {
      method: 'POST',
      body: { action: 'link', e1, relation, e2, agentId: AGENT_ID },
    }))
  },

  async graph_health() {
    return ok(await request('health'))
  },

  async get_schema() {
    return ok(await request('ontologies'))
  },

  async get_catalog() {
    return ok(await request('catalog'))
  },

  async get_mutation_log() {
    return ok(await request('log'))
  },

  async get_ontology({ id }) {
    return ok(await request(`ontology/${id}`))
  },

  async create_ontology({ id, version, fields }) {
    const schema = { '@id': id, '@type': 'trellis:Schema', version: version || '1.0.0', fields }
    return ok(await request('ontology', {
      method: 'POST',
      body: { schema, agentId: AGENT_ID },
    }))
  },

  async update_ontology({ id, version, fields }) {
    const schema = { '@id': id, '@type': 'trellis:Schema', version: version || '1.0.0', fields }
    return ok(await request(`ontology/${id}`, {
      method: 'PUT',
      body: { schema, agentId: AGENT_ID },
    }))
  },

  async delete_ontology({ id }) {
    return ok(await request(`ontology/${id}`, {
      method: 'DELETE',
      body: { agentId: AGENT_ID },
    }))
  },
}

// ── MCP Server (low-level) ──────────────────────────────────────────────────

const server = new Server(
  { name: 'trellis-graph', version: '0.1.0' },
  { capabilities: { tools: {}, resources: {} } },
)

// List tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS }
})

// Call tool
server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args } = req.params
  const handler = HANDLERS[name]
  if (!handler) {
    return err(`Unknown tool: ${name}`)
  }
  try {
    return await handler(args || {})
  } catch (e) {
    return err(e.message)
  }
})

// List resources
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: 'trellis://schema/entity-types',
        name: 'Entity Type Registry',
        description: 'Complete entity type registry — classes, types, fields, and projections',
        mimeType: 'application/json',
      },
    ],
  }
})

// Read resource
server.setRequestHandler(ReadResourceRequestSchema, async (req) => {
  const { uri } = req.params
  if (uri === 'trellis://schema/entity-types') {
    return {
      contents: [{ uri, text: JSON.stringify(ENTITY_SCHEMA, null, 2), mimeType: 'application/json' }],
    }
  }
  throw new Error(`Unknown resource: ${uri}`)
})

// ── Start ───────────────────────────────────────────────────────────────────

const transport = new StdioServerTransport()
await server.connect(transport)
