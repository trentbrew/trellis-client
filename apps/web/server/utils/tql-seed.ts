/**
 * TQL Seed Data
 *
 * Server-side seed items for first boot.
 * Re-exports from the canonical client-side personalSeedData.ts.
 */

// Re-use the canonical client-side seed data to avoid drift
import { getPersonalSeedItems as _getClientSeed } from '../../app/lib/personalSeedData'

export type { SeedCalendarItem } from '../../app/lib/personalSeedData'

export function getPersonalSeedItems() {
  return _getClientSeed()
}
