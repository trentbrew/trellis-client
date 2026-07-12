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

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// ── Config ──────────────────────────────────────────────────────────────────

const defaultApiUrl = `http://localhost:${process.env.TRELLIS_PORT || '1414'}`;
const BASE_URL = (process.env.TRELLIS_API_URL || defaultApiUrl).replace(
  /\/$/,
  '',
);
const AGENT_ID = process.env.TRELLIS_AGENT_ID || 'mcp';
const API = `${BASE_URL}/api/graph`;
const PLATFORM_API = `${BASE_URL}/api/platform`;

// ── HTTP helpers ────────────────────────────────────────────────────────────

async function request(path, options) {
  const url = `${API}/${path}`;
  const res = await fetch(url, {
    method: options?.method || 'GET',
    headers: options?.body ? { 'Content-Type': 'application/json' } : undefined,
    body: options?.body ? JSON.stringify(options.body) : undefined,
  });

  if (!res.ok) {
    let message;
    try {
      const err = await res.json();
      message = err.message || err.statusMessage || res.statusText;
    } catch {
      message = res.statusText;
    }
    throw new Error(`[${res.status}] ${message}`);
  }

  return res.json();
}

async function platformRequest(path, options) {
  let url = `${PLATFORM_API}/${path}`;
  if (options?.query) {
    const params = new URLSearchParams(options.query);
    url += `?${params.toString()}`;
  }
  const res = await fetch(url, {
    method: options?.method || 'GET',
    headers: options?.body ? { 'Content-Type': 'application/json' } : undefined,
    body: options?.body ? JSON.stringify(options.body) : undefined,
  });

  if (!res.ok) {
    let message;
    try {
      const err = await res.json();
      message = err.message || err.statusMessage || res.statusText;
    } catch {
      message = res.statusText;
    }
    throw new Error(`[${res.status}] ${message}`);
  }

  return res.json();
}

function ok(data) {
  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
}

function err(message) {
  return {
    content: [{ type: 'text', text: `Error: ${message}` }],
    isError: true,
  };
}

// ── Entity type reference ───────────────────────────────────────────────────

const ENTITY_TYPES = [
  'task',
  'event',
  'trip',
  'payment',
  'appointment',
  'reminder',
  'deadline',
  'milestone',
  'note',
  'file',
  'page',
  'template',
  'slide_deck',
  'bookmark',
  'person',
  'contact',
  'organization',
  'vendor',
  'project',
  'folder',
  'collection',
  'goal',
];

// ── Entity type schema resource ─────────────────────────────────────────────

const ENTITY_SCHEMA = {
  classes: {
    temporal: {
      description: 'Has date/time span, lives on a calendar',
      types: [
        'task',
        'event',
        'trip',
        'payment',
        'appointment',
        'reminder',
        'deadline',
        'milestone',
      ],
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
    all: [
      'id',
      'type',
      'title',
      'description',
      'tags',
      'owner',
      'involved',
      'category',
      'references',
      'createdAt',
      'updatedAt',
    ],
    temporal: [
      'startDate',
      'endDate',
      'allDay',
      'startTime',
      'endTime',
      'priority',
      'urgency',
      'reminders',
      'recurrence',
    ],
    document: ['content', 'pinned', 'wordCount'],
    actor: ['email', 'phone', 'avatar', 'role', 'relationships'],
    container: ['children', 'progress', 'status', 'parentId'],
  },
  enums: {
    priority: ['critical', 'high', 'medium', 'low'],
    urgency: ['urgent', 'not-urgent'],
    taskStatus: [
      'pending',
      'in-progress',
      'on-track',
      'due-soon',
      'overdue',
      'completed',
    ],
    containerStatus: ['active', 'archived', 'completed', 'on-hold'],
  },
  relations: [
    'assignedTo',
    'belongsTo',
    'references',
    'dependsOn',
    'parentOf',
    'childOf',
  ],
};

// ── Tool definitions (JSON Schema) ──────────────────────────────────────────

const TOOLS = [
  {
    name: 'query_graph',
    description:
      'Execute an EQL-S query against the Trellis knowledge graph. Example: FIND entity AS ?t WHERE ?t.type = "task" AND ?t.priority = "high" RETURN ?t.title, ?t.startDate, ?t.taskStatus',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'EQL-S query string' },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_node',
    description:
      'Fetch a single entity by its ID, including its properties and links (outgoing/incoming references).',
    inputSchema: {
      type: 'object',
      properties: {
        entityId: {
          type: 'string',
          description: 'The entity ID to fetch (e.g. "task-1")',
        },
      },
      required: ['entityId'],
    },
  },
  {
    name: 'get_nodes',
    description: 'Batch fetch multiple entities by their IDs.',
    inputSchema: {
      type: 'object',
      properties: {
        ids: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of entity IDs',
        },
      },
      required: ['ids'],
    },
  },
  {
    name: 'create_node',
    description: `Create a new entity in the Trellis graph. Appears in the UI in realtime via SSE. Valid types: ${ENTITY_TYPES.join(', ')}`,
    inputSchema: {
      type: 'object',
      properties: {
        entityId: {
          type: 'string',
          description: 'Unique ID for the new entity (e.g. "task-abc123")',
        },
        type: {
          type: 'string',
          description: `Entity type`,
          enum: ENTITY_TYPES,
        },
        data: {
          type: 'object',
          description:
            'Entity properties (title, description, startDate, priority, etc.)',
        },
      },
      required: ['entityId', 'type'],
    },
  },
  {
    name: 'update_node',
    description:
      'Update an existing entity. Provide only the fields you want to change.',
    inputSchema: {
      type: 'object',
      properties: {
        entityId: { type: 'string', description: 'ID of the entity to update' },
        type: {
          type: 'string',
          description: 'Entity type (must match existing)',
        },
        data: {
          type: 'object',
          description: 'Properties to update (merged with existing)',
        },
      },
      required: ['entityId', 'type', 'data'],
    },
  },
  {
    name: 'delete_node',
    description: 'Delete an entity from the Trellis graph. Permanent.',
    inputSchema: {
      type: 'object',
      properties: {
        entityId: { type: 'string', description: 'ID of the entity to delete' },
      },
      required: ['entityId'],
    },
  },
  {
    name: 'link_nodes',
    description:
      'Create a semantic link between two entities (e.g. assignedTo, belongsTo, references, dependsOn).',
    inputSchema: {
      type: 'object',
      properties: {
        e1: { type: 'string', description: 'Source entity ID' },
        relation: {
          type: 'string',
          description:
            'Relation name (assignedTo, belongsTo, references, dependsOn, parentOf, childOf)',
        },
        e2: { type: 'string', description: 'Target entity ID' },
      },
      required: ['e1', 'relation', 'e2'],
    },
  },
  {
    name: 'get_graph_summary',
    description:
      'Get a compact graph overview in a single call — replaces graph_health + get_schema + get_catalog for agent orientation. Returns: health stats, entity type counts, ontology names by tier, top attributes, link relations, and recent mutations. Call this FIRST before any other operation to understand the current graph state.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Max items per section (default: 10)',
        },
      },
    },
  },
  {
    name: 'graph_health',
    description:
      'Check graph health — returns fact count, link count, and status.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'get_schema',
    description: 'Get registered ontologies (type schemas) from the graph.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'get_catalog',
    description:
      'Get the auto-generated EAV catalog showing all attributes and their value distributions.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'get_mutation_log',
    description:
      'Get the recent mutation log showing what changes have been made to the graph.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'get_ontology',
    description: 'Get a single ontology (type schema) by ID.',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Ontology ID (e.g. "trellis:schema/invoice")',
        },
      },
      required: ['id'],
    },
  },
  {
    name: 'create_ontology',
    description:
      'Create a new ontology (type schema). The new type will auto-appear in the Trellis UI sidebar. Fields use Notion-compatible value types: title, rich_text, number, select, multi_select, status, date, people, files, checkbox, url, email, phone_number, relation, rollup, formula.',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Ontology ID (e.g. "trellis:schema/invoice")',
        },
        version: {
          type: 'string',
          description: 'Schema version (default: "1.0.0")',
        },
        fields: {
          type: 'array',
          description:
            'Array of field definitions: { name, valueType, required?, description?, selectOptions? }',
          items: { type: 'object' },
        },
      },
      required: ['id', 'fields'],
    },
  },
  {
    name: 'update_ontology',
    description:
      'Update an existing ontology (full replace of fields and version).',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Ontology ID to update' },
        version: { type: 'string', description: 'New version string' },
        fields: {
          type: 'array',
          description: 'New field definitions (replaces all existing)',
          items: { type: 'object' },
        },
      },
      required: ['id', 'fields'],
    },
  },
  {
    name: 'delete_ontology',
    description:
      'Delete an ontology. Removes the type schema — existing entities of that type remain but the type disappears from the UI.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Ontology ID to delete' },
      },
      required: ['id'],
    },
  },

  // ── Phase 1: Workspace Context ──────────────────────────────────────────

  {
    name: 'list_orgs',
    description: 'List all organizations in the platform.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'create_org',
    description: 'Create a new organization (idempotent by slug).',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Organization name' },
        slug: {
          type: 'string',
          description: 'URL-safe slug (auto-generated from name if omitted)',
        },
        description: { type: 'string', description: 'Optional description' },
      },
      required: ['name'],
    },
  },
  {
    name: 'get_org',
    description: 'Get an organization by slug.',
    inputSchema: {
      type: 'object',
      properties: {
        slug: { type: 'string', description: 'Organization slug' },
      },
      required: ['slug'],
    },
  },
  {
    name: 'list_apps',
    description: 'List apps/worlds, optionally scoped to an organization.',
    inputSchema: {
      type: 'object',
      properties: {
        orgId: { type: 'string', description: 'Optional org ID to filter by' },
      },
    },
  },
  {
    name: 'create_app',
    description: 'Create a new app/world (idempotent by slug).',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'App name' },
        slug: { type: 'string', description: 'URL-safe slug' },
        orgId: { type: 'string', description: 'Parent organization ID' },
        icon: {
          type: 'string',
          description: 'Lucide icon name (e.g. "lucide:video")',
        },
        color: { type: 'string', description: 'Hex color (e.g. "#8b5cf6")' },
        ontologies: {
          type: 'array',
          items: { type: 'string' },
          description: 'Ontology IDs to enable',
        },
      },
      required: ['name'],
    },
  },
  {
    name: 'update_app',
    description: 'Update an existing app/world.',
    inputSchema: {
      type: 'object',
      properties: {
        slug: { type: 'string', description: 'App slug to update' },
        data: {
          type: 'object',
          description: 'Fields to update (name, icon, color, ontologies, etc.)',
        },
      },
      required: ['slug', 'data'],
    },
  },
  {
    name: 'delete_app',
    description: 'Delete an app/world.',
    inputSchema: {
      type: 'object',
      properties: {
        slug: { type: 'string', description: 'App slug to delete' },
      },
      required: ['slug'],
    },
  },
  {
    name: 'get_context',
    description: 'Get the current workspace context (active org + app).',
    inputSchema: {
      type: 'object',
      properties: {
        orgId: { type: 'string', description: 'Optional org ID' },
        appId: { type: 'string', description: 'Optional app ID' },
      },
    },
  },

  // ── Phase 2: Collections & Pages ────────────────────────────────────────

  {
    name: 'list_collections',
    description: 'List database collections, optionally scoped to an app.',
    inputSchema: {
      type: 'object',
      properties: {
        appId: { type: 'string', description: 'Optional app ID to filter by' },
      },
    },
  },
  {
    name: 'create_collection',
    description: 'Create a new database collection (idempotent by slug).',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Collection name' },
        slug: { type: 'string', description: 'URL-safe slug' },
        appId: { type: 'string', description: 'Parent app ID' },
        type: {
          type: 'string',
          description: 'Collection type (default: "database")',
        },
        schema: { type: 'object', description: 'Optional schema definition' },
      },
      required: ['name'],
    },
  },
  {
    name: 'update_collection',
    description: 'Update a collection.',
    inputSchema: {
      type: 'object',
      properties: {
        slug: { type: 'string', description: 'Collection slug' },
        data: { type: 'object', description: 'Fields to update' },
      },
      required: ['slug', 'data'],
    },
  },
  {
    name: 'delete_collection',
    description: 'Delete a collection.',
    inputSchema: {
      type: 'object',
      properties: { slug: { type: 'string', description: 'Collection slug' } },
      required: ['slug'],
    },
  },
  {
    name: 'list_pages',
    description: 'List custom dashboard pages, optionally scoped to an app.',
    inputSchema: {
      type: 'object',
      properties: {
        appId: { type: 'string', description: 'Optional app ID to filter by' },
      },
    },
  },
  {
    name: 'create_page',
    description: 'Create a custom dashboard page.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Page title' },
        appId: { type: 'string', description: 'Parent app ID' },
        dataSource: {
          type: 'string',
          description: 'Entity type slug for data source (e.g. "task")',
        },
        layout: {
          type: 'string',
          enum: ['grid', 'fullscreen'],
          description: 'Page layout mode',
        },
        defaultProjection: {
          type: 'string',
          description: 'Default view (table, kanban, calendar, etc.)',
        },
      },
      required: ['title'],
    },
  },
  {
    name: 'update_page',
    description: 'Update a page.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Page ID' },
        data: { type: 'object', description: 'Fields to update' },
      },
      required: ['id', 'data'],
    },
  },
  {
    name: 'delete_page',
    description: 'Delete a page.',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string', description: 'Page ID' } },
      required: ['id'],
    },
  },

  // ── Phase 3: Entity Enrichment ──────────────────────────────────────────

  {
    name: 'list_comments',
    description: 'List comments/activity on an entity.',
    inputSchema: {
      type: 'object',
      properties: {
        entityId: {
          type: 'string',
          description: 'Entity ID to list comments for',
        },
      },
      required: ['entityId'],
    },
  },
  {
    name: 'add_comment',
    description: 'Add a comment to an entity.',
    inputSchema: {
      type: 'object',
      properties: {
        entityId: { type: 'string', description: 'Entity ID to comment on' },
        content: { type: 'string', description: 'Comment text' },
        commentType: {
          type: 'string',
          enum: ['comment', 'status_change', 'attachment'],
          description: 'Comment type (default: comment)',
        },
      },
      required: ['entityId', 'content'],
    },
  },
  {
    name: 'list_tags',
    description: 'List all tags in the platform.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'create_tag',
    description: 'Create a tag (idempotent by name).',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Tag name' },
        color: {
          type: 'string',
          description: 'CSS color class (e.g. "bg-red-500")',
        },
      },
      required: ['name'],
    },
  },
  {
    name: 'assign_tags',
    description:
      "Assign one or more tags to an entity. Auto-creates tags that don't exist.",
    inputSchema: {
      type: 'object',
      properties: {
        entityId: { type: 'string', description: 'Entity ID to tag' },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Tag names to assign',
        },
      },
      required: ['entityId', 'tags'],
    },
  },

  // ── Phase 4: Bulk & Workflows ───────────────────────────────────────────

  {
    name: 'bulk_update',
    description: 'Batch update all entities matching an EQL-S query.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'EQL-S query to select entities',
        },
        data: {
          type: 'object',
          description: 'Fields to set on all matching entities',
        },
      },
      required: ['query', 'data'],
    },
  },
  {
    name: 'bulk_delete',
    description: 'Batch delete all entities matching an EQL-S query.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'EQL-S query to select entities for deletion',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'list_workflows',
    description: 'List agent workflow graphs, optionally scoped to an app.',
    inputSchema: {
      type: 'object',
      properties: {
        appId: { type: 'string', description: 'Optional app ID to filter by' },
      },
    },
  },
  {
    name: 'create_workflow',
    description: 'Create an agent workflow graph.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Workflow name' },
        appId: { type: 'string', description: 'Parent app ID' },
        trigger: {
          type: 'object',
          description:
            'Trigger configuration (e.g. {"type":"onCreate","entityType":"task"})',
        },
        graph: {
          type: 'object',
          description: 'Workflow graph definition (nodes + edges)',
        },
      },
      required: ['name'],
    },
  },
  {
    name: 'update_workflow',
    description: 'Update a workflow.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Workflow ID' },
        data: { type: 'object', description: 'Fields to update' },
      },
      required: ['id', 'data'],
    },
  },
  {
    name: 'delete_workflow',
    description: 'Delete a workflow.',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string', description: 'Workflow ID' } },
      required: ['id'],
    },
  },

  // ── Phase 5: Settings, Files & Invites ──────────────────────────────────

  {
    name: 'get_setting',
    description: 'Get a platform setting by key.',
    inputSchema: {
      type: 'object',
      properties: {
        key: { type: 'string', description: 'Setting key' },
        scope: {
          type: 'string',
          enum: ['app', 'user'],
          description: 'Setting scope (default: app)',
        },
      },
      required: ['key'],
    },
  },
  {
    name: 'set_setting',
    description: 'Set a platform setting value.',
    inputSchema: {
      type: 'object',
      properties: {
        key: { type: 'string', description: 'Setting key' },
        value: { description: 'Setting value (any JSON type)' },
        scope: {
          type: 'string',
          enum: ['app', 'user'],
          description: 'Setting scope (default: app)',
        },
      },
      required: ['key', 'value'],
    },
  },
  {
    name: 'list_settings',
    description: 'List all platform settings.',
    inputSchema: {
      type: 'object',
      properties: {
        scope: {
          type: 'string',
          enum: ['app', 'user'],
          description: 'Setting scope to list (default: app)',
        },
      },
    },
  },
  {
    name: 'send_invite',
    description: 'Send a workspace invitation email.',
    inputSchema: {
      type: 'object',
      properties: {
        email: { type: 'string', description: 'Email address to invite' },
        role: {
          type: 'string',
          enum: ['member', 'admin', 'guest'],
          description: 'Role to assign (default: member)',
        },
        orgId: { type: 'string', description: 'Organization ID' },
      },
      required: ['email'],
    },
  },
];

// ── Tool handlers ───────────────────────────────────────────────────────────

const HANDLERS = {
  async query_graph({ query }) {
    return ok(await request('query', { method: 'POST', body: { query } }));
  },

  async get_node({ entityId }) {
    return ok(await request(`node/${entityId}`));
  },

  async get_nodes({ ids }) {
    return ok(await request('nodes', { method: 'POST', body: { ids } }));
  },

  async create_node({ entityId, type, data }) {
    return ok(
      await request('mutate', {
        method: 'POST',
        body: {
          action: 'createNode',
          entityId,
          type,
          data: data || {},
          agentId: AGENT_ID,
        },
      }),
    );
  },

  async update_node({ entityId, type, data }) {
    return ok(
      await request('mutate', {
        method: 'POST',
        body: { action: 'updateNode', entityId, type, data, agentId: AGENT_ID },
      }),
    );
  },

  async delete_node({ entityId }) {
    return ok(
      await request('mutate', {
        method: 'POST',
        body: { action: 'deleteNode', entityId, agentId: AGENT_ID },
      }),
    );
  },

  async link_nodes({ e1, relation, e2 }) {
    return ok(
      await request('mutate', {
        method: 'POST',
        body: { action: 'link', e1, relation, e2, agentId: AGENT_ID },
      }),
    );
  },

  async get_graph_summary({ limit } = {}) {
    const path = limit ? `summary?limit=${limit}` : 'summary';
    return ok(await request(path));
  },

  async graph_health() {
    return ok(await request('health'));
  },

  async get_schema() {
    return ok(await request('ontologies'));
  },

  async get_catalog() {
    return ok(await request('catalog'));
  },

  async get_mutation_log() {
    return ok(await request('log'));
  },

  async get_ontology({ id }) {
    return ok(await request(`ontology/${id}`));
  },

  async create_ontology({ id, version, fields }) {
    const schema = {
      '@id': id,
      '@type': 'trellis:Schema',
      version: version || '1.0.0',
      fields,
    };
    return ok(
      await request('ontology', {
        method: 'POST',
        body: { schema, agentId: AGENT_ID },
      }),
    );
  },

  async update_ontology({ id, version, fields }) {
    const schema = {
      '@id': id,
      '@type': 'trellis:Schema',
      version: version || '1.0.0',
      fields,
    };
    return ok(
      await request(`ontology/${id}`, {
        method: 'PUT',
        body: { schema, agentId: AGENT_ID },
      }),
    );
  },

  async delete_ontology({ id }) {
    return ok(
      await request(`ontology/${id}`, {
        method: 'DELETE',
        body: { agentId: AGENT_ID },
      }),
    );
  },

  // ── Phase 1: Workspace Context ──────────────────────────────────────────

  async list_orgs() {
    return ok(await platformRequest('org/list'));
  },

  async create_org({ name, slug, description }) {
    return ok(
      await platformRequest('org/create', {
        method: 'POST',
        body: { name, slug, description, agentId: AGENT_ID },
      }),
    );
  },

  async get_org({ slug }) {
    return ok(await platformRequest(`org/${slug}`));
  },

  async list_apps({ orgId } = {}) {
    const query = orgId ? { orgId } : undefined;
    return ok(await platformRequest('app/list', { query }));
  },

  async create_app({ name, slug, orgId, icon, color, ontologies }) {
    return ok(
      await platformRequest('app/create', {
        method: 'POST',
        body: { name, slug, orgId, icon, color, ontologies, agentId: AGENT_ID },
      }),
    );
  },

  async update_app({ slug, data }) {
    return ok(
      await platformRequest(`app/${slug}`, {
        method: 'PUT',
        body: { data, agentId: AGENT_ID },
      }),
    );
  },

  async delete_app({ slug }) {
    return ok(
      await platformRequest(`app/${slug}`, {
        method: 'DELETE',
        body: { agentId: AGENT_ID },
      }),
    );
  },

  async get_context({ orgId, appId } = {}) {
    const query = {};
    if (orgId) query.orgId = orgId;
    if (appId) query.appId = appId;
    return ok(await platformRequest('context', { query }));
  },

  // ── Phase 2: Collections & Pages ────────────────────────────────────────

  async list_collections({ appId } = {}) {
    const query = appId ? { appId } : undefined;
    return ok(await platformRequest('collection/list', { query }));
  },

  async create_collection({ name, slug, appId, type, schema }) {
    return ok(
      await platformRequest('collection/create', {
        method: 'POST',
        body: { name, slug, appId, type, schema, agentId: AGENT_ID },
      }),
    );
  },

  async update_collection({ slug, data }) {
    return ok(
      await platformRequest(`collection/${slug}`, {
        method: 'PUT',
        body: { data, agentId: AGENT_ID },
      }),
    );
  },

  async delete_collection({ slug }) {
    return ok(
      await platformRequest(`collection/${slug}`, {
        method: 'DELETE',
        body: { agentId: AGENT_ID },
      }),
    );
  },

  async list_pages({ appId } = {}) {
    const query = appId ? { appId } : undefined;
    return ok(await platformRequest('page/list', { query }));
  },

  async create_page({ title, appId, dataSource, layout, defaultProjection }) {
    return ok(
      await platformRequest('page/create', {
        method: 'POST',
        body: {
          title,
          appId,
          dataSource,
          layout,
          defaultProjection,
          agentId: AGENT_ID,
        },
      }),
    );
  },

  async update_page({ id, data }) {
    return ok(
      await platformRequest(`page/${id}`, {
        method: 'PUT',
        body: { data, agentId: AGENT_ID },
      }),
    );
  },

  async delete_page({ id }) {
    return ok(
      await platformRequest(`page/${id}`, {
        method: 'DELETE',
        body: { agentId: AGENT_ID },
      }),
    );
  },

  // ── Phase 3: Entity Enrichment ──────────────────────────────────────────

  async list_comments({ entityId }) {
    return ok(await platformRequest(`comment/list/${entityId}`));
  },

  async add_comment({ entityId, content, commentType }) {
    return ok(
      await platformRequest('comment/add', {
        method: 'POST',
        body: { entityId, content, commentType, agentId: AGENT_ID },
      }),
    );
  },

  async list_tags() {
    return ok(await platformRequest('tag/list'));
  },

  async create_tag({ name, color }) {
    return ok(
      await platformRequest('tag/create', {
        method: 'POST',
        body: { name, color, agentId: AGENT_ID },
      }),
    );
  },

  async assign_tags({ entityId, tags }) {
    return ok(
      await platformRequest('tag/assign', {
        method: 'POST',
        body: { entityId, tags, agentId: AGENT_ID },
      }),
    );
  },

  // ── Phase 4: Bulk & Workflows ───────────────────────────────────────────

  async bulk_update({ query, data }) {
    return ok(
      await platformRequest('bulk/update', {
        method: 'POST',
        body: { query, data, agentId: AGENT_ID },
      }),
    );
  },

  async bulk_delete({ query }) {
    return ok(
      await platformRequest('bulk/delete', {
        method: 'POST',
        body: { query, agentId: AGENT_ID },
      }),
    );
  },

  async list_workflows({ appId } = {}) {
    const query = appId ? { appId } : undefined;
    return ok(await platformRequest('workflow/list', { query }));
  },

  async create_workflow({ name, appId, trigger, graph }) {
    return ok(
      await platformRequest('workflow/create', {
        method: 'POST',
        body: { name, appId, trigger, graph, agentId: AGENT_ID },
      }),
    );
  },

  async update_workflow({ id, data }) {
    return ok(
      await platformRequest(`workflow/${id}`, {
        method: 'PUT',
        body: { data, agentId: AGENT_ID },
      }),
    );
  },

  async delete_workflow({ id }) {
    return ok(
      await platformRequest(`workflow/${id}`, {
        method: 'DELETE',
        body: { agentId: AGENT_ID },
      }),
    );
  },

  // ── Phase 5: Settings & Invites ─────────────────────────────────────────

  async get_setting({ key, scope }) {
    const query = { key };
    if (scope) query.scope = scope;
    return ok(await platformRequest('setting/get', { query }));
  },

  async set_setting({ key, value, scope }) {
    return ok(
      await platformRequest('setting/set', {
        method: 'POST',
        body: { key, value, scope, agentId: AGENT_ID },
      }),
    );
  },

  async list_settings({ scope } = {}) {
    const query = scope ? { scope } : undefined;
    return ok(await platformRequest('setting/list', { query }));
  },

  async send_invite({ email, role, orgId }) {
    return ok(
      await platformRequest('invite/send', {
        method: 'POST',
        body: { email, role, orgId, agentId: AGENT_ID },
      }),
    );
  },
};

// ── MCP Server (low-level) ──────────────────────────────────────────────────

const server = new Server(
  { name: 'trellis-graph', version: '0.2.0' },
  { capabilities: { tools: {}, resources: {} } },
);

// List tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS };
});

// Call tool
server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args } = req.params;
  const handler = HANDLERS[name];
  if (!handler) {
    return err(`Unknown tool: ${name}`);
  }
  try {
    return await handler(args || {});
  } catch (e) {
    return err(e.message);
  }
});

// List resources
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: 'trellis://schema/entity-types',
        name: 'Entity Type Registry',
        description:
          'Complete entity type registry — classes, types, fields, and projections',
        mimeType: 'application/json',
      },
      {
        uri: 'trellis://context',
        name: 'Workspace Context',
        description: 'Current org and app context',
        mimeType: 'application/json',
      },
    ],
  };
});

// Read resource
server.setRequestHandler(ReadResourceRequestSchema, async (req) => {
  const { uri } = req.params;
  if (uri === 'trellis://schema/entity-types') {
    return {
      contents: [
        {
          uri,
          text: JSON.stringify(ENTITY_SCHEMA, null, 2),
          mimeType: 'application/json',
        },
      ],
    };
  }
  if (uri === 'trellis://context') {
    const ctx = await platformRequest('context').catch(() => ({ ok: false }));
    return {
      contents: [
        {
          uri,
          text: JSON.stringify(ctx, null, 2),
          mimeType: 'application/json',
        },
      ],
    };
  }
  throw new Error(`Unknown resource: ${uri}`);
});

// ── Start ───────────────────────────────────────────────────────────────────

const transport = new StdioServerTransport();
await server.connect(transport);
