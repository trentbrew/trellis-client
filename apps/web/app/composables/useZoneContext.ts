/**
 * useZoneContext — client-side Campus zone resolver (Phase 1 slice 1.4)
 *
 * The server already derives the originating zone from the `Referer`
 * header (see `apps/web/server/utils/zone-router.ts`). This composable
 * makes the same decision EXPLICITLY on the client, then writes it into
 * `X-Trellis-Zone` + `X-Trellis-Facility` headers on every mutation.
 *
 * Why duplicate the logic? Two reasons:
 *   1. Referer is easy to lose (iframe, strict CSP, programmatic fetch).
 *      The explicit header is the canonical signal.
 *   2. Components can OVERRIDE the route-derived zone for a subtree via
 *      `provideZoneOverride()`. The classic use case is a "Publish to
 *      Showroom" button inside a /workspace page — its mutation should
 *      tag the Showroom zone even though the route sits in the Lab.
 *
 * Keep the constants + route rules below in sync with the canonical
 * server-side copies:
 *   - `apps/web/server/utils/tql-events.ts`  (zone/facility IDs)
 *   - `apps/web/server/utils/zone-router.ts` (ROUTE_ZONE_RULES)
 */

import { computed, inject, provide } from 'vue'
import type { InjectionKey, Ref } from 'vue'

// ── Canonical zone IDs (mirror of server/utils/tql-events.ts) ─────────────

export const CAMPUS_FACILITY_ID = 'entity:founder-facility'
export const CAMPUS_ZONES = {
  lab: 'entity:founder-facility-lab',
  lobby: 'entity:founder-facility-lobby',
  workshop: 'entity:founder-facility-workshop',
  showroom: 'entity:founder-facility-showroom',
  vault: 'entity:founder-facility-vault',
} as const

export type CampusZoneKind = keyof typeof CAMPUS_ZONES

// ── Route rules (mirror of server/utils/zone-router.ts) ───────────────────

interface RouteRule {
  prefix: string
  zoneId: string
}

const ROUTE_RULES: RouteRule[] = [
  // Vault — irreversible / privileged ops
  { prefix: '/settings/integrations', zoneId: CAMPUS_ZONES.vault },
  { prefix: '/admin', zoneId: CAMPUS_ZONES.vault },
  { prefix: '/permits', zoneId: CAMPUS_ZONES.vault },

  // Showroom — public-facing artifacts
  { prefix: '/pages', zoneId: CAMPUS_ZONES.showroom },
  { prefix: '/collections', zoneId: CAMPUS_ZONES.showroom },

  // Workshop — collaboration + agent ops
  { prefix: '/agent', zoneId: CAMPUS_ZONES.workshop },
  { prefix: '/messages', zoneId: CAMPUS_ZONES.workshop },
  { prefix: '/members', zoneId: CAMPUS_ZONES.workshop },
  { prefix: '/workflows', zoneId: CAMPUS_ZONES.workshop },
  { prefix: '/sheets', zoneId: CAMPUS_ZONES.workshop },
  { prefix: '/decks', zoneId: CAMPUS_ZONES.workshop },
  { prefix: '/canvases', zoneId: CAMPUS_ZONES.workshop },

  // Lobby — public onboarding / help surfaces
  { prefix: '/notifications', zoneId: CAMPUS_ZONES.lobby },
  { prefix: '/invite', zoneId: CAMPUS_ZONES.lobby },
  { prefix: '/help', zoneId: CAMPUS_ZONES.lobby },
  { prefix: '/learn', zoneId: CAMPUS_ZONES.lobby },
  { prefix: '/docs', zoneId: CAMPUS_ZONES.lobby },
  { prefix: '/welcome', zoneId: CAMPUS_ZONES.lobby },
  { prefix: '/onboarding', zoneId: CAMPUS_ZONES.lobby },
]

/** Strip `/w/:orgSlug` prefix so zone rules match workspace-scoped URLs. */
function normalizePathname(path: string): string {
  const wsMatch = path.match(/^\/w\/[^/]+(\/.*)?$/)
  return wsMatch ? wsMatch[1] || '/' : path
}

/** Resolve a zone id from a pathname. Anything unmatched → Lab (private). */
export function zoneIdFromPath(path: string | undefined | null): string {
  if (!path) return CAMPUS_ZONES.lab
  const clean = normalizePathname(path).replace(/\/+$/, '') // trim trailing slash
  for (const rule of ROUTE_RULES) {
    if (clean === rule.prefix || clean.startsWith(rule.prefix + '/')) {
      return rule.zoneId
    }
  }
  return CAMPUS_ZONES.lab
}

// ── Override injection (provide/inject) ───────────────────────────────────

const ZONE_OVERRIDE_KEY: InjectionKey<Ref<string | null>> = Symbol('campus:zone-override')

/**
 * Provide a zone override to all descendant components / composables.
 * Pass a reactive ref so the override can toggle at runtime. Pass `null`
 * to clear. Typical use:
 *
 *   const publishing = ref(false)
 *   const override = computed(() => publishing.value ? CAMPUS_ZONES.showroom : null)
 *   provideZoneOverride(override)
 */
export function provideZoneOverride(zoneId: Ref<string | null>): void {
  provide(ZONE_OVERRIDE_KEY, zoneId)
}

// ── Main composable ───────────────────────────────────────────────────────

export interface ZoneHeadersOptions {
  /** Per-call override, wins over route + injected override. */
  zoneId?: string
  /** Opt-in provenance capture (slice 1.1) — shortcut to avoid a second header obj. */
  captureDecision?: boolean
}

export function useZoneContext() {
  const override = inject(ZONE_OVERRIDE_KEY, null) as Ref<string | null> | null

  // `useRoute()` is Nuxt-auto-imported. In contexts without a router (e.g.
  // very early plugin bootstrapping) it can throw — guard so the composable
  // stays usable at module scope too.
  const route = (() => {
    try {
      return useRoute()
    } catch {
      return null
    }
  })()

  const zoneId = computed(() => {
    if (override?.value) return override.value
    return zoneIdFromPath(route?.path)
  })

  const facilityId = computed(() => CAMPUS_FACILITY_ID)

  /** Build headers to attach to a mutation fetch. */
  function zoneHeaders(opts?: ZoneHeadersOptions): Record<string, string> {
    const headers: Record<string, string> = {
      'X-Trellis-Zone': opts?.zoneId || zoneId.value,
      'X-Trellis-Facility': facilityId.value,
    }
    if (opts?.captureDecision) {
      headers['X-Trellis-Capture-Decision'] = '1'
    }
    return headers
  }

  return {
    /** Reactive, route-aware (or override-aware) zone id. */
    zoneId,
    /** Always the founder facility for Phase 1. */
    facilityId,
    /** Ready-to-spread fetch headers. */
    zoneHeaders,
    /** Constants for explicit overrides. */
    CAMPUS_ZONES,
    CAMPUS_FACILITY_ID,
  }
}
