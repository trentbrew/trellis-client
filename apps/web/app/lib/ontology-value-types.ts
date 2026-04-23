/**
 * Shared Ontology Value-Type Catalog
 *
 * Canonical list of field valueTypes supported by the TQL ontology system.
 * Used by the Ontology create dialog, Schema editor, and any other UI that
 * needs to show field-type pickers or icons.
 */

export interface OntologyValueType {
  readonly value: string
  readonly label: string
  readonly icon: string
  readonly description: string
  /** If true, the field supports a list of `selectOptions`. */
  readonly hasOptions?: boolean
}

export const ONTOLOGY_VALUE_TYPES = [
  { value: 'title', label: 'Title', icon: 'lucide:type', description: 'Primary name field' },
  { value: 'rich_text', label: 'Rich Text', icon: 'lucide:align-left', description: 'Formatted text content' },
  { value: 'number', label: 'Number', icon: 'lucide:hash', description: 'Numeric value' },
  { value: 'select', label: 'Select', icon: 'lucide:chevrons-up-down', description: 'Single choice from options', hasOptions: true },
  { value: 'multi_select', label: 'Multi Select', icon: 'lucide:list-checks', description: 'Multiple choices', hasOptions: true },
  { value: 'status', label: 'Status', icon: 'lucide:circle-dot', description: 'Workflow status', hasOptions: true },
  { value: 'date', label: 'Date', icon: 'lucide:calendar', description: 'Date or date range' },
  { value: 'checkbox', label: 'Checkbox', icon: 'lucide:check-square', description: 'True/false toggle' },
  { value: 'url', label: 'URL', icon: 'lucide:link', description: 'Web address' },
  { value: 'email', label: 'Email', icon: 'lucide:mail', description: 'Email address' },
  { value: 'phone_number', label: 'Phone', icon: 'lucide:phone', description: 'Phone number' },
  { value: 'people', label: 'People', icon: 'lucide:users', description: 'Person reference' },
  { value: 'files', label: 'Files', icon: 'lucide:paperclip', description: 'File attachments' },
  { value: 'relation', label: 'Relation', icon: 'lucide:git-branch', description: 'Link to another entity' },
] as const satisfies readonly OntologyValueType[]

export type OntologyValueTypeValue = (typeof ONTOLOGY_VALUE_TYPES)[number]['value']

const VALUE_TYPE_BY_VALUE: Record<string, OntologyValueType> = Object.fromEntries(
  ONTOLOGY_VALUE_TYPES.map((t) => [t.value, t]),
)

export function getValueTypeMeta(valueType: string): OntologyValueType | null {
  return VALUE_TYPE_BY_VALUE[valueType] ?? null
}

export function getValueTypeIcon(valueType: string): string {
  return VALUE_TYPE_BY_VALUE[valueType]?.icon ?? 'lucide:circle'
}

export function getValueTypeLabel(valueType: string): string {
  return VALUE_TYPE_BY_VALUE[valueType]?.label ?? valueType
}

export function valueTypeSupportsOptions(valueType: string): boolean {
  return VALUE_TYPE_BY_VALUE[valueType]?.hasOptions ?? false
}

/** Popular icon set for the schema editor / create dialog. */
export const ONTOLOGY_POPULAR_ICONS = [
  'lucide:database',
  'lucide:table',
  'lucide:file-text',
  'lucide:folder',
  'lucide:star',
  'lucide:heart',
  'lucide:bookmark',
  'lucide:tag',
  'lucide:users',
  'lucide:briefcase',
  'lucide:wallet',
  'lucide:package',
  'lucide:calendar',
  'lucide:book-open',
  'lucide:zap',
  'lucide:globe',
  'lucide:shapes',
  'lucide:blocks',
  'lucide:boxes',
  'lucide:layers',
  'lucide:server',
  'lucide:hard-drive',
  'lucide:target',
  'lucide:check-square',
] as const
