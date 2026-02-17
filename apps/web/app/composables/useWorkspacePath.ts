/**
 * Parse a hybrid slug like "turtle-4d64a08f" into its parts.
 * The last 8 hex characters (after the final hyphen) are the ID prefix;
 * everything before is the cosmetic slug.
 *
 * Returns `{ slug, idPrefix }` or `null` if the format doesn't match.
 */
export function parseHybridSlug(hybridSlug: string): { slug: string; idPrefix: string } | null {
  const match = hybridSlug.match(/^(.+)-([0-9a-f]{8})$/)
  if (!match) return null
  return { slug: match[1]!, idPrefix: match[2]! }
}

/**
 * Build a hybrid slug from an org's slug and ID.
 * Example: buildHybridSlug('turtle', '4d64a08f-1234-...') → 'turtle-4d64a08f'
 */
export function buildHybridSlug(slug: string, id: string): string {
  return `${slug}-${id.substring(0, 8)}`
}

/**
 * Generates workspace-prefixed paths for ID-based routing.
 *
 * URLs use a hybrid slug format: `/w/{slug}-{idPrefix}/workspace/notes`
 * where idPrefix is the first 8 characters of the org's UUID.
 * The slug portion is cosmetic; the ID prefix is the source of truth.
 *
 * Falls back to flat paths (`/workspace/notes`) when no org context is available.
 *
 * Usage:
 *   const { wp, orgSlug } = useWorkspacePath()
 *   navigateTo(wp('/workspace/notes'))
 *   // → '/w/turtle-4d64a08f/workspace/notes'
 */
export function useWorkspacePath() {
  const currentOrg = useState<any>('currentOrg')

  const orgSlug = computed(() => {
    const org = currentOrg.value
    if (!org?.slug || !org?.id) return null
    return buildHybridSlug(org.slug, org.id)
  })

  /**
   * Prefix a path with the current workspace hybrid slug.
   * If no org is available, returns the path as-is (flat route fallback).
   */
  function wp(path: string): string {
    const slug = orgSlug.value
    if (!slug) return path

    // Don't double-prefix
    if (path.startsWith('/w/')) return path

    // Ensure path starts with /
    const normalized = path.startsWith('/') ? path : `/${path}`
    return `/w/${slug}${normalized}`
  }

  /**
   * Navigate to a workspace-prefixed path.
   */
  function wpNavigate(path: string, opts?: Parameters<typeof navigateTo>[1]) {
    return navigateTo(wp(path), opts)
  }

  return {
    wp,
    wpNavigate,
    orgSlug,
  }
}
