/**
 * TQL Seed Data
 *
 * Server-side seed items for first boot.
 * Re-exports from the canonical client-side personalSeedData.ts.
 */

// Re-use the canonical client-side seed data to avoid drift
import { getPersonalSeedItems as _getClientSeed, getTrellisProjectTasks as _getProjectTasks } from '../../app/lib/personalSeedData'
import { getPeopleSeedItems as _getPeople, getOrganizationSeedItems as _getOrgs, getFileSeedItems as _getFiles, getProjectSeedItems as _getProjects } from '../../app/lib/entitySeedData'

export type { SeedCalendarItem } from '../../app/lib/personalSeedData'

export function getPersonalSeedItems() {
  return _getClientSeed()
}

export function getTrellisProjectTasks() {
  return _getProjectTasks()
}

export function getPeopleSeedItems() {
  return _getPeople()
}

export function getOrganizationSeedItems() {
  return _getOrgs()
}

export function getFileSeedItems() {
  return _getFiles()
}

export function getProjectSeedItems() {
  return _getProjects()
}
