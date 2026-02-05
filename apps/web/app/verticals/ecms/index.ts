/**
 * ECMS Vertical
 *
 * Environmental Compliance Management System specific code.
 * This vertical provides facility management, task scheduling,
 * and compliance tracking functionality.
 *
 * Note: Folders are the preferred grouping mechanism in ECMS.
 * For the generic scaffold, use tags instead.
 */

// Types
export * from './types'

// Composables
export { useEcmsData } from './composables/useEcmsData'
export { useFacilities } from './composables/useFacilities'
export { useFacilityEntities } from './composables/useFacilityEntities'

// Lib
export * from './lib/ecmsSeedData'

// Components are auto-imported by Nuxt from ./components/
// Pages are in ./pages/ but need to be symlinked or copied to enable
