// @vitest-environment node
/**
 * Pure-policy tests for integration-connection ownership enforcement.
 *
 * Regression coverage for the 2026-04-24 multi-tenant data leak: any
 * authenticated request could fetch ANY user's Google Calendar / Gmail
 * data by passing someone else's connectionId. The fix adds an explicit
 * ownership check in every integration route. These tests exercise the
 * decision table directly so we can change request plumbing later (e.g.
 * swap X-User-Id for verified JWTs) without re-validating the policy.
 */

import { describe, it, expect } from 'vitest'
import { shouldAllowConnectionAccess } from '../../server/utils/connection-auth'

describe('shouldAllowConnectionAccess', () => {
  it('allows when caller matches owner', () => {
    const decision = shouldAllowConnectionAccess({
      callerUserId: 'user-123',
      connectionUserId: 'user-123',
    })
    expect(decision.allow).toBe(true)
    expect(decision.reason).toMatch(/owner match/)
  })

  it('DENIES when caller is a different authenticated user (the original bug)', () => {
    const decision = shouldAllowConnectionAccess({
      callerUserId: 'user-admin-demo',
      connectionUserId: 'user-trent-personal',
    })
    expect(decision.allow).toBe(false)
    expect(decision.reason).toMatch(/not the owner/)
    // The reason must name both ids so audit logs are useful.
    expect(decision.reason).toMatch(/user-admin-demo/)
    expect(decision.reason).toMatch(/user-trent-personal/)
  })

  it('DENIES anonymous access to an owned connection', () => {
    // Critical: a client with no X-User-Id must NOT be able to use a
    // connectionId that has a stored owner.
    const decision = shouldAllowConnectionAccess({
      callerUserId: null,
      connectionUserId: 'user-trent-personal',
    })
    expect(decision.allow).toBe(false)
    expect(decision.reason).toMatch(/unauthenticated/)
  })

  it('allows self-hosted / unauthenticated single-user workspace', () => {
    // No caller, no owner → single-user local workspace. Don't break
    // the self-hosted install just to enforce cloud-style isolation.
    const decision = shouldAllowConnectionAccess({
      callerUserId: null,
      connectionUserId: null,
    })
    expect(decision.allow).toBe(true)
  })

  it('allows authenticated caller on legacy connection with no owner fact', () => {
    // Connections created before the ownership fact was added should
    // still be usable by the first authenticated caller who touches
    // them. A warning is logged (separately) so the data gets
    // backfilled/reconnected.
    const decision = shouldAllowConnectionAccess({
      callerUserId: 'user-123',
      connectionUserId: null,
    })
    expect(decision.allow).toBe(true)
    expect(decision.reason).toMatch(/legacy/)
  })

  it('treats empty-string ids as missing', () => {
    // Callers must normalise empty strings to null before passing in.
    // This test documents the contract: empty strings are caller bugs,
    // but if one slips through we should still deny (safer default).
    const decision = shouldAllowConnectionAccess({
      callerUserId: '',
      connectionUserId: 'user-trent',
    })
    // '' is truthy-when-compared-to-null → treated as "no caller"
    expect(decision.allow).toBe(false)
  })
})
