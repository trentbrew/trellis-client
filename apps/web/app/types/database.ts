export interface Organization {
  id: string
  ownerId: string // User ID of workspace owner
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
  role: 'owner' | 'admin' | 'member' | 'guest'
  invitedAt: number
  joinedAt?: number
  status: 'pending' | 'active' | 'suspended'
}

export type WorldAccessLevel = 'open' | 'closed' | 'private'

export interface Application {
  id: string
  orgId: string
  name: string
  slug: string
  icon: string
  color: string
  description?: string
  isPublic?: boolean // Whether the app/workspace is publicly accessible
  accessLevel?: WorldAccessLevel // 'open' (default) | 'closed' | 'private'
  ontologies?: string[] // Imported vertical ontologies (e.g., ['crm'])
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

export type NotificationType =
  | 'invite_accepted'
  | 'invite_sent'
  | 'member_joined'
  | 'member_removed'
  | 'role_changed'
  | 'mention'
  | 'comment'
  | 'entity_updated'
  | 'new_message'
  | 'workflow_completed'
  | 'workflow_failed'
  | 'trigger_fired'
  | 'system'

export type NotificationVariant = 'default' | 'success' | 'warning' | 'destructive' | 'info'

export interface Notification {
  id: string
  recipientId: string
  orgId: string
  orgName?: string
  type: NotificationType
  title: string
  message: string
  actionUrl?: string
  icon?: string
  variant?: NotificationVariant
  isRead: boolean
  actorId?: string
  actorName?: string
  metadata?: Record<string, any>
  createdAt: number
}

export type SharePermission = 'view' | 'comment' | 'edit'

export interface Share {
  id: string
  entityId: string
  entityType: 'entity' | 'collection'
  userId: string
  orgId: string
  permission: SharePermission
  sharedBy: string
  sharedByName?: string
  createdAt: number
}

// ── Brand Engine ────────────────────────────────────────────────────────

export interface BrandLogoConfig {
  mark?: string // URL — square icon/mark (replaces AppLogo SVG)
  wordmark?: string // URL — horizontal logo with text
  favicon?: string // URL — browser tab icon
  darkVariants?: {
    mark?: string
    wordmark?: string
  }
}

export interface BrandIdentity {
  name: string // Display brand name (may differ from Application.name)
  tagline?: string
  description?: string
  mission?: string
  vision?: string
  values?: string[]
}

export interface BrandVoice {
  tone?: string // e.g. "professional", "friendly", "technical"
  personality?: string[] // Adjectives: ["warm", "direct", "knowledgeable"]
  doVoice?: string[] // Writing guidelines — DO
  dontVoice?: string[] // Writing guidelines — DON'T
  audienceDescription?: string
}

export interface BrandLinks {
  website?: string
  email?: string
  social?: { platform: string; url: string }[]
}

export interface BrandConfig {
  logo: BrandLogoConfig
  theme: {
    presetId?: string // Built-in or custom ThemePresetId bound to this world
  }
  identity: BrandIdentity
  voice: BrandVoice
  links: BrandLinks
  updatedAt: number
  updatedBy?: string
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

export type WorkflowNodeKind =
  | 'start'
  | 'agent'
  | 'tool'
  | 'router'
  | 'guard'
  | 'memory-read'
  | 'memory-write'
  | 'end'
  | 'note'

export interface WorkflowNodeDef {
  id: string
  kind: WorkflowNodeKind
  position: { x: number; y: number }
  label: string
  data?: Record<string, unknown>
}

export interface WorkflowEdgeDef {
  id: string
  source: string
  target: string
  sourceHandle?: string
  targetHandle?: string
  label?: string
  condition?: string
}

export interface WorkflowGraph {
  nodes: WorkflowNodeDef[]
  edges: WorkflowEdgeDef[]
  viewport?: { x: number; y: number; zoom: number }
}

export type WorkflowTrigger = 'manual' | 'schedule' | 'webhook' | 'event'

export interface Workflow {
  id: string
  appId: string
  name: string
  description?: string
  icon?: string
  trigger?: WorkflowTrigger
  active: boolean
  graph?: WorkflowGraph
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
  | 'chart'
  | 'slide-deck'
  | 'canvas'
  | 'moodboard'
  | 'form'
  | 'entity-detail'

export type ChartType =
  | 'bar'
  | 'line'
  | 'area'
  | 'pie'
  | 'donut'
  | 'radialBar'
  | 'scatter'
  | 'radar'
  | 'heatmap'
  | 'treemap'

export type AggregationFn = 'count' | 'sum' | 'avg' | 'min' | 'max'

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
  contextMenu?: import('~/types/contextMenu').ContextMenuConfig
}

export interface ProjectionConfig {
  // Common config
  groupBy?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'

  // Card-grid specific
  cardTemplate?: string // Handlebars-like template
  /** Ordered ontology/builtin keys shown on card faces */
  cardProperties?: string[]
  /** Show placeholder text for empty card properties */
  cardShowEmpty?: boolean
  /** P2: unified view field config (table + card visibility) */
  viewFields?: { key: string; showInCard?: boolean; showInTable?: boolean; order?: number }[]
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

  // Chart specific
  chartType?: ChartType
  dimension?: string // field mapped to x-axis or segments
  measure?: string // field mapped to y-axis or values
  aggregation?: AggregationFn
  colorField?: string // field to derive colors from
  stacked?: boolean
  showLegend?: boolean
  showLabels?: boolean
  sparkline?: boolean // minimal chart without axes (for dashboard widgets)

  // Slide-deck specific
  slideTheme?: 'dark' | 'light' | 'auto'
  slideTransition?: 'fade' | 'slide' | 'none'
  slideOrderField?: string // field used to sort slides (default: 'order')

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

// ============================================================================
// Chat
// ============================================================================

export type ChannelType = 'public' | 'private' | 'dm' | 'thread'
export type ChatNotificationLevel = 'all' | 'mentions' | 'none'

export interface Channel {
  id: string
  orgId: string
  type: ChannelType
  title: string
  slug?: string
  description?: string
  icon?: string
  folder?: string
  memberIds?: string[]
  entityId?: string
  lastMessageAt?: number
  createdBy: string
  createdAt: number
}

export interface EntityRef {
  id: string
  type: string
  title: string
  icon?: string
}

export interface Message {
  id: string
  channelId: string
  authorId: string
  authorName: string
  authorAvatar?: string
  content: string
  replyToId?: string
  reactions?: Record<string, string[]>
  entityRefs?: EntityRef[]
  edited?: boolean
  editedAt?: number
  deletedAt?: number
  createdAt: number
}

export interface ChatNotificationPref {
  id: string
  userId: string
  channelId?: string
  level: ChatNotificationLevel
  soundEnabled?: boolean
  desktopEnabled?: boolean
}

// ============================================================================
// Integrations
// ============================================================================

export type IntegrationCategory = 'data' | 'auth' | 'communication' | 'storage' | 'automation' | 'analytics'
export type IntegrationAuthType = 'oauth' | 'api_key' | 'webhook' | 'none'
export type IntegrationSyncDirection = 'import' | 'export' | 'bidirectional'
export type IntegrationDefinitionStatus = 'available' | 'beta' | 'deprecated'
export type IntegrationConnectionStatus = 'connected' | 'error' | 'configuring' | 'disconnected'

export interface IntegrationDefinition {
  id: string
  title: string
  description?: string
  provider: string
  category: IntegrationCategory
  authType: IntegrationAuthType
  icon?: string
  color?: string
  features?: string[]
  docsUrl?: string
  webhookSupport?: boolean
  pushNotificationSupport?: boolean
  enrichmentSupport?: boolean
  syncDirection?: IntegrationSyncDirection
  requiredScopes?: string[]
  configSchema?: string
  integrationStatus?: IntegrationDefinitionStatus
}

export interface IntegrationConnection {
  id: string
  title: string
  integrationId: string
  userId: string
  connectionStatus: IntegrationConnectionStatus
  connectedAt?: string
  lastSyncAt?: string
  syncEnabled?: boolean
  syncIntervalMs?: number
  accountEmail?: string
  accountName?: string
  config?: string
  credentialsRef?: string
  watchChannelId?: string
  watchExpiration?: string
  errorMessage?: string
  syncedEntityCount?: number
}
