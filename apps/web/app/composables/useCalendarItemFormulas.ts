import type { CalendarItem, Priority, Urgency, FormulaField } from '~/types/calendarItem'

/**
 * Default formula for auto-computing priority based on date proximity and category.
 * Returns Priority: 'critical' | 'high' | 'medium' | 'low'
 */
const computeDefaultPriority = (item: CalendarItem): Priority => {
  const now = new Date()
  const start = item.startDate ? new Date(item.startDate) : null
  if (!start) return 'medium'

  const daysUntil = Math.ceil((start.getTime() - now.getTime()) / 86_400_000)

  if (daysUntil < 0) return 'critical'
  if (daysUntil <= 1) return 'high'
  if (daysUntil <= 7) return 'medium'
  return 'low'
}

/**
 * Default formula for auto-computing urgency based on time-sensitivity.
 * Returns Urgency: 'urgent' | 'not-urgent'
 */
const computeDefaultUrgency = (item: CalendarItem): Urgency => {
  const now = new Date()
  const start = item.startDate ? new Date(item.startDate) : null
  if (!start) return 'not-urgent'

  const daysUntil = Math.ceil((start.getTime() - now.getTime()) / 86_400_000)

  if (item.category === 'deadline' || daysUntil <= 2) return 'urgent'
  if (daysUntil < 0) return 'urgent'
  return 'not-urgent'
}

/**
 * Safely evaluate a user-defined formula expression against an item's properties.
 * Returns the result or undefined if evaluation fails.
 */
const evaluateFormula = (expression: string, item: CalendarItem): unknown => {
  try {
    const fn = new Function(...Object.keys(item), `return (${expression})`)
    return fn(...Object.values(item))
  } catch {
    return undefined
  }
}

/**
 * Composable for auto-computing priority, urgency, and custom formula fields
 * on CalendarItem instances. Values are reactive and update when the item changes.
 *
 * Priority and urgency auto-compute from default formulas unless the user
 * has set an override (priorityOverride / urgencyOverride flags).
 */
export const useCalendarItemFormulas = () => {
  /**
   * Compute effective priority for an item.
   * If the user has overridden priority, returns their value as-is.
   * Otherwise, applies the default date-proximity formula.
   */
  const getEffectivePriority = (item: CalendarItem): Priority => {
    if (item.priorityOverride) return item.priority
    return computeDefaultPriority(item)
  }

  /**
   * Compute effective urgency for an item.
   * If the user has overridden urgency, returns their value as-is.
   * Otherwise, applies the default time-sensitivity formula.
   */
  const getEffectiveUrgency = (item: CalendarItem): Urgency => {
    if (item.urgencyOverride) return item.urgency
    return computeDefaultUrgency(item)
  }

  /**
   * Evaluate all custom formula fields on an item and return updated results.
   */
  const evaluateFormulas = (item: CalendarItem): FormulaField[] => {
    if (!item.formulas?.length) return []
    return item.formulas.map((f) => ({
      ...f,
      result: evaluateFormula(f.expression, item),
    }))
  }

  /**
   * Apply all auto-computations to an item (mutates in place for reactivity).
   * Call this whenever the item's scheduling or classification properties change.
   */
  const applyFormulas = (item: CalendarItem): void => {
    if (!item.priorityOverride) {
      item.priority = computeDefaultPriority(item)
    }
    if (!item.urgencyOverride) {
      item.urgency = computeDefaultUrgency(item)
    }
    if (item.formulas?.length) {
      item.formulas = evaluateFormulas(item)
    }
  }

  return {
    getEffectivePriority,
    getEffectiveUrgency,
    evaluateFormulas,
    applyFormulas,
    computeDefaultPriority,
    computeDefaultUrgency,
  }
}
