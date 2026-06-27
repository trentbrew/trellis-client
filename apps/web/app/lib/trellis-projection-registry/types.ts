import type { DatabaseField, ProjectionType } from '~/types/database'

/** Field signals used to gate collection projection eligibility (ADR-001 / fractal-playground). */
export type FieldSignal = 'select' | 'date' | 'number'

export interface ProjectionRegistryNode {
  projectionType: ProjectionType | string
  label: string
  icon?: string
  order: number
  requirements?: {
    schema?: {
      fieldTypes?: Array<DatabaseField['type']>
    }
  }
}

export interface CollectionViewOption {
  mode: ProjectionType
  label: string
  supported: boolean
  isDefault: boolean
  reason?: string
}
