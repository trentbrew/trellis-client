/**
 * Composable for managing organization context in Platform Sandbox
 *
 * Provides reactive access to available organizations and the currently selected organization.
 * Organizations are the top-level corporate entities (e.g., "Northwind Holdings").
 * Each organization contains multiple facilities.
 */

export interface Organization {
  id: string
  ownerId?: string // User ID of workspace owner
  name: string
  slug: string
  logoUrl?: string
  description?: string
  facilities?: string[] // Array of facility IDs belonging to this organization
}

const STORAGE_KEY = 'platform-sandbox-current-organization'
const DEFAULT_ORGANIZATION_SLUG = 'turtle-labs'

// Organizations
const DEMO_ORGANIZATIONS: Organization[] = [
  {
    id: 'org_turtle_labs',
    name: 'Turtle Labs LLC',
    slug: 'turtle-labs',
    description: 'Design & development studio.',
    facilities: [],
  },
]

export function useOrganizations() {
  const organizations = ref<Organization[]>(DEMO_ORGANIZATIONS)
  const currentOrganizationId = useState<string | null>('currentOrganizationId', () => null)
  const currentOrgSlug = useState<string | null>('currentOrgSlug', () => null)
  const isLoading = ref(false)
  const error = ref<Error | null>(null)

  const currentOrganization = computed(() => {
    if (!currentOrganizationId.value) return null
    return organizations.value.find((o) => o.id === currentOrganizationId.value) || null
  })

  const initializeOrganization = () => {
    // Check if URL has org slug from middleware
    if (currentOrgSlug.value) {
      const orgFromUrl = organizations.value.find((o) => o.slug === currentOrgSlug.value)
      if (orgFromUrl) {
        currentOrganizationId.value = orgFromUrl.id
        if (import.meta.client) {
          localStorage.setItem(STORAGE_KEY, orgFromUrl.id)
        }
        return
      }
    }

    if (import.meta.client) {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored && organizations.value.some((o) => o.id === stored)) {
        currentOrganizationId.value = stored
      } else if (organizations.value.length > 0) {
        // Default to Hiser Burggraff Curtis if available, otherwise first organization
        const defaultOrg = organizations.value.find((o) => o.slug === DEFAULT_ORGANIZATION_SLUG)
        currentOrganizationId.value = defaultOrg?.id || organizations.value[0]?.id || null
      }
    } else if (organizations.value.length > 0 && !currentOrganizationId.value) {
      const defaultOrg = organizations.value.find((o) => o.slug === DEFAULT_ORGANIZATION_SLUG)
      currentOrganizationId.value = defaultOrg?.id || organizations.value[0]?.id || null
    }
  }

  // Watch for URL changes from middleware
  watch(currentOrgSlug, (newSlug) => {
    if (newSlug) {
      const org = organizations.value.find((o) => o.slug === newSlug)
      if (org && org.id !== currentOrganizationId.value) {
        currentOrganizationId.value = org.id
        if (import.meta.client) {
          localStorage.setItem(STORAGE_KEY, org.id)
        }
      }
    }
  })

  const selectOrganization = (organizationId: string) => {
    const organization = organizations.value.find((o) => o.id === organizationId)
    if (!organization) {
      console.warn('[useOrganizations] Organization not found:', organizationId)
      return
    }

    currentOrganizationId.value = organizationId

    if (import.meta.client) {
      localStorage.setItem(STORAGE_KEY, organizationId)
    }
  }

  const selectOrganizationBySlug = (slug: string) => {
    const organization = organizations.value.find((o) => o.slug === slug)
    if (organization) {
      selectOrganization(organization.id)
    }
  }

  // Initialize immediately on client
  if (import.meta.client) {
    initializeOrganization()
  }

  return {
    organizations: computed(() => organizations.value),
    currentOrganization,
    currentOrganizationId: computed(() => currentOrganizationId.value),
    isLoading: computed(() => isLoading.value),
    error: computed(() => error.value),
    selectOrganization,
    selectOrganizationBySlug,
  }
}
