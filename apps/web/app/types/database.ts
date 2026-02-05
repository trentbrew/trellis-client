export interface Organization {
  id: string
  name: string
  slug: string
  avatar?: string
  plan: 'free' | 'pro' | 'enterprise'
  createdAt: number
  updatedAt: number
}

export interface Member {
  id: string
  orgId: string
  userId: string
  email: string
  name: string
  avatar?: string
  role: 'owner' | 'admin' | 'member' | 'viewer'
  invitedAt: number
  joinedAt?: number
  status: 'pending' | 'active' | 'suspended'
}

export interface Application {
  id: string
  orgId: string
  name: string
  slug: string
  icon: string
  color: string
  description?: string
  ontologies?: string[] // Imported vertical ontologies (e.g., ['ecms', 'crm'])
  createdAt: number
  updatedAt: number
}

export interface Collection {
  id: string
  appId: string
  parentId?: string
  title: string
  icon: string
  slug: string
  description?: string
  type: 'database' | 'document' | 'board' | 'calendar' | 'gallery' | 'form' | 'page' | 'list'
  order: number
  isPublished: boolean
  createdBy: string
  createdAt: number
  updatedAt: number

  // Content (plain text/rich text)
  content?: string // HTML content from Tiptap editor

  // JSON-LD semantic layer (optional)
  context?: string | object // @context URL or inline definition
  ldType?: string // JSON-LD @type (e.g., 'schema:Dataset', 'dcat:Catalog')
}

export interface DatabaseSchema {
  id: string
  collectionId: string
  fields: DatabaseField[]
  views: DatabaseView[]
  projections?: Projection[] // How to render this collection's data
  createdAt: number
  updatedAt: number
}

export interface DatabaseField {
  id: string
  name: string
  type:
    | 'text'
    | 'number'
    | 'select'
    | 'multiselect'
    | 'date'
    | 'checkbox'
    | 'url'
    | 'email'
    | 'file'
    | 'relation'
    | 'formula'
  options?: { value: string; color: string }[]
  config?: Record<string, any>
  required: boolean
  order: number
  isDefault?: boolean

  // Formula field support
  formula?: string // Expression to evaluate (e.g., "categories.reduce((sum, c) => sum + c.budgeted, 0)")
  formulaReturnType?: 'text' | 'number' | 'boolean' | 'date' // Expected result type
}

export type TypeFieldType = DatabaseField['type']

export interface TypeField {
  id: string
  name: string
  type: TypeFieldType
  required: boolean
  order: number
  config?: Record<string, any>
}

export interface DatabaseView {
  id: string
  name: string
  type: 'table' | 'board' | 'calendar' | 'gallery' | 'list'
  filters: string[]
  sorts: string[]
  groupBy?: string
  isDefault: boolean
}

export interface DatabaseRecord {
  id: string
  collectionId: string
  fields: Record<string, any>
  tags?: string[] // Tag IDs for grouping/filtering
  createdBy: string
  createdAt: number
  updatedAt: number
}

/**
 * Tag - Generic grouping mechanism (alternative to hierarchical folders)
 * Tags are flat, flexible, and can be applied to any entity type.
 */
export interface Tag {
  id: string
  appId: string
  name: string
  slug: string
  color?: string // Tailwind color class or hex
  icon?: string // Lucide icon name
  description?: string
  parentId?: string // Optional: for hierarchical tag trees
  order: number
  createdAt: number
  updatedAt: number
}

export interface Settings {
  id: string
  entityType: 'org' | 'app' | 'user'
  entityId: string
  key: string
  value: any
  updatedAt: number
}

export interface Notification {
  id: string
  userId: string
  orgId: string
  appId?: string
  type: 'invite' | 'mention' | 'update' | 'system'
  title: string
  message: string
  actionUrl?: string
  isRead: boolean
  createdAt: number
}

export interface CustomType {
  id: string
  appId: string
  name: string
  description?: string
  icon?: string
  extends?: string
  fields?: TypeField[]
  createdAt: number
  updatedAt: number
}

export interface Workflow {
  id: string
  appId: string
  name: string
  description?: string
  icon?: string
  trigger?: string
  active: boolean
  createdAt: number
  updatedAt: number
}

export type ProjectionType =
  | 'trellis-blocks'
  | 'table'
  | 'kanban'
  | 'calendar'
  | 'graph'
  | 'list'
  | 'spreadsheet'
  | 'blocks'
  | 'code'
  | 'card-grid'
  | 'sankey'
  | 'timeline'
  | 'dashboard'

export interface ProjectionSchemaRequirements {
  fieldTypes?: Array<DatabaseField['type']>
}

export interface ProjectionRequirements {
  schema?: ProjectionSchemaRequirements
}

export interface Projection {
  id: string
  type: ProjectionType
  name: string
  icon?: string // Icon name for the tab (e.g., 'lucide:table')
  config: ProjectionConfig
  query?: QueryConfig // Semantic query filters (datalog/SPARQL-like)
  requirements?: ProjectionRequirements
  isDefault?: boolean
  order?: number
}

export interface ProjectionConfig {
  // Common config
  groupBy?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'

  // Card-grid specific
  cardTemplate?: string // Handlebars-like template
  columns?: number
  spacing?: 'compact' | 'comfortable' | 'spacious'

  // Sankey specific
  sourceField?: string
  targetField?: string
  valueField?: string
  colorScheme?: string

  // Graph specific
  nodeFields?: string[]
  edgeFields?: string[]
  layout?: 'force' | 'hierarchical' | 'circular' | 'radial'
  nodeSize?: number
  edgeThickness?: number

  // Timeline specific
  dateField?: string
  endDateField?: string
  labelField?: string

  // Extensible for custom projection types
  [key: string]: any
}

export interface QueryConfig {
  // Semantic query language (simplified datalog/SPARQL)
  where?: QueryCondition[]
  orderBy?: { field: string; direction: 'asc' | 'desc' }[]
  limit?: number
  offset?: number
  // Future: joins, aggregations, graph traversals
}

export interface QueryCondition {
  field: string
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'contains' | 'startsWith' | 'endsWith'
  value: any
  type?: 'and' | 'or' // How to combine with next condition
}
