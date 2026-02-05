import { TRELLIS_SCHEMA_VERSION, type TrellisDocument, type TrellisContext } from './schema'

export interface ScaffoldOptions {
  userNamespace?: string
  includeSystemImports?: boolean
  includeDesignImports?: boolean
}

/**
 * Create the default Trellis context
 */
export function createDefaultContext(userNamespace?: string): TrellisContext {
  return {
    '@vocab': 'https://schema.org/',
    trellis: 'tag:trellis.app,2025:',
    schema: 'https://schema.org/',
    rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
    rdfs: 'http://www.w3.org/2000/01/rdf-schema#',
    design: 'tag:trellis.app,2025:design/',
    icons: 'tag:trellis.app,2025:icons/',
    user: 'tag:trellis.app,2025:user/',
    system: 'tag:trellis.app,2025:system/',
    '': userNamespace || 'tag:user:default,2025:',
  }
}

/**
 * Create a blank Trellis graph
 */
export function createBlankGraph(options?: ScaffoldOptions): TrellisDocument {
  const now = new Date().toISOString()
  const userNs = options?.userNamespace || 'tag:user:default,2025:'

  const graph: TrellisDocument = {
    $schema: `https://trellis.app/schemas/graph/v${TRELLIS_SCHEMA_VERSION}.json`,
    '@context': createDefaultContext(userNs),

    version: TRELLIS_SCHEMA_VERSION,
    created: now,
    modified: now,

    imports: [],

    graph: {
      ontologies: {},
      nodes: [],
      edges: [],
      projections: {},
      workflows: {},
    },
  }

  if (options?.includeSystemImports) {
    graph.imports = [
      {
        '@id': 'trellis-core',
        path: 'app://system/core.trellis',
        version: '2.0',
      },
    ]
  }

  if (options?.includeDesignImports) {
    graph.imports = [
      ...(graph.imports || []),
      {
        '@id': 'design-tokens',
        path: 'system/design-tokens.trellis',
        version: '1.0',
      },
      {
        '@id': 'icon-registry',
        path: 'system/icon-registry.trellis',
        version: '1.0',
      },
    ]
  }

  return graph
}

/**
 * Create an example Trellis graph with sample data
 */
export function createExampleGraph(): TrellisDocument {
  const graph = createBlankGraph({ includeSystemImports: true })
  const now = new Date().toISOString()

  graph.graph.ontologies = {
    'task-schema': {
      '@id': 'schema/task',
      '@type': 'trellis:Ontology',
      name: 'Task',
      description: 'A task or to-do item',
      icon: 'lucide:check-square',
      fields: [
        { name: 'title', valueType: 'text', required: true },
        {
          name: 'status',
          valueType: 'select',
          required: true,
          selectOptions: [
            { name: 'todo', color: 'gray' },
            { name: 'in-progress', color: 'blue' },
            { name: 'done', color: 'green' },
          ],
        },
        { name: 'priority', valueType: 'number' },
        { name: 'dueDate', valueType: 'date' },
        { name: 'assignee', valueType: 'relation' },
      ],
    },
    'person-schema': {
      '@id': 'schema/person',
      '@type': 'trellis:Ontology',
      name: 'Person',
      description: 'A person or team member',
      icon: 'lucide:user',
      fields: [
        { name: 'name', valueType: 'text', required: true },
        { name: 'email', valueType: 'email' },
        { name: 'avatar', valueType: 'url' },
      ],
    },
  }

  graph.graph.nodes = [
    {
      '@id': 'person:001',
      '@type': 'Person',
      name: 'Alice',
      description: 'Team lead',
      'trellis:metadata': {
        createdTime: now,
        createdBy: { '@id': 'system:scaffold' },
        lastEditedTime: now,
        lastEditedBy: { '@id': 'system:scaffold' },
        icon: '👩‍💻',
      },
    },
    {
      '@id': 'task:001',
      '@type': 'Task',
      name: 'Example Task',
      description: 'This is an example task created by the scaffold',
      'user:status': 'todo',
      'user:priority': 1,
      'user:assignee': { '@id': 'person:001' },
      'trellis:metadata': {
        createdTime: now,
        createdBy: { '@id': 'system:scaffold' },
        lastEditedTime: now,
        lastEditedBy: { '@id': 'system:scaffold' },
        icon: '✅',
      },
    },
  ]

  graph.graph.edges = [
    {
      '@id': 'edge:001',
      source: 'task:001',
      target: 'person:001',
      relation: 'assignedTo',
    },
  ]

  graph.graph.projections = {
    'tasks-kanban': {
      '@id': 'projection/tasks-kanban',
      '@type': 'trellis:Projection',
      name: 'Tasks Kanban',
      component: 'Kanban.vue',
      query: {
        nodeType: 'Task',
        sort: [{ field: 'priority', direction: 'desc' }],
      },
      config: {
        groupBy: 'status',
        swimlanes: ['todo', 'in-progress', 'done'],
      },
      isDefault: true,
      order: 0,
    },
    'tasks-table': {
      '@id': 'projection/tasks-table',
      '@type': 'trellis:Projection',
      name: 'Tasks Table',
      component: 'Table.vue',
      query: {
        nodeType: 'Task',
      },
      config: {},
      order: 1,
    },
  }

  return graph
}

/**
 * Create a collection-specific graph
 */
export function createCollectionGraph(options: {
  collectionId: string
  collectionName: string
  collectionDescription?: string
  schemaFields?: Array<{ name: string; valueType: string }>
}): TrellisDocument {
  const graph = createBlankGraph()
  const now = new Date().toISOString()

  const collectionIri = `trellis:collection/${options.collectionId}`

  graph.graph.nodes = [
    {
      '@id': collectionIri,
      '@type': 'trellis:Collection',
      name: options.collectionName,
      description: options.collectionDescription || '',
      'trellis:metadata': {
        createdTime: now,
        createdBy: { '@id': 'system:ui' },
        lastEditedTime: now,
        lastEditedBy: { '@id': 'system:ui' },
      },
    },
  ]

  if (options.schemaFields?.length) {
    graph.graph.ontologies[`${options.collectionId}-schema`] = {
      '@id': `schema/${options.collectionId}`,
      '@type': 'trellis:Ontology',
      name: `${options.collectionName} Schema`,
      fields: options.schemaFields.map((f) => ({
        name: f.name,
        valueType: f.valueType as any,
      })),
    }
  }

  return graph
}

/**
 * Serialize a Trellis document to JSON string
 */
export function serializeTrellisDocument(doc: TrellisDocument, pretty = true): string {
  return JSON.stringify(doc, null, pretty ? 2 : undefined)
}

/**
 * Parse a Trellis document from JSON string
 */
export function parseTrellisDocument(json: string): unknown {
  return JSON.parse(json)
}
