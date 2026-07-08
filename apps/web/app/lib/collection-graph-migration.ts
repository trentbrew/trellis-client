import type { DatabaseField, DatabaseSchema } from '~/types/database'
import { slugifyOntologyFieldName } from '~/lib/collection-schema-to-ontology'
import { normalizeOntologySlug } from '~/lib/ontology-reserved-keys'

export const COLLECTION_MIGRATED_SETTING_KEY = 'migratedToGraph'

export function collectionMigratedSettingKey(collectionId: string): string {
  return `collection:${collectionId}:${COLLECTION_MIGRATED_SETTING_KEY}`
}

export type JsonLdRecordNode = Record<string, unknown>

export type CollectionMigrationInput = {
  collectionId: string
  slug: string
  content: string
  schema?: DatabaseSchema | null
}

export type MappedCollectionRecord = {
  jsonLdId: string
  entityId: string
  data: Record<string, unknown>
}

export type CollectionMigrationPlan = {
  collectionId: string
  slug: string
  records: MappedCollectionRecord[]
}

function toIdentifier(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
}

function getNodeId(node: JsonLdRecordNode): string {
  const id = node['@id'] ?? node.id
  return typeof id === 'string' ? id : ''
}

function getNodeType(node: JsonLdRecordNode): string {
  const t = node['@type'] ?? node.type
  return typeof t === 'string' ? t : ''
}

export function extractJsonLdRecordNodes(content: string): JsonLdRecordNode[] {
  if (!content?.trim()) return []
  let parsed: unknown
  try {
    parsed = JSON.parse(content)
  } catch {
    return []
  }
  if (!parsed || typeof parsed !== 'object') return []

  const doc = parsed as Record<string, unknown>
  let nodes: unknown[] = []
  if (Array.isArray(doc['@graph'])) {
    nodes = doc['@graph']
  } else if (doc.graph && typeof doc.graph === 'object' && Array.isArray((doc.graph as { nodes?: unknown[] }).nodes)) {
    nodes = (doc.graph as { nodes: unknown[] }).nodes
  }

  return nodes.filter((node): node is JsonLdRecordNode => {
    if (!node || typeof node !== 'object' || Array.isArray(node)) return false
    return getNodeType(node as JsonLdRecordNode) === 'trellis:Record'
  })
}

function normalizeFieldValue(value: unknown, field: DatabaseField): unknown {
  if (value == null) return value
  if (field.type === 'select') {
    if (value && typeof value === 'object' && !Array.isArray(value) && typeof (value as { value?: string }).value === 'string') {
      return (value as { value: string }).value
    }
  }
  if (field.type === 'multiselect' && Array.isArray(value)) {
    return value.map((item) => {
      if (item && typeof item === 'object' && typeof (item as { value?: string }).value === 'string') {
        return (item as { value: string }).value
      }
      return item
    })
  }
  return value
}

function getRecordFieldValue(node: JsonLdRecordNode, field: DatabaseField): unknown {
  const preferredKey = `user:${field.id}`
  if (preferredKey in node) return normalizeFieldValue(node[preferredKey], field)

  const alias = toIdentifier(field.name)
  if (alias) {
    const aliasKey = `user:${alias}`
    if (aliasKey in node) return normalizeFieldValue(node[aliasKey], field)
  }

  if (field.id in node) return normalizeFieldValue(node[field.id], field)
  if (field.name in node) return normalizeFieldValue(node[field.name], field)
  return undefined
}

export function jsonLdRecordIdToEntityId(slug: string, jsonLdId: string): string {
  const normalizedSlug = normalizeOntologySlug(slug)
  const suffix = jsonLdId.replace(/^trellis:record\//, '').replace(/[^a-zA-Z0-9-]/g, '')
  const shortId = suffix.slice(0, 8) || 'record'
  return `entity:${normalizedSlug}-${shortId}`
}

export function mapJsonLdRecordToEntityData(
  node: JsonLdRecordNode,
  slug: string,
  schema?: DatabaseSchema | null,
): Record<string, unknown> {
  const typeSlug = normalizeOntologySlug(slug)
  const titleRaw = node['trellis:title'] ?? node.name ?? node.title
  const title = typeof titleRaw === 'string' && titleRaw.trim() ? titleRaw.trim() : 'Untitled'

  const data: Record<string, unknown> = {
    type: typeSlug,
    title,
  }

  const description = node['trellis:description'] ?? node.description
  if (typeof description === 'string' && description.trim()) {
    data.description = description.trim()
  }

  const fields = schema?.fields ?? []
  for (const field of fields) {
    const value = getRecordFieldValue(node, field)
    if (value === undefined) continue
    const key = slugifyOntologyFieldName(field.name)
    if (key === 'title') continue
    data[key] = value
  }

  return data
}

export function planCollectionRecordMigration(input: CollectionMigrationInput): CollectionMigrationPlan {
  const slug = normalizeOntologySlug(input.slug)
  const nodes = extractJsonLdRecordNodes(input.content)

  const records: MappedCollectionRecord[] = []
  for (const node of nodes) {
    const jsonLdId = getNodeId(node)
    if (!jsonLdId) continue
    records.push({
      jsonLdId,
      entityId: jsonLdRecordIdToEntityId(slug, jsonLdId),
      data: mapJsonLdRecordToEntityData(node, slug, input.schema),
    })
  }

  return {
    collectionId: input.collectionId,
    slug,
    records,
  }
}
