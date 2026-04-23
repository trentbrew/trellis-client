// @vitest-environment node
/**
 * Campus Substrate — pure-logic tests.
 *
 * Covers the decision/mapping functions that land in the mutation hot
 * path. Keeping these green is the safety net for Phase 1 slice 1.3
 * (strict zone-guard enforcement) — if any assertion breaks we stay in
 * advisory mode.
 *
 *   - zone-guard: mutationActionToGrantAction, evaluateGrant
 *   - zone-router: zoneForPath
 *   - campus-decisions: shouldCaptureDecision, buildDecisionData
 *
 * Uses the `node` environment to skip Nuxt/Vue runtime setup (which has
 * an unrelated color-mode plugin error in the shared test config).
 */

import { describe, it, expect, afterEach } from 'vitest'
import {
  evaluateGrant,
  mutationActionToGrantAction,
  getZoneGuardMode,
  type ZoneGrantContext,
} from '../../server/utils/zone-guard'
import { zoneForPath } from '../../server/utils/zone-router'
import {
  FOUNDER_FACILITY_ID,
  FOUNDER_LAB_ZONE_ID,
  FOUNDER_LOBBY_ZONE_ID,
  FOUNDER_WORKSHOP_ZONE_ID,
  FOUNDER_SHOWROOM_ZONE_ID,
  FOUNDER_VAULT_ZONE_ID,
} from '../../server/utils/tql-events'
import { shouldCaptureDecision, buildDecisionData, type CaptureInput } from '../../server/utils/campus-decisions'

// ── zone-guard: getZoneGuardMode (slice 1.3) ──────────────────────────────

describe('getZoneGuardMode', () => {
  const originalEnv = process.env.TRELLIS_ZONE_GUARD_MODE

  afterEach(() => {
    if (originalEnv === undefined) delete process.env.TRELLIS_ZONE_GUARD_MODE
    else process.env.TRELLIS_ZONE_GUARD_MODE = originalEnv
  })

  it('defaults to advisory when env var is unset', () => {
    delete process.env.TRELLIS_ZONE_GUARD_MODE
    expect(getZoneGuardMode()).toBe('advisory')
  })

  it('recognises "strict" (case-insensitive, trimmed)', () => {
    process.env.TRELLIS_ZONE_GUARD_MODE = 'strict'
    expect(getZoneGuardMode()).toBe('strict')
    process.env.TRELLIS_ZONE_GUARD_MODE = '  STRICT  '
    expect(getZoneGuardMode()).toBe('strict')
  })

  it('recognises "off" for complete bypass', () => {
    process.env.TRELLIS_ZONE_GUARD_MODE = 'off'
    expect(getZoneGuardMode()).toBe('off')
  })

  it('falls back to advisory for unknown values (fail-safe)', () => {
    process.env.TRELLIS_ZONE_GUARD_MODE = 'enabled'
    expect(getZoneGuardMode()).toBe('advisory')
    process.env.TRELLIS_ZONE_GUARD_MODE = ''
    expect(getZoneGuardMode()).toBe('advisory')
  })
})

// ── zone-guard: mutationActionToGrantAction ────────────────────────────────

describe('mutationActionToGrantAction', () => {
  it('maps write-ish actions to WRITE', () => {
    expect(mutationActionToGrantAction('createNode')).toBe('WRITE')
    expect(mutationActionToGrantAction('updateNode')).toBe('WRITE')
    expect(mutationActionToGrantAction('link')).toBe('WRITE')
    expect(mutationActionToGrantAction('unlink')).toBe('WRITE')
  })

  it('maps deleteNode to DELETE for separate gating', () => {
    expect(mutationActionToGrantAction('deleteNode')).toBe('DELETE')
  })

  it('defaults unknown actions to WRITE (conservative)', () => {
    expect(mutationActionToGrantAction('purge')).toBe('WRITE')
    expect(mutationActionToGrantAction('anythingElse')).toBe('WRITE')
  })
})

// ── zone-guard: evaluateGrant ──────────────────────────────────────────────

function labContext(): ZoneGrantContext {
  return {
    zoneId: FOUNDER_LAB_ZONE_ID,
    zoneKind: 'lab',
    facilityId: FOUNDER_FACILITY_ID,
    ownerAgent: 'entity:founder',
    memberAgents: ['entity:founder'],
    publicRead: false,
    grants: [{ action: 'ALL', scope: { ownerOnly: true } }],
  }
}

function lobbyContext(): ZoneGrantContext {
  return {
    zoneId: FOUNDER_LOBBY_ZONE_ID,
    zoneKind: 'lobby',
    facilityId: FOUNDER_FACILITY_ID,
    ownerAgent: 'entity:founder',
    memberAgents: ['entity:founder'],
    publicRead: true,
    grants: [
      { action: 'READ', scope: { public: true } },
      { action: 'REQUEST_ACCESS', scope: {} },
    ],
  }
}

function workshopContext(): ZoneGrantContext {
  return {
    zoneId: FOUNDER_WORKSHOP_ZONE_ID,
    zoneKind: 'workshop',
    facilityId: FOUNDER_FACILITY_ID,
    ownerAgent: 'entity:founder',
    memberAgents: ['entity:founder', 'entity:alice'],
    publicRead: false,
    grants: [{ action: 'ALL', scope: { membersOnly: true } }],
  }
}

describe('evaluateGrant — owner short-circuit', () => {
  it('always allows the facility owner regardless of grants', () => {
    const ctx = labContext()
    const decision = evaluateGrant({ action: 'createNode', agentId: 'entity:founder' }, ctx)
    expect(decision.allowed).toBe(true)
    expect(decision.reason).toMatch(/owner/)
  })

  it('owner shortcut works even when grants would reject', () => {
    const ctx: ZoneGrantContext = { ...labContext(), grants: [] }
    const decision = evaluateGrant({ action: 'deleteNode', agentId: 'entity:founder' }, ctx)
    expect(decision.allowed).toBe(true)
  })
})

describe('evaluateGrant — Lab (ownerOnly)', () => {
  it('denies non-owner agents on the Lab', () => {
    const ctx = labContext()
    const decision = evaluateGrant({ action: 'createNode', agentId: 'entity:alice' }, ctx)
    expect(decision.allowed).toBe(false)
    expect(decision.reason).toMatch(/no grant/)
  })
})

describe('evaluateGrant — Lobby (public READ + REQUEST_ACCESS)', () => {
  // Note: the mutation event bus only emits WRITE/DELETE events, so the
  // Lobby's READ and REQUEST_ACCESS grants are not reachable through
  // evaluateGrant in practice. The tests below pin the WRITE behaviour
  // (which is what real mutations trigger) and leave direct READ/
  // REQUEST_ACCESS evaluation to a future grant-check API.
  it('denies a stranger trying to WRITE in the Lobby (no matching grant)', () => {
    const ctx = lobbyContext()
    const decision = evaluateGrant({ action: 'createNode', agentId: 'entity:stranger' }, ctx)
    expect(decision.allowed).toBe(false)
    expect(decision.reason).toMatch(/no grant/)
  })

  it('still allows the owner via the owner short-circuit', () => {
    const ctx = lobbyContext()
    const decision = evaluateGrant({ action: 'createNode', agentId: 'entity:founder' }, ctx)
    expect(decision.allowed).toBe(true)
    expect(decision.reason).toMatch(/owner/)
  })
})

describe('evaluateGrant — Workshop (ALL, membersOnly)', () => {
  it('allows listed members on any action', () => {
    const ctx = workshopContext()
    expect(evaluateGrant({ action: 'createNode', agentId: 'entity:alice' }, ctx).allowed).toBe(true)
    expect(evaluateGrant({ action: 'deleteNode', agentId: 'entity:alice' }, ctx).allowed).toBe(true)
  })

  it('denies non-members even on WRITE', () => {
    const ctx = workshopContext()
    const decision = evaluateGrant({ action: 'createNode', agentId: 'entity:bob' }, ctx)
    expect(decision.allowed).toBe(false)
  })
})

describe('evaluateGrant — unknown agent / empty grants', () => {
  it('denies everything when the grant list is empty and the agent is not the owner', () => {
    const ctx: ZoneGrantContext = {
      zoneId: 'entity:dead-zone',
      facilityId: FOUNDER_FACILITY_ID,
      ownerAgent: 'entity:founder',
      memberAgents: [],
      publicRead: false,
      grants: [],
    }
    const decision = evaluateGrant({ action: 'createNode', agentId: 'entity:alice' }, ctx)
    expect(decision.allowed).toBe(false)
    expect(decision.reason).toMatch(/no grant/)
  })
})

// ── zone-router: zoneForPath ───────────────────────────────────────────────

describe('zoneForPath', () => {
  it('maps /settings/integrations → Vault', () => {
    expect(zoneForPath('/settings/integrations').zoneId).toBe(FOUNDER_VAULT_ZONE_ID)
    expect(zoneForPath('/settings/integrations/new').zoneId).toBe(FOUNDER_VAULT_ZONE_ID)
  })

  it('maps /admin and /permits → Vault', () => {
    expect(zoneForPath('/admin').zoneId).toBe(FOUNDER_VAULT_ZONE_ID)
    expect(zoneForPath('/permits/123').zoneId).toBe(FOUNDER_VAULT_ZONE_ID)
  })

  it('maps /pages and /collections → Showroom', () => {
    expect(zoneForPath('/pages').zoneId).toBe(FOUNDER_SHOWROOM_ZONE_ID)
    expect(zoneForPath('/pages/about').zoneId).toBe(FOUNDER_SHOWROOM_ZONE_ID)
    expect(zoneForPath('/collections/demos').zoneId).toBe(FOUNDER_SHOWROOM_ZONE_ID)
  })

  it('maps /agent, /messages, /members, /workflows → Workshop', () => {
    expect(zoneForPath('/agent').zoneId).toBe(FOUNDER_WORKSHOP_ZONE_ID)
    expect(zoneForPath('/agent/').zoneId).toBe(FOUNDER_WORKSHOP_ZONE_ID)
    expect(zoneForPath('/messages/room-1').zoneId).toBe(FOUNDER_WORKSHOP_ZONE_ID)
    expect(zoneForPath('/members').zoneId).toBe(FOUNDER_WORKSHOP_ZONE_ID)
    expect(zoneForPath('/workflows').zoneId).toBe(FOUNDER_WORKSHOP_ZONE_ID)
  })

  it('maps /notifications, /help, /learn, /docs, /welcome, /onboarding → Lobby', () => {
    expect(zoneForPath('/notifications').zoneId).toBe(FOUNDER_LOBBY_ZONE_ID)
    expect(zoneForPath('/help').zoneId).toBe(FOUNDER_LOBBY_ZONE_ID)
    expect(zoneForPath('/learn').zoneId).toBe(FOUNDER_LOBBY_ZONE_ID)
    expect(zoneForPath('/docs/intro').zoneId).toBe(FOUNDER_LOBBY_ZONE_ID)
    expect(zoneForPath('/welcome').zoneId).toBe(FOUNDER_LOBBY_ZONE_ID)
    expect(zoneForPath('/onboarding').zoneId).toBe(FOUNDER_LOBBY_ZONE_ID)
    expect(zoneForPath('/invite/xyz').zoneId).toBe(FOUNDER_LOBBY_ZONE_ID)
  })

  it('falls back to the Lab for workspace / home / unknown paths', () => {
    expect(zoneForPath('/workspace/tasks').zoneId).toBe(FOUNDER_LAB_ZONE_ID)
    expect(zoneForPath('/home').zoneId).toBe(FOUNDER_LAB_ZONE_ID)
    expect(zoneForPath('/ontologies').zoneId).toBe(FOUNDER_LAB_ZONE_ID)
    expect(zoneForPath('/').zoneId).toBe(FOUNDER_LAB_ZONE_ID)
    expect(zoneForPath('/nonexistent/path').zoneId).toBe(FOUNDER_LAB_ZONE_ID)
  })

  it('always stamps the founder Facility id and tags the source', () => {
    const r = zoneForPath('/pages/about')
    expect(r.facilityId).toBe(FOUNDER_FACILITY_ID)
    expect(r.source).toBe('route')

    const fallback = zoneForPath('/workspace/x')
    expect(fallback.source).toBe('default')
  })
})

// ── campus-decisions: shouldCaptureDecision ────────────────────────────────

function captureInput(overrides: Partial<CaptureInput> = {}): CaptureInput {
  return {
    action: 'createNode',
    agentId: 'entity:alice',
    zoneId: FOUNDER_WORKSHOP_ZONE_ID,
    facilityId: FOUNDER_FACILITY_ID,
    entityId: 'entity:some-thing',
    entityType: 'task',
    toolInput: { foo: 'bar' },
    ...overrides,
  }
}

describe('shouldCaptureDecision', () => {
  it('returns false when captureRequested is false', () => {
    expect(shouldCaptureDecision(captureInput(), false)).toBe(false)
  })

  it('returns true for an agent mutation with capture requested', () => {
    expect(shouldCaptureDecision(captureInput(), true)).toBe(true)
  })

  it('filters out system agents (decision-capture, migration, notifier, browser, empty)', () => {
    for (const agentId of ['decision-capture', 'campus-migration', 'graph-notifier', 'system', 'browser', '']) {
      expect(shouldCaptureDecision(captureInput({ agentId }), true)).toBe(false)
    }
  })

  it('prevents recursion by skipping mutations that target a decision entity', () => {
    expect(shouldCaptureDecision(captureInput({ entityType: 'decision' }), true)).toBe(false)
  })
})

// ── campus-decisions: buildDecisionData ────────────────────────────────────

describe('buildDecisionData', () => {
  it('generates a stable-ish id prefixed with entity:decision-<action>', () => {
    const { decisionId } = buildDecisionData(captureInput())
    expect(decisionId.startsWith('entity:decision-createNode-')).toBe(true)
  })

  it('populates the core Decision fields', () => {
    const { data } = buildDecisionData(captureInput())
    expect(data.type).toBe('decision')
    expect(data.byAgent).toBe('entity:alice')
    expect(data.inZone).toBe(FOUNDER_WORKSHOP_ZONE_ID)
    expect(data.zoneId).toBe(FOUNDER_WORKSHOP_ZONE_ID)
    expect(data.facilityId).toBe(FOUNDER_FACILITY_ID)
    expect(data.outcome).toBe('executed')
    expect(data.toolName).toBe('api/graph/mutate')
    expect(typeof data.toolInput).toBe('string') // JSON-stringified
    expect(JSON.parse(data.toolInput)).toEqual({ foo: 'bar' })
  })

  it('sets producesArtifact only when creating an artifact', () => {
    const artifact = buildDecisionData(captureInput({ entityType: 'artifact', entityId: 'entity:art-1' }))
    expect(artifact.data.producesArtifact).toBe('entity:art-1')

    const task = buildDecisionData(captureInput({ entityType: 'task', entityId: 'entity:task-1' }))
    expect(task.data.producesArtifact).toBeUndefined()
  })

  it('includes the action + entity id in the title for readability', () => {
    const { data } = buildDecisionData(captureInput({ action: 'deleteNode', entityId: 'entity:foo' }))
    expect(data.title).toContain('deleteNode')
    expect(data.title).toContain('entity:foo')
  })

  it('sanitises the entity id when forging the decision id (no colons leaking in)', () => {
    const { decisionId } = buildDecisionData(captureInput({ entityId: 'entity:weird:id/with!chars' }))
    // The colon prefix gets stripped; other non-[a-z0-9-] characters become '-'
    expect(decisionId).not.toContain(':weird:')
    expect(decisionId).not.toContain('/')
    expect(decisionId).not.toContain('!')
  })
})
