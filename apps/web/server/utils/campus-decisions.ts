/**
 * Decision auto-capture — Campus Substrate, Phase 1 slice 1.1
 *
 * When a mutation is executed with decision capture enabled (opt-in via
 * the `X-Trellis-Capture-Decision: 1` header or `captureDecision: true`
 * in the request body), this helper writes a `decision` entity recording
 * WHO acted, WHAT they did, WHERE (zone), and WHY (tool input).
 *
 * Why opt-in: browsers fire dozens of mutations per user action (typing
 * in a title field, dragging cards, etc.). Auto-capturing every one
 * would balloon the graph. Agents and CLI tools that want provenance
 * turn it on with a single header.
 *
 * Recursion safety: a decision's own createNode is a mutation too, so
 * the helper skips capture when the target mutation is itself a
 * `decision`, and the internal createNode uses `agentId: 'decision-capture'`
 * which is filtered by shouldCaptureDecision().
 */

import type { TrellisKernel } from '@turtle.tech/tql'
import { emitMutation } from './tql-events'

/** Agent IDs whose mutations NEVER trigger a decision (internal subsystems). */
const SYSTEM_AGENTS = new Set([
  'decision-capture',
  'campus-migration',
  'graph-notifier',
  'system',
  'browser', // default agentId when unset — user-driven, not an Agent entity
  '',
])

export interface CaptureInput {
  action: 'createNode' | 'updateNode' | 'deleteNode' | 'link' | 'unlink' | string
  agentId: string
  zoneId: string
  facilityId: string
  /** Primary entity id for node actions, or `${e1} -> ${e2}` for link/unlink */
  entityId?: string
  /** For createNode/updateNode, the submitted type (task, note, artifact, ...) */
  entityType?: string
  /** The full mutation body echoed into `toolInput` (JSON-serializable) */
  toolInput: Record<string, unknown>
}

/**
 * Decide whether a given mutation should spawn a Decision entity.
 * Pure — safe to unit-test.
 */
export function shouldCaptureDecision(input: CaptureInput, captureRequested: boolean): boolean {
  if (!captureRequested) return false
  if (SYSTEM_AGENTS.has(input.agentId)) return false
  // Avoid recursion: capturing a decision-of-a-decision-creation
  if (input.entityType === 'decision') return false
  return true
}

/**
 * Build the decision entity payload. Pure — safe to unit-test.
 */
export function buildDecisionData(input: CaptureInput): {
  decisionId: string
  data: Record<string, any>
} {
  const slug = (input.entityId || 'anon').replace(/^entity:/, '').replace(/[^a-z0-9-]/gi, '-').slice(0, 60)
  const decisionId = `entity:decision-${input.action}-${slug}-${Date.now().toString(36)}`

  const titleParts = [input.action]
  if (input.entityId) titleParts.push(input.entityId)
  if (input.entityType) titleParts.push(`(${input.entityType})`)

  const data: Record<string, any> = {
    type: 'decision',
    title: titleParts.join(' ').trim(),
    byAgent: input.agentId,
    inZone: input.zoneId,
    zoneId: input.zoneId,
    facilityId: input.facilityId,
    outcome: 'executed',
    toolName: 'api/graph/mutate',
    toolInput: JSON.stringify(input.toolInput),
    rationale: `Agent ${input.agentId} invoked ${input.action} in zone ${input.zoneId}`,
  }
  // Artifact production link — only set when the mutation produced an artifact
  if (input.action === 'createNode' && input.entityType === 'artifact' && input.entityId) {
    data.producesArtifact = input.entityId
  }
  return { decisionId, data }
}

/**
 * Write the Decision entity. Fire-and-forget; failures are logged but
 * never raised so decision-capture never breaks the originating mutation.
 */
export async function captureDecision(kernel: TrellisKernel, input: CaptureInput): Promise<string | null> {
  const { decisionId, data } = buildDecisionData(input)
  try {
    await kernel.createNode(decisionId, data, 'entity', { agentId: 'decision-capture' })
    emitMutation({
      action: 'createNode',
      entityId: decisionId,
      type: 'entity',
      agentId: 'decision-capture',
      zoneId: input.zoneId,
      facilityId: input.facilityId,
      data,
    })
    return decisionId
  } catch (err: any) {
    console.warn(`[decision-capture] failed for ${input.action} ${input.entityId || ''}:`, err?.message || err)
    return null
  }
}
