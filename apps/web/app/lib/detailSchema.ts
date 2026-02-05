import type { DetailSchema, DetailField, FieldVariant, FieldOption } from '~/composables/useDetailDialog'
import type { EntityDetailVariant, EntityNode } from '~/composables/useGlobalDetailSheet'

/**
 * Maps ontology field types to DetailField variants
 * Reserved for future ontology-driven field resolution
 */
const _fieldTypeToVariant: Record<string, FieldVariant> = {
  text: 'text',
  string: 'text',
  textarea: 'textarea',
  longtext: 'textarea',
  number: 'number',
  integer: 'number',
  float: 'number',
  email: 'email',
  date: 'date',
  datetime: 'date',
  select: 'select',
  enum: 'select',
  multiselect: 'multiselect',
  checkbox: 'checkbox',
  boolean: 'checkbox',
  badge: 'badge',
  readonly: 'readonly',
}

/**
 * Common field aliases for extracting values from JSON-LD nodes
 */
const fieldAliases: Record<string, string[]> = {
  title: ['title', 'name', 'label', 'rdfs:label', 'schema:name'],
  description: ['description', 'content', 'body', 'rdfs:comment', 'schema:description'],
  status: ['status', 'state', 'taskStatus'],
  priority: ['priority', 'importance'],
  dueDate: ['dueDate', 'due', 'deadline', 'endDate'],
  startDate: ['startDate', 'start', 'dateCreated'],
  assignee: ['assignee', 'assignedTo', 'owner', 'responsible'],
  category: ['category', 'type', 'kind'],
  tags: ['tags', 'keywords', 'labels'],
  amount: ['amount', 'value', 'price', 'cost'],
  location: ['location', 'place', 'venue'],
}

/**
 * Status options with colors for select fields
 */
const statusOptions: FieldOption[] = [
  { value: 'pending', label: 'Pending', color: 'bg-slate-100 text-slate-700' },
  { value: 'in-progress', label: 'In Progress', color: 'bg-blue-100 text-blue-700' },
  { value: 'on-track', label: 'On Track', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'due-soon', label: 'Due Soon', color: 'bg-amber-100 text-amber-700' },
  { value: 'overdue', label: 'Overdue', color: 'bg-rose-100 text-rose-700' },
  { value: 'completed', label: 'Completed', color: 'bg-gray-100 text-gray-600' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-gray-100 text-gray-500' },
]

/**
 * Priority options with colors and icons
 */
const priorityOptions: FieldOption[] = [
  { value: 'low', label: 'Low', icon: 'lucide:arrow-down-circle', color: 'bg-blue-100 text-blue-700' },
  { value: 'medium', label: 'Medium', icon: 'lucide:minus-circle', color: 'bg-amber-100 text-amber-700' },
  { value: 'high', label: 'High', icon: 'lucide:alert-circle', color: 'bg-rose-100 text-rose-700' },
]

/**
 * Category options for tasks
 */
const categoryOptions: FieldOption[] = [
  { value: 'Air', label: 'Air', color: 'bg-sky-100 text-sky-700' },
  { value: 'Water', label: 'Water', color: 'bg-blue-100 text-blue-700' },
  { value: 'Waste', label: 'Waste', color: 'bg-amber-100 text-amber-700' },
  { value: 'SPCC', label: 'SPCC', color: 'bg-orange-100 text-orange-700' },
  { value: 'EPCRA', label: 'EPCRA', color: 'bg-purple-100 text-purple-700' },
  { value: 'Fire Safety', label: 'Fire Safety', color: 'bg-red-100 text-red-700' },
  { value: 'General Safety', label: 'General Safety', color: 'bg-teal-100 text-teal-700' },
  { value: 'Industrial Hygiene', label: 'Industrial Hygiene', color: 'bg-indigo-100 text-indigo-700' },
  { value: 'Machine Guarding', label: 'Machine Guarding', color: 'bg-slate-100 text-slate-700' },
  { value: 'Lockout/Tagout', label: 'Lockout/Tagout', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'Emergency Preparedness', label: 'Emergency Preparedness', color: 'bg-rose-100 text-rose-700' },
  { value: 'Respiratory Protection', label: 'Respiratory Protection', color: 'bg-cyan-100 text-cyan-700' },
  { value: 'Personal Protective Equipment', label: 'Personal Protective Equipment', color: 'bg-lime-100 text-lime-700' },
  { value: 'Vehicle Safety', label: 'Vehicle Safety', color: 'bg-zinc-100 text-zinc-700' },
  { value: 'Corp', label: 'Corp', color: 'bg-violet-100 text-violet-700' },
]

/**
 * Inspection type options
 */
const inspectionTypeOptions: FieldOption[] = [
  { value: 'Inspection', label: 'Inspection', icon: 'lucide:clipboard-check' },
  { value: 'Monitoring', label: 'Monitoring', icon: 'lucide:activity' },
  { value: 'Testing', label: 'Testing', icon: 'lucide:test-tube' },
  { value: 'Report', label: 'Report', icon: 'lucide:file-text' },
  { value: 'Training', label: 'Training', icon: 'lucide:graduation-cap' },
  { value: 'Calibration', label: 'Calibration', icon: 'lucide:settings' },
  { value: 'Certification', label: 'Certification', icon: 'lucide:award' },
  { value: 'Equipment Inspection', label: 'Equipment Inspection', icon: 'lucide:wrench' },
  { value: 'Other', label: 'Other', icon: 'lucide:more-horizontal' },
]

/**
 * Branch options
 */
const branchOptions: FieldOption[] = [
  { value: 'environmental', label: 'Environmental (ENV)', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'safety', label: 'Safety (SAF)', color: 'bg-amber-100 text-amber-700' },
]

/**
 * Default field definitions by entity type
 */
const entityFieldDefaults: Record<EntityDetailVariant, DetailField<any>[]> = {
  task: [
    { key: 'title', label: 'Title', variant: 'text', required: true, icon: 'lucide:type', colSpan: 2 },
    { key: 'description', label: 'Description', variant: 'textarea', icon: 'lucide:align-left', colSpan: 2 },
    {
      key: 'status',
      label: 'Status',
      variant: 'select',
      icon: 'lucide:circle-dot',
      options: statusOptions,
      badgeColor: (val) => statusOptions.find((o) => o.value === val)?.color || 'bg-muted text-muted-foreground',
    },
    { key: 'priority', label: 'Priority', variant: 'select', icon: 'lucide:flag', options: priorityOptions },
    { key: 'dueDate', label: 'Due Date', variant: 'date', icon: 'lucide:calendar' },
    { key: 'dueAtTime', label: 'Due Time', variant: 'text', icon: 'lucide:clock', placeholder: 'HH:MM (optional)' },
    {
      key: 'category',
      label: 'Category',
      variant: 'select',
      icon: 'lucide:tag',
      options: categoryOptions,
      badgeColor: (val) => categoryOptions.find((o) => o.value === val)?.color || 'bg-muted text-muted-foreground',
    },
    {
      key: 'inspectionType',
      label: 'Inspection Type',
      variant: 'select',
      icon: 'lucide:clipboard-list',
      options: inspectionTypeOptions,
    },
    {
      key: 'branches',
      label: 'Branches',
      variant: 'multiselect',
      icon: 'lucide:git-branch',
      options: branchOptions,
      description: 'Environmental and/or Safety branches',
    },
    { key: 'owner', label: 'Owner', variant: 'text', icon: 'lucide:user', placeholder: 'User ID or role' },
    {
      key: 'involved',
      label: 'Involved Users',
      variant: 'text',
      icon: 'lucide:users',
      placeholder: 'Comma-separated user IDs',
      description: 'Users who should be notified about this task',
    },
    {
      key: 'tracked',
      label: 'Tracked',
      variant: 'checkbox',
      icon: 'lucide:eye',
      description: 'Track this task for additional visibility',
    },
    {
      key: 'taskNeedsCorrectiveAction',
      label: 'Needs Corrective Action',
      variant: 'checkbox',
      icon: 'lucide:alert-triangle',
      description: 'Mark if this task requires corrective action',
    },
    {
      key: 'notes',
      label: 'Notes',
      variant: 'textarea',
      icon: 'lucide:sticky-note',
      colSpan: 2,
      placeholder: 'Add notes, reminders, or additional context...',
    },
  ],
  event: [
    { key: 'title', label: 'Event Name', variant: 'text', required: true, icon: 'lucide:calendar-days', colSpan: 2 },
    { key: 'description', label: 'Description', variant: 'textarea', icon: 'lucide:align-left', colSpan: 2 },
    { key: 'startDate', label: 'Start Date', variant: 'date', icon: 'lucide:calendar' },
    { key: 'endDate', label: 'End Date', variant: 'date', icon: 'lucide:calendar-check' },
    { key: 'location', label: 'Location', variant: 'text', icon: 'lucide:map-pin' },
    { key: 'assignee', label: 'Organizer', variant: 'text', icon: 'lucide:user' },
  ],
  payment: [
    { key: 'title', label: 'Payment Description', variant: 'text', required: true, icon: 'lucide:receipt', colSpan: 2 },
    { key: 'amount', label: 'Amount', variant: 'number', icon: 'lucide:dollar-sign' },
    { key: 'dueDate', label: 'Due Date', variant: 'date', icon: 'lucide:calendar' },
    {
      key: 'status',
      label: 'Status',
      variant: 'select',
      icon: 'lucide:circle-dot',
      options: [
        { value: 'pending', label: 'Pending', color: 'bg-amber-100 text-amber-700' },
        { value: 'paid', label: 'Paid', color: 'bg-emerald-100 text-emerald-700' },
        { value: 'overdue', label: 'Overdue', color: 'bg-rose-100 text-rose-700' },
      ],
    },
  ],
  deadline: [
    { key: 'title', label: 'Deadline', variant: 'text', required: true, icon: 'lucide:alarm-clock', colSpan: 2 },
    { key: 'description', label: 'Description', variant: 'textarea', icon: 'lucide:align-left', colSpan: 2 },
    { key: 'dueDate', label: 'Due Date', variant: 'date', required: true, icon: 'lucide:calendar' },
    { key: 'priority', label: 'Priority', variant: 'select', icon: 'lucide:flag', options: priorityOptions },
  ],
  reminder: [
    { key: 'title', label: 'Reminder', variant: 'text', required: true, icon: 'lucide:bell', colSpan: 2 },
    { key: 'description', label: 'Notes', variant: 'textarea', icon: 'lucide:align-left', colSpan: 2 },
    { key: 'reminderDate', label: 'Remind At', variant: 'date', required: true, icon: 'lucide:clock' },
  ],
  permit: [
    { key: 'title', label: 'Permit Name', variant: 'text', required: true, icon: 'lucide:file-badge', colSpan: 2 },
    { key: 'description', label: 'Description', variant: 'textarea', icon: 'lucide:align-left', colSpan: 2 },
    { key: 'permitNumber', label: 'Permit Number', variant: 'text', icon: 'lucide:hash' },
    { key: 'status', label: 'Status', variant: 'select', icon: 'lucide:circle-dot', options: statusOptions },
    { key: 'expirationDate', label: 'Expiration Date', variant: 'date', icon: 'lucide:calendar' },
    { key: 'assignee', label: 'Responsible Party', variant: 'text', icon: 'lucide:user' },
  ],
  folder: [
    { key: 'title', label: 'Folder Name', variant: 'text', required: true, icon: 'lucide:folder', colSpan: 2 },
    { key: 'description', label: 'Description', variant: 'textarea', icon: 'lucide:align-left', colSpan: 2 },
  ],
  document: [
    { key: 'title', label: 'Document Name', variant: 'text', required: true, icon: 'lucide:file-text', colSpan: 2 },
    { key: 'description', label: 'Description', variant: 'textarea', icon: 'lucide:align-left', colSpan: 2 },
    { key: 'fileType', label: 'File Type', variant: 'readonly', icon: 'lucide:file' },
    { key: 'createdAt', label: 'Created', variant: 'readonly', icon: 'lucide:clock' },
  ],
  default: [
    { key: 'title', label: 'Title', variant: 'text', icon: 'lucide:type', colSpan: 2 },
    { key: 'description', label: 'Description', variant: 'textarea', icon: 'lucide:align-left', colSpan: 2 },
  ],
}

/**
 * Entity type configuration for schema generation
 */
const entityConfig: Record<EntityDetailVariant, { title: string; icon: string; description?: string }> = {
  task: { title: 'Task', icon: 'lucide:check-square', description: 'Task details and status' },
  event: { title: 'Event', icon: 'lucide:calendar-days', description: 'Event information' },
  payment: { title: 'Payment', icon: 'lucide:credit-card', description: 'Payment details' },
  deadline: { title: 'Deadline', icon: 'lucide:alarm-clock', description: 'Deadline information' },
  reminder: { title: 'Reminder', icon: 'lucide:bell', description: 'Reminder details' },
  permit: { title: 'Permit', icon: 'lucide:file-badge', description: 'Permit information' },
  folder: { title: 'Folder', icon: 'lucide:folder', description: 'Folder details' },
  document: { title: 'Document', icon: 'lucide:file-text', description: 'Document information' },
  default: { title: 'Item', icon: 'lucide:box', description: 'Item details' },
}

/**
 * Extract a value from a node using field aliases
 */
export function extractNodeValue(node: EntityNode, key: string): any {
  // Direct key access
  if (node[key] !== undefined) return unwrapLdValue(node[key])

  // Try aliases
  const aliases = fieldAliases[key]
  if (aliases) {
    for (const alias of aliases) {
      if (node[alias] !== undefined) return unwrapLdValue(node[alias])
    }
  }

  return undefined
}

/**
 * Unwrap JSON-LD value wrappers
 */
function unwrapLdValue(value: any): any {
  if (Array.isArray(value)) return value.map(unwrapLdValue)
  if (value && typeof value === 'object') {
    if ('@value' in value) return unwrapLdValue(value['@value'])
    if ('value' in value && Object.keys(value).length === 1) return unwrapLdValue(value.value)
  }
  return value
}

/**
 * Get the display title for a node
 */
export function getNodeTitle(node: EntityNode): string {
  return extractNodeValue(node, 'title') || extractNodeValue(node, 'name') || node['@id'] || 'Untitled'
}

/**
 * Generate a DetailSchema for an entity type
 */
export function getSchemaForEntityType(
  entityType: EntityDetailVariant,
  options?: {
    onSave?: (item: any, mode: any) => Promise<void> | void
    onDelete?: (item: any) => Promise<void> | void
    customFields?: DetailField<any>[]
  },
): DetailSchema<any> {
  const config = entityConfig[entityType] || entityConfig.default
  const fields = options?.customFields || entityFieldDefaults[entityType] || entityFieldDefaults.default

  return {
    title: (item, mode) => {
      if (mode === 'create') return `New ${config.title}`
      if (mode === 'edit') return `Edit ${config.title}`
      return item ? getNodeTitle(item) : config.title
    },
    description: config.description,
    icon: config.icon,
    fields,
    onSave: options?.onSave,
    onDelete: options?.onDelete,
  }
}

/**
 * Dynamically derive fields from a JSON-LD node's properties
 */
export function deriveFieldsFromNode(node: EntityNode, entityType: EntityDetailVariant): DetailField<any>[] {
  // Start with default fields for the entity type
  const baseFields = [...(entityFieldDefaults[entityType] || entityFieldDefaults.default)]
  const existingKeys = new Set(baseFields.map((f) => f.key))

  // Reserved/internal keys to skip
  const skipKeys = new Set(['@id', '@type', '@context', 'id', 'type', '_originalIndex'])

  // Add additional fields from the node
  Object.keys(node).forEach((key) => {
    if (skipKeys.has(key) || existingKeys.has(key)) return

    const value = node[key]
    let variant: FieldVariant = 'text'

    // Infer variant from value type
    if (typeof value === 'boolean') {
      variant = 'checkbox'
    } else if (typeof value === 'number') {
      variant = 'number'
    } else if (Array.isArray(value)) {
      variant = 'multiselect'
    } else if (typeof value === 'string') {
      if (value.length > 100) variant = 'textarea'
      if (/^\d{4}-\d{2}-\d{2}/.test(value)) variant = 'date'
    }

    baseFields.push({
      key,
      label: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1'),
      variant,
    })
  })

  return baseFields
}
