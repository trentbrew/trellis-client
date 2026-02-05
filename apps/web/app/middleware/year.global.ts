/**
 * Global middleware to handle URL context extraction
 *
 * Extracts org, year, and facility from URL and syncs with composable state.
 * URL structure: /[org]/[year]/[facility]/path
 */

import { parseFullPath } from '~/config/routes'

export default defineNuxtRouteMiddleware((to) => {
  const { org, year, facility } = parseFullPath(to.path)

  if (year) {
    const selectedYear = useState<number>('selectedYear')
    selectedYear.value = year
  }

  if (org) {
    const currentOrgSlug = useState<string | null>('currentOrgSlug')
    currentOrgSlug.value = org
  }

  if (facility) {
    const currentFacilitySlug = useState<string | null>('currentFacilitySlug')
    currentFacilitySlug.value = facility
  }
})
