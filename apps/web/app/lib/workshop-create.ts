import { entityId } from './tql-namespace'

export const WORKSHOP_ZONE_ID = 'entity:founder-facility-workshop'
export const FOUNDER_FACILITY_ID = 'entity:founder-facility'

function slugifyTitle(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'untitled'
}

export function uniqueWorkshopSlug(prefix: 'deck' | 'sheet' | 'canvas', title: string, takenIds: Iterable<string>): string {
  const taken = new Set(takenIds)
  const base = slugifyTitle(title)
  const baseId = entityId(`${prefix}-${base}`)
  if (!taken.has(baseId)) return base
  let n = 1
  while (taken.has(entityId(`${prefix}-${base}-${n}`))) n += 1
  return `${base}-${n}`
}
