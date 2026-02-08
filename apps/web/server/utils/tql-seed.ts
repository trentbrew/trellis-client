/**
 * TQL Seed Data
 *
 * Server-side seed items for first boot.
 * Re-exports from the canonical client-side personalSeedData.ts.
 */

// Re-use the canonical client-side seed data to avoid drift
import { getPersonalSeedItems as _getClientSeed, getTrellisProjectTasks as _getProjectTasks } from '../../app/lib/personalSeedData'

export type { SeedCalendarItem } from '../../app/lib/personalSeedData'

export function getPersonalSeedItems() {
  return _getClientSeed()
}

export function getTrellisProjectTasks() {
  return _getProjectTasks()
}
