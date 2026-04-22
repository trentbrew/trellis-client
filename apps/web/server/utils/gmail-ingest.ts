/**
 * Gmail ingest pipeline (server-side).
 *
 * Shared helpers invoked from the gmail-notifier to:
 *   1. Persist a Gmail thread as a TQL `email` entity (graph-linkable).
 *   2. Enrich the entity with AI-generated summary, entity suggestions,
 *      tag suggestions, importance classification, and topical labels.
 *   3. Emit SSE mutation events so any connected client (mail page, bell)
 *      refreshes in realtime without a page reload.
 *
 * The enrichment is best-effort: if any LLM call fails the entity still
 * lands in the graph, only the AI fields are left empty. The client can
 * always trigger a manual re-scan from the AI Suggestions panel.
 */

import { useTqlKernel, pushMutationLog } from '../plugins/tql'
import { emitMutation } from './tql-events'
import { summarizeText } from '../api/summarize-entity-llm.post'
import { classifyEmail, type EmailImportance } from '../api/classify-email-llm.post'
import type { NormalizedGmailMessage, NormalizedGmailThread } from './gmail-mime'

// ─── Types ─────────────────────────────────────────────────────────────────

/** Accepted thread shape — aliased to the shared normalized type. */
export type IngestThread = NormalizedGmailThread
export type IngestThreadMessage = NormalizedGmailMessage

export interface EmailEnrichment {
  summary: string
  aiSuggestions: any[]
  aiSuggestedTags: string[]
  aiTypeProposals: any[]
  importance: EmailImportance
  aiLabels: string[]
  scannedAt: string
}

const AGENT_ID = 'gmail-notifier'
const MIN_BODY_LENGTH_FOR_ENRICHMENT = 200

// ─── Helpers ───────────────────────────────────────────────────────────────

function toEntityId(threadId: string): string {
  return `entity:gmail-${threadId}`
}

/**
 * Build the full data record for an `email` entity from a Gmail thread.
 * Pure function — mirrors the client-side `persistThreadToTql` shape so the
 * UI can render either client-persisted or server-persisted emails identically.
 */
export function buildEmailEntityData(thread: IngestThread, connEntityId?: string): Record<string, any> {
  const firstMsg = thread.messages[0]
  if (!firstMsg) throw new Error('Thread has no messages')

  const data: Record<string, any> = {
    type: 'email',
    title: firstMsg.subject || '(no subject)',
    subject: firstMsg.subject,
    snippet: firstMsg.snippet,
    from: firstMsg.from,
    to: firstMsg.to,
    cc: firstMsg.cc,
    date: firstMsg.date,
    labelIds: thread.labelIds,
    threadId: thread.id,
    messageId: firstMsg.messageId,
    isRead: !thread.labelIds.includes('UNREAD'),
    isStarred: thread.labelIds.includes('STARRED'),
    bodyText: firstMsg.bodyText,
    bodyHtml: firstMsg.bodyHtml,
    source: 'gmail',
    gmailMessageId: firstMsg.id,
    gmailThreadId: thread.id,
    pinned: false,
  }
  if (connEntityId) data.connectionId = connEntityId
  return data
}

/**
 * Cheap existence check — returns true if the entity already has any facts
 * persisted. Used by `persistEmailEntity` to avoid the destructive
 * `createNode` path on subsequent polls of the same thread.
 */
function entityExists(entityId: string): boolean {
  try {
    const kernel = useTqlKernel()
    const store = kernel.getStore()
    return store.getFactsByEntity(entityId).length > 0
  } catch {
    return false
  }
}

/**
 * Create the email entity in TQL, or patch its Gmail-owned fields if it
 * already exists. Emits a mutation event so connected clients re-render
 * the mail page instantly.
 *
 * CRITICAL: `kernel.createNode` is destructive — it wipes ALL existing
 * facts for the entity before writing. Since the gmail-notifier polls
 * every 3 minutes and unread threads stay in the INBOX+UNREAD list, we
 * MUST NOT call `createNode` on a thread we've already seen, or we'll
 * erase the AI enrichment written by `enrichEmailEntity`.
 *
 * Strategy:
 *   - First poll for a thread → `createNode` (new entity)
 *   - Subsequent polls     → `updateNode` of only the Gmail-owned fields
 *     (labelIds, isRead, isStarred, snippet) so label changes still sync
 *     but AI fields survive.
 */
export async function persistEmailEntity(
  thread: IngestThread,
  connEntityId?: string,
): Promise<{ entityId: string; existed: boolean }> {
  const kernel = useTqlKernel()
  const entityId = toEntityId(thread.id)
  const existed = entityExists(entityId)

  if (!existed) {
    const data = buildEmailEntityData(thread, connEntityId)
    await kernel.createNode(entityId, data, 'entity', { agentId: AGENT_ID })
    pushMutationLog({ action: 'createNode', entityId, type: 'entity', data })
    emitMutation({ action: 'createNode', entityId, type: 'entity', agentId: AGENT_ID, data })

    // Provenance edge: email → source integration connection. Only on create
    // so we don't re-link every poll.
    if (connEntityId) {
      try {
        await kernel.link(entityId, 'derivedFrom', connEntityId, { agentId: AGENT_ID })
        pushMutationLog({
          action: 'link',
          entityId: `${entityId} -> ${connEntityId}`,
          data: { relation: 'derivedFrom' },
        })
        emitMutation({
          action: 'link',
          entityId: `${entityId} -> ${connEntityId}`,
          agentId: AGENT_ID,
          data: { relation: 'derivedFrom', e1: entityId, e2: connEntityId },
        })
      } catch (err) {
        console.warn('[gmail-ingest] derivedFrom link failed:', err)
      }
    }
  } else {
    // Refresh only the volatile Gmail-owned fields; preserve AI enrichment
    // + any user-edited fields.
    const firstMsg = thread.messages[0]
    if (firstMsg) {
      const patch: Record<string, any> = {
        labelIds: thread.labelIds,
        isRead: !thread.labelIds.includes('UNREAD'),
        isStarred: thread.labelIds.includes('STARRED'),
        snippet: firstMsg.snippet,
      }
      try {
        await kernel.updateNode(entityId, patch, 'entity', { agentId: AGENT_ID })
        pushMutationLog({ action: 'updateNode', entityId, type: 'entity', data: patch })
        emitMutation({ action: 'updateNode', entityId, type: 'entity', agentId: AGENT_ID, data: patch })
      } catch (err) {
        console.warn('[gmail-ingest] refresh patch failed for', entityId, err)
      }
    }
  }

  return { entityId, existed }
}

/**
 * Collect the LLM extraction request's `existingTypes`/`existingTypeLabels`
 * lookups from the kernel's ontology registry — this tells the extractor
 * not to re-propose ontologies the user already has.
 */
function readExistingTypes(): { existingTypes: string[]; existingTypeLabels: string[] } {
  try {
    const kernel = useTqlKernel()
    const schemas = kernel.listOntologies() as Array<{ '@id'?: string; label?: string }>
    const existingTypes = schemas.map((s) => (typeof s['@id'] === 'string' ? s['@id'] : '')).filter((s) => s.length > 0)
    const existingTypeLabels = schemas
      .map((s) => (typeof s.label === 'string' ? s.label : ''))
      .filter((l) => l.length > 0)
    return { existingTypes, existingTypeLabels }
  } catch {
    return { existingTypes: [], existingTypeLabels: [] }
  }
}

/**
 * Build the text corpus used for both summarization and entity extraction.
 * Subject + plain-text body is more reliable than HTML; fall back to snippet
 * if neither is available.
 */
function buildExtractionText(firstMsg: IngestThreadMessage): string {
  const subject = firstMsg.subject || ''
  const body = firstMsg.bodyText || firstMsg.snippet || ''
  return [subject, body].filter(Boolean).join('\n\n').trim()
}

/**
 * Run summarization, entity extraction, and importance classification in
 * parallel. Any individual failure is isolated — the remaining fields still
 * persist. Returns the assembled enrichment.
 */
export async function enrichEmailEntity(entityId: string, thread: IngestThread): Promise<EmailEnrichment | null> {
  const firstMsg = thread.messages[0]
  if (!firstMsg) return null

  const text = buildExtractionText(firstMsg)
  if (text.length < MIN_BODY_LENGTH_FOR_ENRICHMENT) {
    return null
  }

  const { existingTypes, existingTypeLabels } = readExistingTypes()

  // Fire all three LLM calls in parallel.
  const summaryP = summarizeText({ text, type: 'email', title: firstMsg.subject }).catch((err) => {
    console.warn('[gmail-ingest] summarize failed for', entityId, err?.message || err)
    return ''
  })

  const extractP = $fetch<{ entities: any[]; tags: string[]; typeProposals?: any[] }>('/api/extract-entities-llm', {
    method: 'POST',
    body: { text, kind: 'email', existingTypes, existingTypeLabels },
  }).catch((err) => {
    console.warn('[gmail-ingest] extract failed for', entityId, err?.message || err)
    return { entities: [] as any[], tags: [] as string[], typeProposals: [] as any[] }
  })

  const classifyP = classifyEmail({
    subject: firstMsg.subject,
    body: firstMsg.bodyText || firstMsg.snippet || '',
    from: firstMsg.from,
    to: firstMsg.to,
  }).catch((err) => {
    console.warn('[gmail-ingest] classify failed for', entityId, err?.message || err)
    return { importance: 'medium' as EmailImportance, labels: [] as string[] }
  })

  const [summary, extract, classify] = await Promise.all([summaryP, extractP, classifyP])

  // The extract endpoint returns entities already shaped as
  // ContentEntityCandidate — the client panel does graph matching on top,
  // but we store the raw candidates so re-hydration re-matches against the
  // current graph (not a stale snapshot).
  const suggestions = Array.isArray(extract.entities)
    ? extract.entities.map((c) => ({ candidate: c, status: 'new' as const }))
    : []

  const enrichment: EmailEnrichment = {
    summary: (summary || '').trim(),
    aiSuggestions: suggestions,
    aiSuggestedTags: Array.isArray(extract.tags) ? extract.tags.slice(0, 12) : [],
    aiTypeProposals: Array.isArray(extract.typeProposals) ? extract.typeProposals : [],
    importance: classify.importance,
    aiLabels: classify.labels,
    scannedAt: new Date().toISOString(),
  }

  // Patch the entity with AI fields. We store JSON blobs for the complex
  // shapes since the EAV layer stores primitives natively and arrays of
  // objects need to round-trip as strings.
  //
  // Skip writing empty summary / empty labels — if an LLM call failed we'd
  // otherwise clobber existing enrichment on a retry poll. We still write
  // `aiScannedAt` so the short-circuit in `ingestThread` engages next time.
  try {
    const patch: Record<string, any> = {
      aiScannedAt: enrichment.scannedAt,
      aiSuggestions: JSON.stringify(enrichment.aiSuggestions),
      aiSuggestedTags: enrichment.aiSuggestedTags,
      aiTypeProposals: JSON.stringify(enrichment.aiTypeProposals),
    }
    if (enrichment.summary && enrichment.summary.length > 0) {
      patch.summary = enrichment.summary
      patch.summaryGeneratedAt = enrichment.scannedAt
    }
    if (Array.isArray(enrichment.aiLabels) && enrichment.aiLabels.length > 0) {
      patch.aiLabels = enrichment.aiLabels
    }
    // Always persist priority — the classifier has a default fallback.
    patch.priority = enrichment.importance

    const kernel = useTqlKernel()
    await kernel.updateNode(entityId, patch, 'entity', { agentId: AGENT_ID })
    pushMutationLog({ action: 'updateNode', entityId, type: 'entity', data: patch })
    emitMutation({ action: 'updateNode', entityId, type: 'entity', agentId: AGENT_ID, data: patch })
  } catch (err) {
    console.warn('[gmail-ingest] enrichment write failed for', entityId, err)
  }

  return enrichment
}

/**
 * Map the email's internal importance (Priority scale: critical/high/medium/low)
 * to a notification priority (NotificationPriority scale: critical/high/normal/low).
 * The only mismatch is medium ↔ normal.
 */
export function importanceToNotificationPriority(importance: EmailImportance): 'critical' | 'high' | 'normal' | 'low' {
  return importance === 'medium' ? 'normal' : importance
}

/**
 * Check whether the entity already has AI enrichment cached — avoids a
 * redundant LLM round-trip on subsequent polls of the same thread.
 */
function hasExistingEnrichment(entityId: string): boolean {
  try {
    const kernel = useTqlKernel()
    const store = kernel.getStore()
    const facts = store.getFactsByEntity(entityId)
    return facts.some((f: any) => f.a === 'aiScannedAt' && typeof f.v === 'string' && f.v.length > 0)
  } catch {
    return false
  }
}

/**
 * Full ingest: persist + enrich in one call. Returns the entity id and
 * (optional) enrichment so the notifier can feed the result into the
 * notification payload. Enrichment is skipped when the entity already has
 * `aiScannedAt` set — subsequent polls stay cheap.
 */
export async function ingestThread(
  thread: IngestThread,
  connEntityId?: string,
): Promise<{ entityId: string; enrichment: EmailEnrichment | null }> {
  const { entityId, existed } = await persistEmailEntity(thread, connEntityId)

  // Short-circuit: if the entity existed AND already has AI enrichment, skip
  // the expensive LLM calls. The client can still trigger a re-scan from the
  // AI Suggestions panel's "Scan" button if they want fresh results.
  if (existed && hasExistingEnrichment(entityId)) {
    return { entityId, enrichment: null }
  }

  const enrichment = await enrichEmailEntity(entityId, thread)
  return { entityId, enrichment }
}
