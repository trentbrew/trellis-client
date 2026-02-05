/**
 * Composable for managing year context in Platform Sandbox
 *
 * Provides reactive access to the selected year for compliance tracking.
 * The selected year is derived from the URL and persisted in localStorage as fallback.
 * URL structure: /[year]/facility/[slug]/path
 */

import { parseFullPath } from '~/config/routes'

const STORAGE_KEY = 'platform-sandbox-current-year'
const MIN_YEAR = 2015
const MAX_YEAR_OFFSET = 1 // Allow selecting up to 1 year in the future

export function useYear() {
  const route = useRoute()
  const router = useRouter()

  const currentYear = new Date().getFullYear()

  // Generate available years (from MIN_YEAR to current year + offset)
  const availableYears = computed(() => {
    const maxYear = currentYear + MAX_YEAR_OFFSET
    const years: number[] = []
    for (let year = maxYear; year >= MIN_YEAR; year--) {
      years.push(year)
    }
    return years
  })

  // Extract year from URL path
  const yearFromUrl = computed(() => {
    const { year } = parseFullPath(route.path)
    return year
  })

  // Selected year state - prefers URL, falls back to localStorage, then current year
  const selectedYear = useState<number>('selectedYear', () => {
    if (import.meta.client) {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = parseInt(stored, 10)
        if (!isNaN(parsed) && parsed >= MIN_YEAR && parsed <= currentYear + MAX_YEAR_OFFSET) {
          return parsed
        }
      }
    }
    return currentYear
  })

  // Sync selected year with URL when URL changes
  watch(
    yearFromUrl,
    (urlYear) => {
      if (urlYear && urlYear !== selectedYear.value) {
        selectedYear.value = urlYear
        if (import.meta.client) {
          localStorage.setItem(STORAGE_KEY, String(urlYear))
        }
      }
    },
    { immediate: true },
  )

  // Select a year and update the URL
  const selectYear = (year: number) => {
    if (year < MIN_YEAR || year > currentYear + MAX_YEAR_OFFSET) {
      console.warn('[useYear] Invalid year:', year)
      return
    }

    selectedYear.value = year

    if (import.meta.client) {
      localStorage.setItem(STORAGE_KEY, String(year))
    }

    // Update URL to include the new year
    const { org, facility, cleanPath } = parseFullPath(route.path)
    let newPath: string

    if (org && facility) {
      // It's a facility route: /[org]/[year]/[facility]/path...
      const subPath = cleanPath.startsWith('/facility') ? cleanPath.replace(/^\/facility/, '') : cleanPath
      newPath = `/${org}/${year}/${facility}${subPath}`
    } else {
      // Personal or generic route: /[year]/path... (if we still support that)
      // or just /path...
      const segments = route.path.split('/').filter(Boolean)
      if (yearFromUrl.value) {
        segments[0] = String(year)
        newPath = '/' + segments.join('/')
      } else {
        newPath = `/${year}${route.path}`
      }
    }

    router.push(newPath)
  }

  // Helper to build a year-prefixed path
  const buildYearPath = (basePath: string, year?: number) => {
    const targetYear = year ?? selectedYear.value
    // Remove leading slash if present, then prepend year
    const cleanPath = basePath.startsWith('/') ? basePath.slice(1) : basePath
    return `/${targetYear}/${cleanPath}`
  }

  // Helper to strip year from a path
  const stripYearFromPath = (path: string) => {
    const segments = path.split('/').filter(Boolean)
    if (segments.length > 0) {
      const firstSegmentStr = segments[0]
      if (firstSegmentStr) {
        const firstSegment = parseInt(firstSegmentStr, 10)
        if (!isNaN(firstSegment) && firstSegment >= MIN_YEAR && firstSegment <= currentYear + MAX_YEAR_OFFSET) {
          return '/' + segments.slice(1).join('/')
        }
      }
    }
    return path
  }

  // Check if a path has a year prefix
  const hasYearPrefix = (path: string) => {
    const segments = path.split('/').filter(Boolean)
    if (segments.length > 0) {
      const firstSegmentStr = segments[0]
      if (firstSegmentStr) {
        const firstSegment = parseInt(firstSegmentStr, 10)
        return !isNaN(firstSegment) && firstSegment >= MIN_YEAR && firstSegment <= currentYear + MAX_YEAR_OFFSET
      }
    }
    return false
  }

  return {
    selectedYear: computed(() => selectedYear.value),
    availableYears,
    yearFromUrl,
    selectYear,
    buildYearPath,
    stripYearFromPath,
    hasYearPrefix,
    currentYear,
  }
}
