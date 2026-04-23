/**
 * Zone Router — maps HTTP requests to the zone they should emit into.
 *
 * Slice 0.5 of the Campus Substrate. Every mutation currently defaults
 * to the founder's Lab (see tql-events.ts emitMutation fallbacks). This
 * module gives us real zone diversity by deriving a ZoneContext from:
 *
 *   1. Explicit `X-Trellis-Zone` + `X-Trellis-Facility` request headers
 *      (clients can override; used by CLI/MCP agents acting on behalf
 *      of a specific zone)
 *   2. The Referer's pathname, matched against ROUTE_ZONE_RULES
 *   3. Fallback to the Lab (personal workspace)
 *
 * The rules here are deliberately coarse. Phase 0 only needs enough
 * signal to exercise the advisory zone-guard — refinement lands later.
 */

import type { H3Event } from 'h3'
import { getHeader } from 'h3'
import {
  FOUNDER_FACILITY_ID,
  FOUNDER_LAB_ZONE_ID,
  FOUNDER_LOBBY_ZONE_ID,
  FOUNDER_WORKSHOP_ZONE_ID,
  FOUNDER_SHOWROOM_ZONE_ID,
  FOUNDER_VAULT_ZONE_ID,
} from './tql-events'

export interface ZoneContext {
  zoneId: string
  facilityId: string
  /** How the zone was resolved — useful for debug logs */
  source: 'header' | 'route' | 'default'
}

/**
 * Ordered list of (regex, zoneId) rules. First match wins.
 * Keep Vault/Showroom/Workshop/Lobby rules BEFORE any /workspace catch-all
 * so specific routes aren't swallowed by broad ones.
 */
const ROUTE_ZONE_RULES: Array<{ match: RegExp; zoneId: string }> = [
  // ── Vault — credentials, integrations, admin (irreversible ops) ──
  { match: /^\/settings\/integrations/, zoneId: FOUNDER_VAULT_ZONE_ID },
  { match: /^\/admin/, zoneId: FOUNDER_VAULT_ZONE_ID },
  { match: /^\/permits/, zoneId: FOUNDER_VAULT_ZONE_ID },

  // ── Showroom — public/published surfaces ──
  { match: /^\/pages(\/|$)/, zoneId: FOUNDER_SHOWROOM_ZONE_ID },
  { match: /^\/collections(\/|$)/, zoneId: FOUNDER_SHOWROOM_ZONE_ID },

  // ── Workshop — multi-agent collaboration ──
  { match: /^\/agent(\/|$)/, zoneId: FOUNDER_WORKSHOP_ZONE_ID },
  { match: /^\/messages(\/|$)/, zoneId: FOUNDER_WORKSHOP_ZONE_ID },
  { match: /^\/members/, zoneId: FOUNDER_WORKSHOP_ZONE_ID },
  { match: /^\/workflows/, zoneId: FOUNDER_WORKSHOP_ZONE_ID },

  // ── Lobby — public front door, notifications, onboarding ──
  { match: /^\/notifications/, zoneId: FOUNDER_LOBBY_ZONE_ID },
  { match: /^\/invite/, zoneId: FOUNDER_LOBBY_ZONE_ID },
  { match: /^\/help/, zoneId: FOUNDER_LOBBY_ZONE_ID },
  { match: /^\/learn/, zoneId: FOUNDER_LOBBY_ZONE_ID },
  { match: /^\/docs(\/|$)/, zoneId: FOUNDER_LOBBY_ZONE_ID },
  { match: /^\/welcome/, zoneId: FOUNDER_LOBBY_ZONE_ID },
  { match: /^\/onboarding/, zoneId: FOUNDER_LOBBY_ZONE_ID },

  // Everything else (workspace/*, home/*, ontologies/*, database/*,
  // contacts/*, calendar/*, mail/*, query, ...) → Lab by default.
]

/**
 * Resolve a URL pathname to a ZoneContext via ROUTE_ZONE_RULES.
 * Defaults to the Lab when no rule matches.
 */
export function zoneForPath(pathname: string): ZoneContext {
  for (const rule of ROUTE_ZONE_RULES) {
    if (rule.match.test(pathname)) {
      return {
        zoneId: rule.zoneId,
        facilityId: FOUNDER_FACILITY_ID,
        source: 'route',
      }
    }
  }
  return {
    zoneId: FOUNDER_LAB_ZONE_ID,
    facilityId: FOUNDER_FACILITY_ID,
    source: 'default',
  }
}

/**
 * Extract the ZoneContext for an incoming request:
 *   1. X-Trellis-Zone header (explicit override)
 *   2. Referer pathname (normal browser case)
 *   3. Lab (fallback)
 */
export function zoneFromRequest(event: H3Event): ZoneContext {
  const headerZone = getHeader(event, 'x-trellis-zone')
  if (headerZone) {
    const headerFacility = getHeader(event, 'x-trellis-facility') || FOUNDER_FACILITY_ID
    return {
      zoneId: headerZone,
      facilityId: headerFacility,
      source: 'header',
    }
  }

  const referer = getHeader(event, 'referer')
  if (referer) {
    try {
      const url = new URL(referer)
      return zoneForPath(url.pathname)
    } catch {
      // Malformed referer — fall through to default
    }
  }

  return {
    zoneId: FOUNDER_LAB_ZONE_ID,
    facilityId: FOUNDER_FACILITY_ID,
    source: 'default',
  }
}
