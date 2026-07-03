/**
 * Zone Guard — advisory capability checks (Phase 0, slice 0.4)
 *
 * Every MutationEvent is tagged with a zoneId (see tql-events.ts). The
 * guard subscribes to the event bus, loads the Zone's grants, and logs
 * whether the mutation WOULD be allowed under strict enforcement.
 *
 * Phase 0 is ADVISORY ONLY — we do not reject mutations. This lets us
 * gather telemetry on real traffic before flipping to strict mode in a
 * later phase.
 *
 * Grant schema (stored as JSON on zone.grants):
 *   [{ action: "ALL" | "READ" | "WRITE" | "DELETE" | "REQUEST_ACCESS",
 *      scope: { public?, ownerOnly?, membersOnly?, requiresSecondFactor?,
 *               requiresPublication? } }]
 */

import type { TrellisKernel } from '@turtle.tech/trellis-kernel'
import { onMutation, type MutationEvent } from './tql-events'

// ── Types ───────────────────────────────────────────────────────────────────

export type CapabilityAction = 'ALL' | 'READ' | 'WRITE' | 'DELETE' | 'REQUEST_ACCESS'

export interface CapabilityGrant {
  action: CapabilityAction | string
  scope: {
    public?: boolean
    ownerOnly?: boolean
    membersOnly?: boolean
    requiresSecondFactor?: boolean
    requiresPublication?: boolean
  }
}

export interface ZoneGrantContext {
  zoneId: string
  zoneKind?: string
  facilityId?: string
  ownerAgent?: string
  memberAgents: string[]
  publicRead: boolean
  grants: CapabilityGrant[]
}

export interface ZoneGuardDecision {
  allowed: boolean
  matchedGrant?: CapabilityGrant
  reason: string
}

// ── Pure decision logic (testable without a kernel) ────────────────────────

/**
 * Map an SSE MutationEvent action to the CapabilityAction used in grants.
 * Non-delete writes collapse to WRITE; deletes get their own bucket so
 * future phases can gate them separately (e.g. Vault requires 2FA).
 */
export function mutationActionToGrantAction(action: string): CapabilityAction {
  switch (action) {
    case 'deleteNode':
      return 'DELETE'
    case 'createNode':
    case 'updateNode':
    case 'link':
    case 'unlink':
      return 'WRITE'
    default:
      return 'WRITE'
  }
}

function scopeMatches(grant: CapabilityGrant, agentId: string, ctx: ZoneGrantContext): boolean {
  const scope = grant.scope || {}
  // If no scope gates are set, the grant is unconditional.
  const hasAnyGate = Boolean(scope.public || scope.ownerOnly || scope.membersOnly)
  if (!hasAnyGate) return true
  if (scope.public) return true
  if (scope.ownerOnly && ctx.ownerAgent && agentId === ctx.ownerAgent) return true
  if (scope.membersOnly && ctx.memberAgents.includes(agentId)) return true
  return false
}

export function evaluateGrant(
  event: Pick<MutationEvent, 'action' | 'agentId'>,
  ctx: ZoneGrantContext,
): ZoneGuardDecision {
  const requested = mutationActionToGrantAction(event.action)

  // Owner can always act in their own facility's zones, regardless of grants.
  // This is the Phase 0 back-stop: without it, seeding mutations would
  // advisory-deny because the founder isn't a "member" of their own zones.
  if (ctx.ownerAgent && event.agentId === ctx.ownerAgent) {
    return {
      allowed: true,
      reason: `agent is the owner of facility ${ctx.facilityId || '?'}`,
    }
  }

  for (const grant of ctx.grants) {
    const actionOk = grant.action === 'ALL' || grant.action === requested
    if (!actionOk) continue
    if (scopeMatches(grant, event.agentId, ctx)) {
      return {
        allowed: true,
        matchedGrant: grant,
        reason: `matched grant action=${grant.action} scope=${JSON.stringify(grant.scope)}`,
      }
    }
  }

  return {
    allowed: false,
    reason: `no grant in zone ${ctx.zoneId} matches ${requested} for agent ${event.agentId}`,
  }
}

// ── Zone context loader (reads kernel EAV store directly) ──────────────────

function parseGrants(raw: unknown): CapabilityGrant[] {
  if (!raw) return []
  if (Array.isArray(raw)) return raw as CapabilityGrant[]
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
  return []
}

function coerceStringArray(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.filter((x): x is string => typeof x === 'string')
  if (typeof raw === 'string' && raw.length > 0) return [raw]
  return []
}

function readEntityAttrs(kernel: TrellisKernel, entityId: string): Record<string, unknown> | null {
  try {
    const store = (kernel as any).getStore?.()
    if (!store || typeof store.getFactsByEntity !== 'function') return null
    const facts = store.getFactsByEntity(entityId) as Array<{ e: string; a: string; v: unknown }>
    if (!facts.length) return null
    const attrs: Record<string, unknown> = {}
    for (const fact of facts) attrs[fact.a] = fact.v
    return attrs
  } catch {
    return null
  }
}

// ── Cache (invalidated when a zone or facility entity is mutated) ──────────

const _zoneCache = new Map<string, ZoneGrantContext | null>()

function loadZoneContext(kernel: TrellisKernel, zoneId: string): ZoneGrantContext | null {
  if (_zoneCache.has(zoneId)) return _zoneCache.get(zoneId) ?? null

  const zoneAttrs = readEntityAttrs(kernel, zoneId)
  if (!zoneAttrs) {
    _zoneCache.set(zoneId, null)
    return null
  }

  const facilityId = typeof zoneAttrs.facilityId === 'string' ? zoneAttrs.facilityId : undefined
  let ownerAgent: string | undefined
  if (facilityId) {
    const facilityAttrs = readEntityAttrs(kernel, facilityId)
    if (facilityAttrs && typeof facilityAttrs.ownerAgent === 'string') {
      ownerAgent = facilityAttrs.ownerAgent
    }
  }

  const ctx: ZoneGrantContext = {
    zoneId,
    zoneKind: typeof zoneAttrs.zoneKind === 'string' ? zoneAttrs.zoneKind : undefined,
    facilityId,
    ownerAgent,
    memberAgents: coerceStringArray(zoneAttrs.memberAgents),
    publicRead: Boolean(zoneAttrs.publicRead),
    grants: parseGrants(zoneAttrs.grants),
  }

  _zoneCache.set(zoneId, ctx)
  return ctx
}

/**
 * Invalidate a zone's cached context. Called when a zone entity is mutated.
 * @internal
 */
export function invalidateZoneCache(zoneId: string): void {
  _zoneCache.delete(zoneId)
}

// ── Mode + pre-check (slice 1.3) ───────────────────────────────────────────

export type ZoneGuardMode = 'off' | 'advisory' | 'strict'

/**
 * Resolve the guard mode from `TRELLIS_ZONE_GUARD_MODE`. Defaults to
 * `advisory` — pure telemetry, no rejection. Set to `strict` to have
 * `/mutate` reject denied mutations with 403.
 */
export function getZoneGuardMode(): ZoneGuardMode {
  const raw = (process.env.TRELLIS_ZONE_GUARD_MODE || '').trim().toLowerCase()
  if (raw === 'strict' || raw === 'off') return raw
  return 'advisory'
}

/**
 * Synchronous pre-check used by the `/mutate` handler. Returns the
 * decision alongside the loaded zone context so callers can cheaply log
 * or attach it to responses.
 *
 * In strict mode, the handler should reject with 403 when `allowed` is
 * false. In advisory mode, the post-hoc onMutation listener handles
 * logging; callers can ignore the decision.
 */
export function checkMutation(
  kernel: TrellisKernel,
  event: Pick<MutationEvent, 'action' | 'agentId' | 'zoneId'>,
): { decision: ZoneGuardDecision; ctx: ZoneGrantContext | null } {
  if (!event.zoneId) {
    return {
      decision: { allowed: false, reason: 'event missing zoneId' },
      ctx: null,
    }
  }
  const ctx = loadZoneContext(kernel, event.zoneId)
  if (!ctx) {
    return {
      decision: { allowed: false, reason: `unknown zone ${event.zoneId}` },
      ctx: null,
    }
  }
  return { decision: evaluateGrant(event, ctx), ctx }
}

// ── Wire-up ────────────────────────────────────────────────────────────────

let _initialized = false
const _stats = { total: 0, allow: 0, deny: 0, unknownZone: 0, rejected: 0 }

/**
 * Increment the strict-mode rejection counter. Called by the /mutate
 * handler when it returns 403 based on checkMutation's decision.
 */
export function recordStrictRejection(): void {
  _stats.rejected++
}

/**
 * Subscribe the advisory guard to the mutation event bus. Safe to call
 * multiple times; a second call is a no-op.
 */
export function initZoneGuard(kernel: TrellisKernel): void {
  if (_initialized) return
  _initialized = true

  const mode = getZoneGuardMode()
  const modeLabel =
    mode === 'strict' ? 'STRICT (rejects on DENY)' : mode === 'off' ? 'OFF (no logging)' : 'advisory (logs only)'
  console.log(`[zone-guard] Mode: ${modeLabel} — set TRELLIS_ZONE_GUARD_MODE=off|advisory|strict to change`)

  onMutation((event) => {
    try {
      // Invalidate cache when zone/facility metadata changes
      if (event.type === 'zone' && event.entityId) invalidateZoneCache(event.entityId)
      if (event.type === 'facility') _zoneCache.clear()

      // Off mode: no telemetry, no logging.
      if (getZoneGuardMode() === 'off') return

      const zoneId = event.zoneId
      if (!zoneId) return

      _stats.total++
      const ctx = loadZoneContext(kernel, zoneId)
      if (!ctx) {
        _stats.unknownZone++
        console.warn(
          `[zone-guard] UNKNOWN zone=${zoneId} event=#${event.id} action=${event.action} agent=${event.agentId}`,
        )
        return
      }

      const decision = evaluateGrant(event, ctx)
      if (decision.allowed) {
        _stats.allow++
        console.debug(
          `[zone-guard] ALLOW agent=${event.agentId} action=${event.action} zone=${ctx.zoneKind || zoneId} event=#${event.id}`,
        )
      } else {
        _stats.deny++
        console.warn(
          `[zone-guard] DENY (advisory) agent=${event.agentId} action=${event.action} zone=${ctx.zoneKind || zoneId} event=#${event.id} reason="${decision.reason}"`,
        )
      }
    } catch (err) {
      // Guard must never break the mutation pipeline. Log and move on.
      console.warn(`[zone-guard] evaluation error for event #${event.id}:`, err)
    }
  })
}

/**
 * Read-only snapshot of guard statistics — useful for /api/graph/health.
 */
export function getZoneGuardStats(): Readonly<typeof _stats> {
  return { ..._stats }
}
