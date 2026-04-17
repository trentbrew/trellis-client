/**
 * Minimal cron expression matcher.
 *
 * Supports the standard 5-field cron format:
 *
 *   ┌── minute        (0-59)
 *   │ ┌── hour        (0-23)
 *   │ │ ┌── day-of-month (1-31)
 *   │ │ │ ┌── month     (1-12)
 *   │ │ │ │ ┌── day-of-week (0-6, Sunday = 0 or 7)
 *   * * * * *
 *
 * Each field accepts:
 *   - `*` wildcard
 *   - `N` fixed value
 *   - `A-B` inclusive range
 *   - `A,B,C` value list (mix-and-matchable with ranges)
 *   - `* /N` or `A-B/N` step
 *
 * Intended for the workflow scheduler — not a general-purpose cron runtime.
 * No timezone support yet; assumes the tick is in local server time.
 */

export interface ParsedCron {
  minute: Set<number>
  hour: Set<number>
  dayOfMonth: Set<number>
  month: Set<number>
  dayOfWeek: Set<number>
  raw: string
}

const RANGES: Record<string, [number, number]> = {
  minute: [0, 59],
  hour: [0, 23],
  dayOfMonth: [1, 31],
  month: [1, 12],
  dayOfWeek: [0, 6],
}

type FieldName = 'minute' | 'hour' | 'dayOfMonth' | 'month' | 'dayOfWeek'

function parseField(expr: string, field: FieldName): Set<number> {
  const [min, max] = RANGES[field]!
  const out = new Set<number>()
  const parts = expr.split(',')

  for (const part of parts) {
    const [rangeStr, stepStr] = part.split('/')
    const step = stepStr ? Math.max(1, Number(stepStr)) : 1
    if (!Number.isFinite(step)) throw new Error(`bad step in "${expr}"`)

    let lo = min
    let hi = max
    if (rangeStr && rangeStr !== '*') {
      const [a, b] = rangeStr.split('-').map((x) => Number(x))
      if (!Number.isFinite(a)) throw new Error(`bad value "${rangeStr}" in "${expr}"`)
      lo = a!
      hi = Number.isFinite(b) ? b! : a!
    }

    // Normalize Sunday = 7 → 0 for dayOfWeek
    if (field === 'dayOfWeek') {
      if (lo === 7) lo = 0
      if (hi === 7) hi = 0
    }

    if (lo < min || hi > max || lo > hi) {
      throw new Error(`"${rangeStr}" out of range for ${field} (${min}-${max})`)
    }

    for (let v = lo; v <= hi; v += step) out.add(v)
  }

  return out
}

export function parseCron(expr: string): ParsedCron {
  const trimmed = expr.trim()
  if (!trimmed) throw new Error('empty cron expression')

  const fields = trimmed.split(/\s+/)
  if (fields.length !== 5) {
    throw new Error(`cron expression must have 5 fields, got ${fields.length}`)
  }

  const [m, h, dom, mo, dow] = fields

  return {
    minute: parseField(m!, 'minute'),
    hour: parseField(h!, 'hour'),
    dayOfMonth: parseField(dom!, 'dayOfMonth'),
    month: parseField(mo!, 'month'),
    dayOfWeek: parseField(dow!, 'dayOfWeek'),
    raw: trimmed,
  }
}

/**
 * Check whether a cron expression fires at the given Date.
 *
 * Cron quirk: if both `dayOfMonth` and `dayOfWeek` are restricted (not `*`),
 * the job fires when **either** matches. We approximate that here by treating
 * any non-full `Set` as restricted.
 */
export function cronMatches(parsed: ParsedCron, date: Date): boolean {
  const minute = date.getMinutes()
  const hour = date.getHours()
  const dom = date.getDate()
  const month = date.getMonth() + 1
  const dow = date.getDay() // 0=Sunday

  if (!parsed.minute.has(minute)) return false
  if (!parsed.hour.has(hour)) return false
  if (!parsed.month.has(month)) return false

  const domFull = parsed.dayOfMonth.size === 31
  const dowFull = parsed.dayOfWeek.size === 7
  const domOk = parsed.dayOfMonth.has(dom)
  const dowOk = parsed.dayOfWeek.has(dow)

  if (domFull && dowFull) return true
  if (domFull) return dowOk
  if (dowFull) return domOk
  return domOk || dowOk
}

/** Convenience wrapper. */
export function isCronDue(expr: string, date: Date = new Date()): boolean {
  try {
    return cronMatches(parseCron(expr), date)
  } catch {
    return false
  }
}
