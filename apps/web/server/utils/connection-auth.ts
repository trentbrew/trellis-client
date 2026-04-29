/**
 * Integration-connection ownership enforcement.
 *
 * Why this exists
 * ───────────────
 * `integration_connection` entities hold OAuth credentials for per-user
 * third-party accounts (Google Calendar, Gmail, GitHub, …). The entity
 * stores the owner's user id in a `userId` fact, populated by the OAuth
 * callback. Historically, every route that accepts a `connectionId` query
 * parameter loaded credentials by entity id without checking ownership:
 * any authenticated request could fetch ANY user's emails/events by
 * guessing or listing connection ids. The client composable compounded
 * the problem by listing every connection in the graph, not just the
 * caller's.
 *
 * This module closes the server-side hole. Call `requireConnectionOwner`
 * at the top of every integration route handler BEFORE using the
 * connection id to mint access tokens.
 *
 * Threat model
 * ────────────
 * We trust the `X-User-Id` header the client sends. This matches the
 * application's existing security posture — the OAuth callback already
 * trusts a `gcal_oauth_user` cookie, and InstantDB tokens are not
 * currently verified server-side. This fix raises the floor from
 * "anyone with the kernel can read anyone's email" to "anyone who can
 * guess a known user's id can read that user's email" — still not a
 * production-grade auth system, but a significant improvement. Proper
 * bearer-token verification via `useInstantAdmin().auth.verifyToken()`
 * is a planned follow-up; the shape of the policy below (pure decision
 * table separated from request plumbing) makes that upgrade drop-in.
 *
 * Self-hosted / local mode
 * ────────────────────────
 * When there's no authenticated user at all (no `X-User-Id` header and
 * no stored `userId` on the connection), the request is allowed — this
 * preserves the single-user self-hosted workflow where auth is optional.
 */

import type { H3Event } from 'h3'

// NOTE: `useTqlKernel` is deliberately imported lazily inside the one
// function that needs it (`getConnectionUserId`). Top-level import would
// pull in the Nitro plugin module (`defineNitroPlugin`), which is not
// defined in the vitest environment and would break the pure-policy
// tests for `shouldAllowConnectionAccess`.

export interface ConnectionAccessInput {
  /** The user id extracted from the request (header/cookie). */
  callerUserId: string | null
  /** The userId fact stored on the connection entity. */
  connectionUserId: string | null
}

export interface ConnectionAccessDecision {
  allow: boolean
  /** Short, loggable reason — useful for audit + telemetry. */
  reason: string
}

/**
 * Pure decision — no I/O, deterministic, unit-testable.
 *
 * Rules:
 *   1. Caller matches owner                → allow
 *   2. Caller present, owner missing       → allow (legacy connection;
 *                                            logs warn so it gets fixed)
 *   3. Caller missing, owner present       → deny (an authenticated
 *                                            connection must not be
 *                                            accessible anonymously)
 *   4. Caller missing, owner missing       → allow (self-hosted /
 *                                            single-user mode)
 *   5. Caller present, owner present,
 *      ids differ                          → deny
 */
export function shouldAllowConnectionAccess(input: ConnectionAccessInput): ConnectionAccessDecision {
  const { callerUserId, connectionUserId } = input

  if (callerUserId && connectionUserId) {
    if (callerUserId === connectionUserId) {
      return { allow: true, reason: 'owner match' }
    }
    return {
      allow: false,
      reason: `caller ${callerUserId} is not the owner (${connectionUserId}) of this connection`,
    }
  }

  if (callerUserId && !connectionUserId) {
    return { allow: true, reason: 'legacy connection has no stored owner' }
  }

  if (!callerUserId && connectionUserId) {
    return {
      allow: false,
      reason: 'connection has an owner but request is unauthenticated',
    }
  }

  return { allow: true, reason: 'self-hosted / unauthenticated workspace' }
}

/**
 * Pull the caller's user id from a request.
 *
 * Supports two sources, in order:
 *   1. `X-User-Id` header (primary — sent by the Nuxt composables)
 *   2. `x-user-id` lowercase variant (tolerant of proxies)
 *
 * Cookies are intentionally NOT read here because the only user-id
 * cookies in the app today are the short-lived OAuth callback cookies,
 * which aren't meaningful outside that flow.
 */
export function getCallerUserId(event: H3Event): string | null {
  // h3's getHeader is already case-insensitive, but we try both spellings
  // defensively in case a proxy rewrites one.
  const raw =
    (event.node.req.headers['x-user-id'] as string | undefined) ||
    (event.node.req.headers['X-User-Id' as any] as string | undefined) ||
    null
  if (!raw) return null
  const trimmed = String(raw).trim()
  return trimmed || null
}

/**
 * Read the `userId` fact from an integration_connection entity.
 *
 * Returns `null` when the entity exists but has no userId fact, OR
 * when the entity doesn't exist at all. Callers distinguish via the
 * 404 thrown downstream in `loadCredentials`.
 */
export async function getConnectionUserId(connectionId: string): Promise<string | null> {
  // Lazy import avoids loading `defineNitroPlugin` in pure-policy tests.
  const { useTqlKernel } = await import('../plugins/tql')
  const kernel = useTqlKernel()
  const entityId = connectionId.startsWith('entity:') ? connectionId : `entity:${connectionId}`
  const facts = kernel.getStore().getFactsByEntity(entityId) as Array<{
    a: string
    v: unknown
  }>
  const fact = facts.find((f) => f.a === 'userId')
  if (!fact) return null
  const v = fact.v
  return typeof v === 'string' && v.length > 0 ? v : null
}

/**
 * Reject the request with 403 unless the caller owns the connection.
 *
 * Call this FIRST in every `defineEventHandler` that accepts a
 * `connectionId`. It's cheap (a single EAV lookup, no SQL) and runs
 * before any OAuth-token refresh or upstream HTTP call, so malicious
 * probing can't leak side-channel information like token-refresh
 * timings.
 */
export async function requireConnectionOwner(event: H3Event, connectionId: string): Promise<ConnectionAccessDecision> {
  const callerUserId = getCallerUserId(event)
  const connectionUserId = await getConnectionUserId(connectionId)
  const decision = shouldAllowConnectionAccess({
    callerUserId,
    connectionUserId,
  })

  if (!decision.allow) {
    console.warn(
      `[connection-auth] DENY connectionId=${connectionId} caller=${callerUserId ?? 'anonymous'} reason="${decision.reason}"`,
    )
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden',
      message: decision.reason,
    })
  }

  // Warn (but allow) when a connection has no stored owner — these
  // typically date from before the ownership fact was added and should
  // be backfilled or reconnected.
  if (decision.reason === 'legacy connection has no stored owner') {
    console.warn(`[connection-auth] legacy connection has no owner fact: ${connectionId} — caller=${callerUserId}`)
  }

  return decision
}
