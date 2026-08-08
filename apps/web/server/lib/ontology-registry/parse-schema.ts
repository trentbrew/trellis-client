import type { SchemaDefinition } from '@turtle.tech/trellis-kernel'
import type { InferType } from 'trellis/schema'

/** trellis/schema convergence — graph rows mirror defineType SchemaDefinition output. */
export type GraphSchemaPayload = SchemaDefinition & InferType<Record<string, never>>

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Parse and validate ontology JSON from a trellis_schema entity `configJson` field.
 * Returns null for invalid payloads (caller logs warn on list).
 */
export function parseSchemaDefinition(raw: unknown, context?: string): SchemaDefinition | null {
  let value = raw
  if (typeof raw === 'string') {
    if (!raw.trim()) return null
    try {
      value = JSON.parse(raw) as unknown
    } catch {
      console.warn(`[ontology-registry] invalid JSON${context ? ` (${context})` : ''}`)
      return null
    }
  }

  if (!isRecord(value)) return null

  const id = value['@id']
  const type = value['@type']
  const version = value.version
  const fields = value.fields

  if (typeof id !== 'string' || !id) return null
  if (typeof type !== 'string' || !type) return null
  if (typeof version !== 'string' || !version) return null
  if (!Array.isArray(fields)) return null

  return value as SchemaDefinition
}
