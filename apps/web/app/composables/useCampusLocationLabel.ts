import { getCleanPath } from '~/config/routes'
import { campusZoneMeta } from '~/lib/campus-zones'
import { getFileBrowseFacet, parseFileCategoryParam } from '~/lib/file-browse-categories'

/**
 * Human-readable location string for omnibar / breadcrumb chrome.
 * Mirrors CampusContextBreadcrumb dedup rules (local root hidden, browse all suppressed).
 */
export function useCampusLocationLabel() {
  const route = useRoute()
  const { user } = useInstantAuth()
  const { isCloud } = useAdapterStatus()
  const { zoneId } = useZoneContext()
  const { breadcrumbs } = useRoutes()
  const { getEntityConfig } = useOntologyRegistry()

  const runtimeLabel = computed(() => (isCloud.value ? 'InstantDB' : 'Local'))

  const rootLabel = computed(() => {
    const u = user.value as { name?: string; email?: string } | null
    const name = u?.name?.trim()
    if (name) return name
    const email = u?.email?.trim()
    if (email) {
      const prefix = email.includes('@') ? email.split('@')[0]! : email
      if (prefix) return prefix.charAt(0).toUpperCase() + prefix.slice(1)
    }
    return runtimeLabel.value
  })

  const zone = computed(() => campusZoneMeta(zoneId.value))

  const browseTypeParam = computed(() => {
    const cleanPath = getCleanPath(route.path)
    if (!cleanPath.startsWith('/workspace/browse')) return null
    const type = route.query.type
    if (typeof type !== 'string' || !type.trim() || type === 'all') return null
    return type.trim()
  })

  const browseTypeCrumb = computed(() => {
    const type = browseTypeParam.value
    if (!type) return null
    const cfg = getEntityConfig(type)
    const label = cfg?.labelPlural ?? cfg?.label ?? type
    return { label, icon: cfg?.icon }
  })

  const browseFileCategoryParam = computed(() => {
    if (browseTypeParam.value !== 'file') return null
    const category = route.query.category
    if (typeof category !== 'string' || !category.trim() || category === 'all') return null
    const parsed = parseFileCategoryParam(category)
    if (parsed === 'all') return null
    const facet = getFileBrowseFacet(parsed)
    return facet ? { label: facet.labelPlural, icon: facet.icon } : null
  })

  const projection = computed(() => {
    const crumbs = breadcrumbs.value
    if (!crumbs.length) return null
    const last = crumbs[crumbs.length - 1]
    if (!last?.label?.trim()) return null
    return { label: last.label }
  })

  const isBrowseHome = computed(() => {
    const cleanPath = getCleanPath(route.path)
    return cleanPath === '/workspace/browse' || cleanPath === '/workspace/browse/'
  })

  const showProjection = computed(() => {
    if (!projection.value) return false
    if (projection.value.label.toLowerCase() === zone.value.label.toLowerCase()) return false

    const label = projection.value.label.toLowerCase()

    if (isBrowseHome.value && !browseTypeParam.value && label === 'browse') return false
    if (browseTypeCrumb.value && label === 'browse') return false

    return true
  })

  const showRoot = computed(() => isCloud.value)

  /** Path segments after zone — e.g. `Emails` or `Settings`. */
  const locationSuffix = computed(() => {
    const parts: string[] = []

    if (showProjection.value && projection.value) parts.push(projection.value.label)
    if (browseTypeCrumb.value) parts.push(browseTypeCrumb.value.label)
    if (browseFileCategoryParam.value) parts.push(browseFileCategoryParam.value.label)

    return parts.join(' › ')
  })

  const locationLabel = computed(() => {
    const parts = [zone.value.label]
    if (locationSuffix.value) parts.push(locationSuffix.value)
    return parts.join(' › ')
  })

  return {
    zone,
    rootLabel,
    runtimeLabel,
    locationLabel,
    locationSuffix,
    showRoot,
  }
}
