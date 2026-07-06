/**
 * EEMUA-inspired notification admission control.
 *
 * Pure policy + in-memory rate/earned-interrupt state (P0).
 */

import type { CreateNotificationInput, NotificationAction, NotificationRequiredAction, NotificationDelivery } from '../../app/types/notification'

export const INTERRUPT_WINDOW_MS = 10 * 60 * 1000
export const MAX_INTERRUPTS_PER_WINDOW = 1
const EARNED_IGNORE_RATIO = 0.8
const EARNED_MIN_EMITTED = 5
const EARNED_BAN_MS = 24 * 60 * 60 * 1000

interface RateLimitEntry {
  timestamps: number[]
}

interface SourceStats {
  emitted: number
  ignored: number
  bannedUntil?: number
}

const rateLimits = new Map<string, RateLimitEntry>()
const sourceStats = new Map<string, SourceStats>()

/** Test-only reset */
export function resetNotificationPolicyState(): void {
  rateLimits.clear()
  sourceStats.clear()
}

function rateKey(source: string, groupKey?: string, sourceId?: string): string {
  return `${source}:${groupKey ?? sourceId ?? 'default'}`
}

function hasNonDismissAction(actions?: NotificationAction[]): boolean {
  return (actions?.length ?? 0) > 0 && actions!.some((a) => a.kind !== 'dismiss')
}

export function inferDelivery(input: CreateNotificationInput): {
  delivery: NotificationDelivery
  requiredAction: NotificationRequiredAction
} {
  if (input.delivery) {
    return {
      delivery: input.delivery,
      requiredAction:
        input.requiredAction ?? (input.delivery === 'interrupt' ? 'acknowledge' : 'none'),
    }
  }

  const priority = input.priority || 'normal'
  if (priority === 'critical') {
    return { delivery: 'interrupt', requiredAction: input.requiredAction ?? 'navigate' }
  }
  if (priority === 'high' && hasNonDismissAction(input.actions)) {
    return { delivery: 'interrupt', requiredAction: input.requiredAction ?? 'navigate' }
  }
  return { delivery: 'passive', requiredAction: input.requiredAction ?? 'none' }
}

function isSourceBanned(source: string, now: number): boolean {
  const stats = sourceStats.get(source)
  if (!stats?.bannedUntil) return false
  if (now >= stats.bannedUntil) {
    delete stats.bannedUntil
    return false
  }
  return true
}

function isRateLimited(
  source: string,
  groupKey: string | undefined,
  sourceId: string | undefined,
  now: number,
): boolean {
  const key = rateKey(source, groupKey, sourceId)
  const entry = rateLimits.get(key)
  if (!entry) return false
  entry.timestamps = entry.timestamps.filter((t) => now - t < INTERRUPT_WINDOW_MS)
  return entry.timestamps.length >= MAX_INTERRUPTS_PER_WINDOW
}

function recordInterruptEmit(
  source: string,
  groupKey: string | undefined,
  sourceId: string | undefined,
  now: number,
): void {
  const key = rateKey(source, groupKey, sourceId)
  let entry = rateLimits.get(key)
  if (!entry) {
    entry = { timestamps: [] }
    rateLimits.set(key, entry)
  }
  entry.timestamps.push(now)
  entry.timestamps = entry.timestamps.filter((t) => now - t < INTERRUPT_WINDOW_MS)

  let stats = sourceStats.get(source)
  if (!stats) {
    stats = { emitted: 0, ignored: 0 }
    sourceStats.set(source, stats)
  }
  stats.emitted++
  maybeBanSource(source, stats, now)
}

function maybeBanSource(source: string, stats: SourceStats, now: number): void {
  if (stats.emitted < EARNED_MIN_EMITTED) return
  if (stats.ignored / stats.emitted < EARNED_IGNORE_RATIO) return
  stats.bannedUntil = now + EARNED_BAN_MS
  sourceStats.set(source, stats)
}

/**
 * Normalize delivery + requiredAction and apply rate limits / earned downgrade.
 */
export function admitNotification(input: CreateNotificationInput, now = Date.now()): CreateNotificationInput {
  let { delivery, requiredAction } = inferDelivery(input)

  if (delivery === 'interrupt') {
    if (isSourceBanned(input.source, now)) {
      delivery = 'passive'
      requiredAction = 'none'
    } else if (input.priority !== 'critical' && isRateLimited(input.source, input.groupKey, input.sourceId, now)) {
      console.warn(`[notification-policy] rate-limited interrupt → passive (${input.source})`)
      delivery = 'passive'
      requiredAction = 'none'
    } else {
      recordInterruptEmit(input.source, input.groupKey, input.sourceId, now)
    }
  }

  return {
    ...input,
    delivery,
    requiredAction,
    priority: input.priority || 'normal',
  }
}

export function recordNotificationOutcome(
  source: string,
  outcome: 'acted' | 'dismissed',
  now = Date.now(),
): void {
  if (outcome !== 'dismissed') return
  let stats = sourceStats.get(source)
  if (!stats) {
    stats = { emitted: 0, ignored: 0 }
    sourceStats.set(source, stats)
  }
  stats.ignored++
  maybeBanSource(source, stats, now)
}
