/**
 * useEntityAutoFill — LLM-powered entity auto-fill.
 *
 * When a user creates an entity via AI suggestion (e.g. "Amazon" as an
 * Organization), we can call this composable to enrich it with public
 * profile data — description, website, industry, tags, etc.
 *
 * Works in two modes:
 *   • Fire-and-forget (non-blocking) — triggered automatically after creation.
 *   • Manual — triggered by an "Enrich with AI" button on any entity dialog.
 *
 * The server endpoint (/api/enrich-entity-llm) is instructed to return empty
 * values for unknown entities, so we only commit non-empty fields.
 */

import type { EntityType } from '~/types/entity'

export interface EntityAutoFillResult {
  fields: Record<string, string>
  tags: string[]
}

export function useEntityAutoFill() {
  const { items, update } = useEntities()

  const enriching = ref<Set<string>>(new Set())
  const lastError = ref<string | null>(null)

  function isEnriching(entityId: string): boolean {
    return enriching.value.has(entityId)
  }

  /**
   * Fetch profile info from the LLM for the given entity.
   * Does NOT mutate the entity — returns the raw result so callers can
   * review, diff, or commit.
   */
  async function fetchSuggestions(name: string, type: EntityType, context?: string): Promise<EntityAutoFillResult> {
    const data = await $fetch<EntityAutoFillResult>('/api/enrich-entity-llm', {
      method: 'POST',
      body: { name, type, context },
    })
    return data ?? { fields: {}, tags: [] }
  }

  /**
   * Run auto-fill for an entity.
   *
   * Can be called two ways:
   *   1. `enrich(entityId, { name, type, context })` — caller supplies
   *      the name/type (used right after createNode, before the reactive
   *      items list has hydrated). Most reliable path.
   *   2. `enrich(entityId, { context })` — looks up name/type from the
   *      already-loaded items list. Used by a manual "Enrich" button.
   *
   * Strategy:
   *  - Only fills fields that are currently empty on the entity (best-effort
   *    from items.value). Never overwrites user-authored content.
   *  - Merges AI-suggested tags with existing tags (de-duped).
   *  - No-op (silently) when the LLM returns nothing.
   *
   * Fire-and-forget safe: any error sets lastError but doesn't throw.
   */
  async function enrich(
    entityId: string,
    options?: { name?: string; type?: EntityType; context?: string },
  ): Promise<boolean> {
    if (enriching.value.has(entityId)) return false

    // Snapshot whatever we have about the entity right now — may be
    // empty if this is a just-created entity that hasn't made it into
    // items.value yet.
    const snapshot: any = items.value.find((e: any) => e.id === entityId) || {}
    const name = options?.name || snapshot.title || snapshot.name
    const type = (options?.type || snapshot.type) as EntityType | undefined
    if (!name || !type) return false

    enriching.value = new Set([...enriching.value, entityId])
    lastError.value = null

    try {
      const { fields, tags } = await fetchSuggestions(name, type, options?.context)

      const patch: Record<string, any> = {}
      for (const [key, val] of Object.entries(fields)) {
        // Only write into empty fields — never overwrite user content.
        const current = snapshot[key]
        const isEmpty =
          current === undefined || current === null || (typeof current === 'string' && current.trim().length === 0)
        if (isEmpty && typeof val === 'string' && val.trim().length > 0) {
          patch[key] = val
        }
      }

      if (tags.length) {
        const existing = Array.isArray(snapshot.tags) ? snapshot.tags : []
        const merged = Array.from(new Set([...existing, ...tags]))
        if (merged.length !== existing.length) patch.tags = merged
      }

      if (Object.keys(patch).length === 0) return false

      // Re-read the latest snapshot in case SSE delivered updates while the
      // LLM was thinking; fall back to the minimal shape we know from args.
      const latest = items.value.find((e: any) => e.id === entityId) || {
        id: entityId,
        type,
        title: name,
      }
      await update({ ...latest, ...patch } as any)
      return true
    } catch (err: any) {
      lastError.value = err?.data?.message || err?.message || 'Enrichment failed'
      return false
    } finally {
      const next = new Set(enriching.value)
      next.delete(entityId)
      enriching.value = next
    }
  }

  return {
    enriching,
    isEnriching,
    lastError,
    enrich,
    fetchSuggestions,
  }
}
