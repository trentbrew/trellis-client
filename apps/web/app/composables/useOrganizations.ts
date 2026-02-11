/**
 * Composable for managing organization context in Platform Sandbox
 *
 * Thin compatibility shim over useInstantData — preserves the exact same
 * return shape so all 20+ consumers work without changes.
 *
 * The canonical data source is useInstantData (InstantDB-backed CRUD with
 * reactive subscriptions). This composable maps the database.ts Organization
 * to the legacy Organization interface and delegates selection/persistence
 * to useInstantData's context sync.
 */

import type { Organization as DbOrganization } from '~/types/database'

export interface Organization {
  id: string
  ownerId?: string // User ID of workspace owner
  name: string
  slug: string
  logoUrl?: string
  description?: string
  facilities?: string[] // Array of facility IDs belonging to this organization
}

/**
 * Map InstantDB Organization → legacy Organization interface.
 * Adds missing optional fields with safe defaults.
 */
function toOrganization(dbOrg: DbOrganization): Organization {
  return {
    id: dbOrg.id,
    ownerId: dbOrg.ownerId,
    name: dbOrg.name,
    slug: dbOrg.slug,
    logoUrl: dbOrg.avatar,
    description: (dbOrg as any).description ?? '',
    facilities: [],
  }
}

export function useOrganizations() {
  const {
    organizations: dbOrganizations,
    currentOrg,
    orgsLoading,
    orgsError,
  } = useInstantData()

  // Map InstantDB orgs → legacy Organization shape
  const organizations = computed<Organization[]>(() =>
    (dbOrganizations.value || []).map(toOrganization),
  )

  const currentOrganization = computed<Organization | null>(() => {
    if (!currentOrg.value) return null
    return toOrganization(currentOrg.value)
  })

  const currentOrganizationId = computed<string | null>(() =>
    currentOrg.value?.id ?? null,
  )

  const isLoading = computed(() => orgsLoading.value)
  const error = computed(() => orgsError.value ? new Error(String(orgsError.value)) : null)

  const selectOrganization = (organizationId: string) => {
    const org = dbOrganizations.value.find((o) => o.id === organizationId)
    if (!org) {
      console.warn('[useOrganizations] Organization not found:', organizationId)
      return
    }
    // Setting currentOrg triggers useInstantData's context sync
    // (localStorage persistence, app re-selection, etc.)
    currentOrg.value = org
  }

  const selectOrganizationBySlug = (slug: string) => {
    const org = dbOrganizations.value.find((o) => o.slug === slug)
    if (org) {
      currentOrg.value = org
    }
  }

  return {
    organizations,
    currentOrganization,
    currentOrganizationId,
    isLoading,
    error,
    selectOrganization,
    selectOrganizationBySlug,
  }
}
