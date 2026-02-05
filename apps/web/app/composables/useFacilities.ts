/**
 * Composable for managing facility context in Platform Sandbox
 *
 * Provides reactive access to available facilities and the currently selected facility.
 * Facilities are individual sites/locations that belong to an organization.
 */

export interface Facility {
  id: string
  organizationId: string
  name: string
  slug: string
  abbr?: string
  location?: {
    city: string
    state: string
    region?: string
    address?: string
    latitude?: number
    longitude?: number
  }
  active?: boolean
}

const STORAGE_KEY = 'platform-sandbox-current-facility'
const DEFAULT_FACILITY_SLUG = 'auburn'

// Demo facilities for Platform Sandbox (based on sample operations data)
const DEMO_FACILITIES: Facility[] = [
  // Northwind facilities
  {
    id: 'facility_auburn',
    organizationId: 'org_northwind',
    name: 'Auburn',
    slug: 'auburn',
    abbr: 'AUB',
    location: { city: 'Auburn', state: 'WA' },
    active: true,
  },
  {
    id: 'facility_bellingham',
    organizationId: 'org_northwind',
    name: 'Bellingham',
    slug: 'bellingham',
    abbr: 'BEL',
    location: { city: 'Bellingham', state: 'WA' },
    active: true,
  },
  {
    id: 'facility_chandler',
    organizationId: 'org_northwind',
    name: 'Chandler',
    slug: 'chandler',
    abbr: 'CHA',
    location: { city: 'Chandler', state: 'AZ' },
    active: true,
  },
  {
    id: 'facility_houston',
    organizationId: 'org_northwind',
    name: 'Houston',
    slug: 'houston',
    abbr: 'HOU',
    location: { city: 'Houston', state: 'TX' },
    active: true,
  },
  // Apex facilities
  {
    id: 'facility_charlotte',
    organizationId: 'org_apex',
    name: 'Charlotte Steel',
    slug: 'charlotte-steel',
    abbr: 'CHS',
    location: { city: 'Charlotte', state: 'NC' },
    active: true,
  },
  {
    id: 'facility_berkeley',
    organizationId: 'org_apex',
    name: 'Berkeley',
    slug: 'berkeley',
    abbr: 'BRK',
    location: { city: 'Huger', state: 'SC' },
    active: true,
  },
  // Lumen facilities
  {
    id: 'facility_denver',
    organizationId: 'org_lumen',
    name: 'Denver Processing',
    slug: 'denver-processing',
    abbr: 'DEN',
    location: { city: 'Denver', state: 'CO' },
    active: true,
  },
]

export function useFacilities() {
  const { currentOrganizationId } = useOrganizations()

  const allFacilities = ref<Facility[]>(DEMO_FACILITIES)
  const currentFacilityId = useState<string | null>('currentFacilityId', () => null)
  const currentFacilitySlug = useState<string | null>('currentFacilitySlug', () => null)
  const isLoading = ref(false)
  const error = ref<Error | null>(null)

  // Filter facilities by current organization
  const facilities = computed(() => {
    if (!currentOrganizationId.value) return allFacilities.value
    return allFacilities.value.filter((f) => f.organizationId === currentOrganizationId.value)
  })

  const currentFacility = computed(() => {
    if (!currentFacilityId.value) return null
    return facilities.value.find((f) => f.id === currentFacilityId.value) || null
  })

  const initializeFacility = () => {
    // Check if URL has facility slug from middleware
    if (currentFacilitySlug.value) {
      const facilityFromUrl = facilities.value.find((f) => f.slug === currentFacilitySlug.value)
      if (facilityFromUrl) {
        currentFacilityId.value = facilityFromUrl.id
        if (import.meta.client) {
          localStorage.setItem(STORAGE_KEY, facilityFromUrl.id)
        }
        return
      }
    }

    if (import.meta.client) {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored && facilities.value.some((f) => f.id === stored)) {
        currentFacilityId.value = stored
      } else if (facilities.value.length > 0) {
        // Default to first facility
        const defaultFacility = facilities.value.find((f) => f.slug === DEFAULT_FACILITY_SLUG)
        currentFacilityId.value = defaultFacility?.id || facilities.value[0]?.id || null
      }
    } else if (facilities.value.length > 0 && !currentFacilityId.value) {
      const defaultFacility = facilities.value.find((f) => f.slug === DEFAULT_FACILITY_SLUG)
      currentFacilityId.value = defaultFacility?.id || facilities.value[0]?.id || null
    }
  }

  // Watch for URL changes from middleware
  watch(currentFacilitySlug, (newSlug) => {
    if (newSlug) {
      const facility = facilities.value.find((f) => f.slug === newSlug)
      if (facility && facility.id !== currentFacilityId.value) {
        currentFacilityId.value = facility.id
        if (import.meta.client) {
          localStorage.setItem(STORAGE_KEY, facility.id)
        }
      }
    }
  })

  const selectFacility = (facilityId: string) => {
    const facility = facilities.value.find((f) => f.id === facilityId)
    if (!facility) {
      console.warn('[useFacilities] Facility not found:', facilityId)
      return
    }

    currentFacilityId.value = facilityId

    if (import.meta.client) {
      localStorage.setItem(STORAGE_KEY, facilityId)
    }
  }

  const selectFacilityBySlug = (slug: string) => {
    const facility = facilities.value.find((f) => f.slug === slug)
    if (facility) {
      selectFacility(facility.id)
    }
  }

  // Initialize immediately on client
  if (import.meta.client) {
    initializeFacility()
  }

  // Re-initialize when organization changes
  watch(currentOrganizationId, () => {
    // Check if current facility belongs to new organization
    if (currentFacilityId.value) {
      const facilityStillValid = facilities.value.some((f) => f.id === currentFacilityId.value)
      if (!facilityStillValid && facilities.value.length > 0) {
        currentFacilityId.value = facilities.value[0]?.id || null
        if (import.meta.client && currentFacilityId.value) {
          localStorage.setItem(STORAGE_KEY, currentFacilityId.value)
        }
      }
    } else {
      initializeFacility()
    }
  })

  return {
    facilities,
    currentFacility,
    currentFacilityId: computed(() => currentFacilityId.value),
    isLoading: computed(() => isLoading.value),
    error: computed(() => error.value),
    selectFacility,
    selectFacilityBySlug,
  }
}
