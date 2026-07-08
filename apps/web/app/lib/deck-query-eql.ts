import type { QueryViewRegionConfig } from '~/types/deck'

/** Normalize queryView config to EQL-S (demo pseudo-SQL → slide query). */
export function toEqlQuery(config: QueryViewRegionConfig | undefined): string {
  if (!config?.query) return ''
  if (/^\s*FIND\b/i.test(config.query)) return config.query
  return 'FIND entity AS ?s WHERE ?s.type = "slide" RETURN ?s'
}
