/**
 * Campus substrate migration — entity-level zone backfill (slice 0.7).
 *
 * Slices 0.3 and 0.5 tagged every MutationEvent with a zoneId. This
 * slice copies that idea down to the entities themselves: each entity
 * gets a `zoneId` and `facilityId` attribute recording where it lives.
 *
 * Why: enables zone-aware queries without replaying the op log.
 *   e.g. FIND entity AS ?e WHERE ?e.zoneId = "entity:founder-facility-lab"
 *
 * Behaviour:
 *   1. Scan the EAV store for every entity (anything with an @id that
 *      starts with `entity:` and has a `type` fact).
 *   2. Skip entities that already carry a zoneId (idempotent).
 *   3. Skip Campus substrate entities themselves (facility/zone/agent/
 *      wallet — they are the substrate, they don't live inside zones).
 *      Decisions and Artifacts DO belong in zones, so they are backfilled.
 *   4. For everything else, update with zoneId = founder Lab.
 *
 * Runs once per boot. On subsequent boots there's nothing to do so the
 * cost is a single store scan.
 */

import type { TrellisKernel } from '@turtle.tech/trellis-kernel'
import { FOUNDER_FACILITY_ID, FOUNDER_LAB_ZONE_ID } from './tql-events'

/** Campus substrate types whose entities do NOT belong inside a zone. */
const SUBSTRATE_CONTAINER_TYPES = new Set(['facility', 'zone', 'agent', 'wallet'])

export interface MigrationReport {
  scanned: number
  alreadyTagged: number
  substrateSkipped: number
  backfilled: number
  failed: number
}

export async function backfillEntityZones(kernel: TrellisKernel): Promise<MigrationReport> {
  const report: MigrationReport = {
    scanned: 0,
    alreadyTagged: 0,
    substrateSkipped: 0,
    backfilled: 0,
    failed: 0,
  }

  const store = (kernel as any).getStore?.()
  if (!store || typeof store.getAllFacts !== 'function') {
    console.warn('[campus-migration] kernel.getStore() unavailable; skipping backfill')
    return report
  }

  // First pass — index facts we care about.
  const entityTypes = new Map<string, string>()
  const entitiesWithZone = new Set<string>()
  for (const fact of store.getAllFacts() as Array<{ e: string; a: string; v: unknown }>) {
    if (typeof fact.e !== 'string' || !fact.e.startsWith('entity:')) continue
    if (fact.a === 'type' && typeof fact.v === 'string') entityTypes.set(fact.e, fact.v)
    if (fact.a === 'zoneId' && typeof fact.v === 'string' && fact.v.length > 0) {
      entitiesWithZone.add(fact.e)
    }
  }

  report.scanned = entityTypes.size

  // Second pass — backfill missing zone/facility attributes.
  for (const [entityId, entityType] of entityTypes) {
    if (entitiesWithZone.has(entityId)) {
      report.alreadyTagged++
      continue
    }
    if (SUBSTRATE_CONTAINER_TYPES.has(entityType)) {
      report.substrateSkipped++
      continue
    }
    try {
      await kernel.updateNode(
        entityId,
        { zoneId: FOUNDER_LAB_ZONE_ID, facilityId: FOUNDER_FACILITY_ID },
        'entity',
        { agentId: 'campus-migration' },
      )
      report.backfilled++
    } catch (err: any) {
      report.failed++
      console.warn(`[campus-migration] updateNode failed for ${entityId}:`, err?.message || err)
    }
  }

  if (report.backfilled > 0 || report.failed > 0) {
    console.log(
      `[campus-migration] scanned=${report.scanned} alreadyTagged=${report.alreadyTagged} ` +
        `substrateSkipped=${report.substrateSkipped} backfilled=${report.backfilled} failed=${report.failed}`,
    )
  } else {
    console.log(
      `[campus-migration] no-op (scanned=${report.scanned} alreadyTagged=${report.alreadyTagged} ` +
        `substrateSkipped=${report.substrateSkipped})`,
    )
  }

  return report
}
