import type { TrellisKernel } from '@turtle.tech/trellis-kernel'
import { extractYmd } from '../../../app/utils/date'
import { factsToNode } from '../app-config-facts'
import { isBrowseDomainType } from './browse-domain-types'

export const KERNEL_BROWSE_BRIDGE_TYPE = 'KernelBrowse' as const

export type KernelBrowseRow = {
  id: string
  type: typeof KERNEL_BROWSE_BRIDGE_TYPE
  entityType: string
  title: string
  payloadJson: string
}

const MULTI_VALUE_FIELDS = new Set(['children', 'relationships', 'dependsOn', 'counterparties', 'lineItems'])

function normalizeScalar(val: unknown): unknown {
  if (!Array.isArray(val)) return val
  if (val.length === 0) return undefined
  return val[val.length - 1]
}

function normalizeArray(val: unknown): unknown[] {
  if (Array.isArray(val)) return val
  if (val === undefined || val === null || val === '') return []
  return [val]
}

function normalizeScalars(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [key, val] of Object.entries(obj)) {
    out[key] = MULTI_VALUE_FIELDS.has(key) ? val : normalizeScalar(val)
  }
  return out
}

function parseJsonArray(val: unknown): unknown[] {
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val)
      if (Array.isArray(parsed)) return parsed
    } catch {
      /* not JSON */
    }
  }
  return normalizeArray(val)
}

/** Build app Entity scalar payload from a kernel node (v1 — no link hydration). */
export function kernelNodeToEntityPayload(
  entityId: string,
  node: Record<string, unknown>,
): Record<string, unknown> {
  const id = entityId.replace(/^entity:/, '')
  const { '@id': _ldId, '@type': _ldType, type: _domainType, ...rest } = node
  const normalized = normalizeScalars(rest)

  const entityType = normalizeScalar(node['@type'] ?? node.type)
  const startDateRaw = normalized.startDate
  const endDateRaw = normalized.endDate

  return {
    id,
    type: entityType,
    title: normalizeScalar(node.title) ?? id,
    ...normalized,
    startDate: extractYmd(typeof startDateRaw === 'string' ? startDateRaw : undefined),
    endDate: extractYmd(typeof endDateRaw === 'string' ? endDateRaw : undefined) || undefined,
    tags: normalizeArray(node.tags),
    involved: normalizeArray(node.involved),
    reminders: parseJsonArray(node.reminders),
    checklist: parseJsonArray(node.checklist),
    checklistContent: normalizeScalar(node.checklistContent) || '',
    attachments: parseJsonArray(node.attachments),
    references: [],
  }
}

export function kernelNodeToBrowseRow(
  entityId: string,
  node: Record<string, unknown>,
): KernelBrowseRow | null {
  if (!entityId.startsWith('entity:')) return null

  const entityType = normalizeScalar(node['@type'] ?? node.type)
  if (typeof entityType !== 'string' || !isBrowseDomainType(entityType)) return null

  const payload = kernelNodeToEntityPayload(entityId, node)
  const title = typeof payload.title === 'string' ? payload.title : entityId

  return {
    id: entityId,
    type: KERNEL_BROWSE_BRIDGE_TYPE,
    entityType,
    title,
    payloadJson: JSON.stringify(payload),
  }
}

function collectBrowseEntityIds(store: ReturnType<TrellisKernel['getStore']>): string[] {
  const ids = new Set<string>()
  for (const fact of store.getAllFacts()) {
    if (fact.a === 'type' && isBrowseDomainType(fact.v) && fact.e.startsWith('entity:')) {
      ids.add(fact.e)
    }
  }
  return [...ids]
}

export function listKernelBrowseEntities(
  kernel: TrellisKernel,
  opts: { limit?: number; offset?: number } = {},
): { data: KernelBrowseRow[]; total: number; limit: number; offset: number } {
  const store = kernel.getStore()
  const limit = opts.limit ?? 500
  const offset = opts.offset ?? 0

  const rows: KernelBrowseRow[] = []
  for (const entityId of collectBrowseEntityIds(store)) {
    const node = factsToNode(entityId, store.getFactsByEntity(entityId))
    const row = kernelNodeToBrowseRow(entityId, node)
    if (row) rows.push(row)
  }

  const page = rows.slice(offset, offset + limit)
  return { data: page, total: rows.length, limit, offset }
}
