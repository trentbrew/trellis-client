import type { DatabaseField, DatabaseSchema } from '~/types/database'
import type { FieldSignal } from './types'

export function getSchemaFieldTypes(schema?: DatabaseSchema | null): Set<DatabaseField['type']> {
  if (!schema?.fields) return new Set()
  return new Set(schema.fields.map((f) => f.type))
}

export function inferFieldSignals(schema?: DatabaseSchema | null): Set<FieldSignal> {
  const fieldTypes = getSchemaFieldTypes(schema)
  const signals = new Set<FieldSignal>()
  if (fieldTypes.has('select')) signals.add('select')
  if (fieldTypes.has('date')) signals.add('date')
  if (fieldTypes.has('number')) signals.add('number')
  return signals
}
