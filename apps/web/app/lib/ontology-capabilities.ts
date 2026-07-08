import { isBrowseDomainType } from '~/lib/entities-live/browse-domain-types'
import type { OntologyBrowseConfig, OntologySchemaDefinition } from '~/lib/ontology-registry/schemas-to-server-types'

/** Dedicated app surfaces — excluded from unified browse. */
export const ROUTED_ONTOLOGY_SURFACES: Record<string, string> = {
  channel: '/messages',
  message: '/messages',
}

/** System types stored in the graph but not shown in workspace browse. */
export const NON_BROWSE_SYSTEM_TYPES = new Set([
  'channel',
  'message',
  'comment',
  'notification',
  'integration_definition',
  'integration_connection',
])

export type OntologyCapabilityInput = Pick<
  OntologySchemaDefinition,
  'tier' | 'browse' | 'routed'
> & { type?: string }

export function getRoutedSurface(typeSlug: string, config?: OntologyCapabilityInput | null): string | undefined {
  if (config?.routed) return config.routed
  return ROUTED_ONTOLOGY_SURFACES[typeSlug]
}

export function resolveBrowseEnabled(typeSlug: string, config?: OntologyCapabilityInput | null): boolean {
  if (config?.browse?.enabled !== undefined) return config.browse.enabled
  if (getRoutedSurface(typeSlug, config)) return false
  if (config?.tier === 'core') return false
  if (config?.tier === 'user') return true
  if (NON_BROWSE_SYSTEM_TYPES.has(typeSlug)) return false
  if (isBrowseDomainType(typeSlug)) return true
  return false
}

/** Static registry fallback when server ontology is not loaded yet. */
export function resolveStaticBrowseEnabled(typeSlug: string, browseHidden?: boolean): boolean {
  if (browseHidden) return false
  if (getRoutedSurface(typeSlug)) return false
  if (NON_BROWSE_SYSTEM_TYPES.has(typeSlug)) return false
  return isBrowseDomainType(typeSlug)
}

export function withDefaultBrowseConfig(
  typeSlug: string,
  config: OntologyCapabilityInput,
): OntologyBrowseConfig {
  const enabled = resolveBrowseEnabled(typeSlug, config)
  return {
    enabled,
    defaultProjection: config.browse?.defaultProjection,
  }
}
