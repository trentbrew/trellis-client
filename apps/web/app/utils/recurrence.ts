import type { RecurrenceRule } from '~/types/entity'

// ── Human-readable recurrence labels ─────────────────────────────────────────

/**
 * Returns a short human-readable description of a RecurrenceRule.
 * Examples: "Repeats daily", "Repeats weekly until Jan 1, 2027", "Repeats every 2 weeks"
 */
export function formatRecurrenceLabel(rule: RecurrenceRule): string {
  if (!rule) return ''

  const { frequency, interval = 1, endDate, occurrences, weekdays } = rule

  let base = ''

  switch (frequency) {
    case 'daily':
      base = interval === 1 ? 'Repeats daily' : `Repeats every ${interval} days`
      break
    case 'weekly':
      if (weekdays?.length) {
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
        const days = weekdays
          .map((d) => dayNames[d] ?? '')
          .filter(Boolean)
          .join(', ')
        base = `Repeats weekly on ${days}`
      } else {
        base = interval === 1 ? 'Repeats weekly' : `Repeats every ${interval} weeks`
      }
      break
    case 'monthly':
      base = interval === 1 ? 'Repeats monthly' : `Repeats every ${interval} months`
      break
    case 'quarterly':
      base = 'Repeats quarterly'
      break
    case 'yearly':
      base = interval === 1 ? 'Repeats yearly' : `Repeats every ${interval} years`
      break
    case 'weekdays':
      base = 'Repeats on weekdays'
      break
    case 'custom':
      base = 'Repeats (custom)'
      break
    default:
      base = 'Repeats'
  }

  if (endDate) {
    const formatted = _formatShortDate(endDate)
    base += ` until ${formatted}`
  } else if (occurrences) {
    base += ` · ${occurrences} times`
  }

  return base
}

function _formatShortDate(dateStr: string): string {
  try {
    const d = new Date(`${dateStr}T00:00:00`)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return dateStr
  }
}

// ── Infer recurrence from a list of date strings ──────────────────────────────

/**
 * Given a sorted array of ISO date strings (YYYY-MM-DD), infers the recurrence
 * pattern and returns a label + the last date as the "until" date.
 *
 * Used for GCal recurring event instances where we don't store the master rule.
 */
export function inferRecurrenceFromDates(dates: string[]): { label: string; endDate?: string } {
  const sorted = [...dates].filter(Boolean).sort()
  if (sorted.length < 2) return { label: 'Recurring event', endDate: sorted[0] ?? undefined }

  const endDate = sorted[sorted.length - 1] ?? undefined
  if (!endDate) return { label: 'Recurring event' }

  // Compute the gaps between consecutive dates in days
  const gaps: number[] = []
  for (let i = 1; i < sorted.length; i++) {
    const a = new Date(`${sorted[i - 1]}T00:00:00`)
    const b = new Date(`${sorted[i]}T00:00:00`)
    const diffDays = Math.round((b.getTime() - a.getTime()) / 86_400_000)
    if (diffDays > 0) gaps.push(diffDays)
  }

  if (gaps.length === 0) return { label: 'Recurring event', endDate }

  // Modal gap (most common interval)
  const gapFreq = new Map<number, number>()
  for (const g of gaps) gapFreq.set(g, (gapFreq.get(g) ?? 0) + 1)
  const modalGap = [...gapFreq.entries()].sort((a, b) => b[1] - a[1])[0]![0]

  let label = 'Recurring event'
  if (modalGap === 1) {
    label = 'Repeats daily'
  } else if (modalGap === 7) {
    label = 'Repeats weekly'
  } else if (modalGap === 14) {
    label = 'Repeats every 2 weeks'
  } else if (modalGap >= 28 && modalGap <= 31) {
    label = 'Repeats monthly'
  } else if (modalGap >= 90 && modalGap <= 92) {
    label = 'Repeats quarterly'
  } else if (modalGap >= 365 && modalGap <= 366) {
    label = 'Repeats yearly'
  } else if (modalGap < 7) {
    label = `Repeats every ${modalGap} days`
  } else {
    label = `Repeats every ${Math.round(modalGap / 7)} weeks`
  }

  const formatted = _formatShortDate(endDate)
  label += ` until ${formatted}`

  return { label, endDate }
}

// ── Recurring entity deduplication ───────────────────────────────────────────

/**
 * Resolves the recurring series key for an entity.
 *
 * For GCal-synced entities: uses the stored `recurringEventId` field, or falls
 * back to inferring it from the `googleEventId` (recurring instances have IDs
 * of the form `<masterEventId>_<dateStamp>`).
 *
 * Returns null for non-recurring entities.
 */
export function getRecurringSeriesKey(entity: Record<string, any>): string | null {
  if (entity.recurringEventId) return String(entity.recurringEventId)
  if (entity.googleEventId && String(entity.googleEventId).includes('_')) {
    return String(entity.googleEventId).split('_')[0]!
  }
  return null
}

/**
 * Deduplicates entities that are instances of the same recurring series.
 *
 * Grouping key: `recurringEventId` or the master portion of `googleEventId`.
 *
 * For each group the "canonical" instance is selected as:
 *   1. The nearest upcoming occurrence (startDate >= today)
 *   2. Or, if all are past, the most recent one
 *
 * The canonical entity is annotated with virtual display metadata:
 *   - `_recurringInstanceCount` — total number of instances in the series
 *   - `_recurringLabel` — human-readable recurrence description
 *
 * Non-recurring entities are returned unchanged.
 */
export function deduplicateRecurringEntities<T extends Record<string, any>>(entities: T[]): T[] {
  const groups = new Map<string, T[]>()
  const nonRecurring: T[] = []

  for (const entity of entities) {
    const key = getRecurringSeriesKey(entity)
    if (key) {
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(entity)
    } else {
      nonRecurring.push(entity)
    }
  }

  if (groups.size === 0) return entities

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const deduped: T[] = []

  for (const [, instances] of groups) {
    const sorted = [...instances].sort((a, b) => {
      const da = new Date(`${a.startDate ?? ''}T00:00:00`).getTime()
      const db = new Date(`${b.startDate ?? ''}T00:00:00`).getTime()
      return da - db
    })

    // Pick nearest upcoming; fall back to most recent past
    const canonical =
      sorted.find((i) => new Date(`${i.startDate ?? ''}T00:00:00`) >= today) ?? sorted[sorted.length - 1]!

    // Build display metadata
    const allDates = sorted.map((i) => i.startDate as string).filter(Boolean)
    const { label } = inferRecurrenceFromDates(allDates)

    const annotated = {
      ...canonical,
      _recurringInstanceCount: instances.length,
      _recurringLabel: label,
    }

    deduped.push(annotated as T)
  }

  return [...nonRecurring, ...deduped]
}
