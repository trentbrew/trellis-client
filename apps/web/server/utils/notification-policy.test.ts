// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest'
import {
  admitNotification,
  inferDelivery,
  recordNotificationOutcome,
  resetNotificationPolicyState,
  INTERRUPT_WINDOW_MS,
} from './notification-policy'
import type { CreateNotificationInput } from '../../app/types/notification'

const base: CreateNotificationInput = {
  title: 'Test',
  kind: 'info',
  source: 'graph',
}

describe('inferDelivery', () => {
  it('defaults low-priority info to passive', () => {
    const r = inferDelivery({ ...base, priority: 'low' })
    expect(r.delivery).toBe('passive')
    expect(r.requiredAction).toBe('none')
  })

  it('critical priority infers interrupt + navigate', () => {
    const r = inferDelivery({ ...base, priority: 'critical' })
    expect(r.delivery).toBe('interrupt')
    expect(r.requiredAction).toBe('navigate')
  })

  it('high priority with non-dismiss CTA infers interrupt', () => {
    const r = inferDelivery({
      ...base,
      priority: 'high',
      actions: [{ id: 'open', kind: 'link', label: 'Open', target: '/mail' }],
    })
    expect(r.delivery).toBe('interrupt')
    expect(r.requiredAction).toBe('navigate')
  })

  it('respects explicit delivery', () => {
    const r = inferDelivery({ ...base, delivery: 'passive', requiredAction: 'none' })
    expect(r.delivery).toBe('passive')
    expect(r.requiredAction).toBe('none')
  })
})

describe('admitNotification rate limit', () => {
  beforeEach(() => resetNotificationPolicyState())

  it('allows first interrupt', () => {
    const r = admitNotification({
      ...base,
      delivery: 'interrupt',
      requiredAction: 'acknowledge',
      groupKey: 'g1',
    })
    expect(r.delivery).toBe('interrupt')
  })

  it('downgrades second interrupt in same window', () => {
    const input = {
      ...base,
      delivery: 'interrupt' as const,
      requiredAction: 'acknowledge' as const,
      groupKey: 'g1',
    }
    expect(admitNotification(input).delivery).toBe('interrupt')
    expect(admitNotification(input).delivery).toBe('passive')
  })

  it('critical bypasses rate limit', () => {
    const input = {
      ...base,
      delivery: 'interrupt' as const,
      priority: 'critical' as const,
      groupKey: 'g1',
    }
    expect(admitNotification(input).delivery).toBe('interrupt')
    expect(admitNotification(input).delivery).toBe('interrupt')
  })
})

describe('earned interrupt downgrade', () => {
  beforeEach(() => resetNotificationPolicyState())

  it('bans source after enough dismissals', () => {
    const source = 'noisy-source' as 'graph'
    for (let i = 0; i < 5; i++) {
      admitNotification({
        ...base,
        source,
        delivery: 'interrupt',
        groupKey: `k${i}`,
      })
      recordNotificationOutcome(source, 'dismissed')
    }
    const r = admitNotification({
      ...base,
      source,
      delivery: 'interrupt',
      groupKey: 'after-ban',
    })
    expect(r.delivery).toBe('passive')
  })
})

describe('constants', () => {
  it('uses 10 minute interrupt window', () => {
    expect(INTERRUPT_WINDOW_MS).toBe(10 * 60 * 1000)
  })
})
