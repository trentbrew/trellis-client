/**
 * Tests for server/utils/notification-email.ts
 *
 * Covers the core dispatcher logic:
 *   - Pref gating (master switch, per-type muting, default-email types)
 *   - Template selection per notification type
 *   - Subject formatting (incl. org prefix)
 *   - Skip reasons when dispatch is blocked
 *
 * All tests run against the pure helpers exposed via `__testables` so no
 * InstantDB admin SDK mocking is required.
 */

import { describe, it, expect } from 'vitest'
import { __testables } from '../../server/utils/notification-email'

const { DEFAULT_EMAIL_TYPES, shouldDispatchEmail, pickSubject, pickHtml } = __testables

describe('DEFAULT_EMAIL_TYPES', () => {
  it('includes the conservative set only', () => {
    expect([...DEFAULT_EMAIL_TYPES].sort()).toEqual(
      [
        'invite_accepted',
        'member_joined',
        'mention',
        'comment',
        'entity_updated',
        'workflow_failed',
      ].sort(),
    )
  })

  it('does NOT include new_message by default (chat is in-app-first)', () => {
    expect(DEFAULT_EMAIL_TYPES.has('new_message')).toBe(false)
  })

  it('does NOT include workflow_completed by default (only failures notify)', () => {
    expect(DEFAULT_EMAIL_TYPES.has('workflow_completed')).toBe(false)
  })
})

describe('shouldDispatchEmail', () => {
  const basePrefs = { emailEnabled: true, emailMutedTypes: [] as string[] }

  it('sends for a default type when master is on', () => {
    expect(shouldDispatchEmail('mention', basePrefs)).toBe(true)
    expect(shouldDispatchEmail('comment', basePrefs)).toBe(true)
    expect(shouldDispatchEmail('workflow_failed', basePrefs)).toBe(true)
  })

  it('blocks when master switch is off', () => {
    expect(shouldDispatchEmail('mention', { emailEnabled: false, emailMutedTypes: [] })).toBe(false)
  })

  it('blocks when type is in emailMutedTypes', () => {
    expect(
      shouldDispatchEmail('mention', { emailEnabled: true, emailMutedTypes: ['mention'] }),
    ).toBe(false)
  })

  it('blocks for types not in DEFAULT_EMAIL_TYPES (opt-in required)', () => {
    expect(shouldDispatchEmail('new_message', basePrefs)).toBe(false)
    expect(shouldDispatchEmail('workflow_completed', basePrefs)).toBe(false)
    expect(shouldDispatchEmail('system', basePrefs)).toBe(false)
  })

  it('blocks unknown types', () => {
    expect(shouldDispatchEmail('some_random_type', basePrefs)).toBe(false)
  })
})

describe('pickSubject', () => {
  const base = { recipientId: 'u1', type: 'mention', title: 'Q3 Plan', message: 'hi' }

  it('prefixes with [orgName] when provided', () => {
    expect(pickSubject({ ...base, orgName: 'Acme' })).toMatch(/^\[Acme\]/)
  })

  it('renders mention subject with actor name', () => {
    const s = pickSubject({ ...base, type: 'mention', actorName: 'Bob' })
    expect(s).toContain('Bob')
    expect(s.toLowerCase()).toContain('mention')
  })

  it('prefixes workflow_failed with "Workflow failed:"', () => {
    const s = pickSubject({ ...base, type: 'workflow_failed', title: 'nightly-sync' })
    expect(s).toContain('Workflow failed: nightly-sync')
  })

  it('prefixes workflow_completed with "Workflow completed:"', () => {
    const s = pickSubject({ ...base, type: 'workflow_completed', title: 'sync-docs' })
    expect(s).toContain('Workflow completed: sync-docs')
  })

  it('falls back to the notification title for unknown types', () => {
    expect(pickSubject({ ...base, type: 'system', title: 'Heads up' })).toContain('Heads up')
  })
})

describe('pickHtml — template selection', () => {
  const base = {
    recipientId: 'u1',
    type: '',
    title: 'A thing',
    message: 'Something happened',
    actionUrl: 'https://app.trellis.app/x',
  }

  it('mention → mention template (mentions actor + entity)', () => {
    const html = pickHtml({ ...base, type: 'mention', actorName: 'Alice', title: 'Q3' })
    expect(html).toContain('Alice')
    expect(html.toLowerCase()).toContain('mentioned')
  })

  it('comment → comment template (includes snippet)', () => {
    const html = pickHtml({
      ...base,
      type: 'comment',
      message: 'Alice: great progress',
      metadata: { entityTitle: 'Sprint Review' },
    })
    expect(html).toContain('great progress')
    expect(html).toContain('Sprint Review')
  })

  it('entity_updated → assigned template', () => {
    const html = pickHtml({
      ...base,
      type: 'entity_updated',
      actorName: 'Dana',
      metadata: { entityTitle: 'Fix bug #123' },
    })
    expect(html).toContain('Fix bug #123')
    expect(html).toContain('Dana')
  })

  it('workflow_failed → workflow-failed template with error block', () => {
    const html = pickHtml({
      ...base,
      type: 'workflow_failed',
      title: 'nightly-sync',
      metadata: { error: 'ECONNREFUSED', runId: 'run-1', workflowName: 'nightly-sync' },
    })
    expect(html).toContain('nightly-sync')
    expect(html).toContain('ECONNREFUSED')
    expect(html).toContain('run-1')
  })

  it('workflow_completed → workflow-completed template with step count', () => {
    const html = pickHtml({
      ...base,
      type: 'workflow_completed',
      title: 'sync-docs',
      metadata: { stepCount: 5, durationMs: 2400, workflowName: 'sync-docs' },
    })
    expect(html).toContain('sync-docs')
    expect(html).toMatch(/5 steps/)
  })

  it('unknown type → generic notification template using title/message', () => {
    const html = pickHtml({
      ...base,
      type: 'system',
      title: 'Scheduled maintenance',
      message: 'We will be offline at midnight.',
    })
    expect(html).toContain('Scheduled maintenance')
    expect(html).toContain('We will be offline at midnight.')
  })

  it('escapes HTML in user-supplied strings (generic template)', () => {
    const html = pickHtml({
      ...base,
      type: 'system',
      title: '<script>alert(1)</script>',
      message: '<img src=x>',
    })
    expect(html).not.toContain('<script>alert(1)</script>')
    expect(html).not.toContain('<img src=x>')
    expect(html).toContain('&lt;script&gt;')
  })
})
