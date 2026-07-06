/** Graph-native sheet projection types (TRL-286) */

export type SheetColumnKind = 'text' | 'number' | 'select' | 'formula' | 'relation'

export interface SheetColumn {
  id: string
  attribute: string
  kind: SheetColumnKind
  label?: string
  formula?: string
  relationType?: string
}

export interface SheetDefinition {
  title: string
  query: string
  columns: SheetColumn[]
  formulas?: Array<{ id: string; expression: string; display?: string }>
  zoneId?: string
  facilityId?: string
}

export interface SheetCellRef {
  entityId: string
  columnId: string
  rowIndex: number
  colIndex: number
}
