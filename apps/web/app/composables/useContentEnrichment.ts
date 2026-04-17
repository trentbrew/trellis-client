/**
 * useContentEnrichment — LLM-powered entity extraction + graph matching.
 *
 * Generic pipeline that takes some source entity's textual content,
 * sends it to the /api/extract-entities-llm endpoint, and reconciles
 * the returned candidates against the existing graph. Works for any
 * entity "kind" (email, event, generic document, etc.).
 *
 * Results are cached module-wide keyed by the caller's stable cache key
 * (e.g. a Gmail threadId, a Google Calendar eventId, or the entity id)
 * so re-opening the same item is instant.
 */

import type { EntityReference, EntityType } from '~/types/entity'

/**
 * Expanded entity candidate types the LLM can extract. Keep in sync with
 * VALID_TYPES in server/api/extract-entities-llm.post.ts.
 */
export type EnrichmentCandidateType =
  | 'person'
  | 'organization'
  | 'project'
  | 'task'
  | 'event'
  | 'appointment'
  | 'trip'
  | 'deadline'
  | 'payment'

export interface ContentEntityCandidate {
  name: string
  type: EnrichmentCandidateType
  confidence: 'high' | 'medium' | 'low'
  context: string
}

export interface EnrichmentSuggestion {
  candidate: ContentEntityCandidate
  existingEntity?: { id: string; title: string; type: string }
  status: 'matched' | 'new'
  /**
   * Timestamp (seconds) of the first mention of this entity in the source
   * content. Only populated for `video` kind where we can resolve the
   * candidate's name against transcript cues. Undefined otherwise.
   */
  firstMentionAt?: number
}

export type ContentKind = 'email' | 'event' | 'video' | 'generic'

interface CachedResult {
  suggestions: EnrichmentSuggestion[]
  tags: string[]
}

// Module-level cache keyed by `${kind}::${cacheKey}` so email + event
// never collide on a shared threadId or similar.
const cache = new Map<string, CachedResult>()

interface UseContentEnrichmentOptions {
  /**
   * What kind of content we're enriching. Tailors the LLM prompt and
   * keeps the cache segregated.
   */
  kind: ContentKind
  /**
   * EntityType used when creating back-references from the target
   * entity onto this source (e.g. 'email' for a persisted Gmail thread,
   * 'event' for a calendar event). Consumers pass their own.
   */
  sourceEntityType: EntityType
}

export function useContentEnrichment(options: UseContentEnrichmentOptions) {
  const { items: allItems, create: createEntity, update: updateEntity } = useEntities()
  const { enrich: enrichEntityInBackground } = useEntityAutoFill()

  const suggestions = ref<EnrichmentSuggestion[]>([])
  const suggestedTags = ref<string[]>([])
  const scanning = ref(false)
  const error = ref<string | null>(null)

  const hasSuggestions = computed(() => suggestions.value.length > 0 || suggestedTags.value.length > 0)

  /**
   * Match a candidate against existing graph entities.
   * Priority: exact title+type > fuzzy substring+type > cross-type exact title.
   */
  function matchCandidate(candidate: ContentEntityCandidate): EnrichmentSuggestion {
    const nameLower = candidate.name.toLowerCase().trim()
    const items = allItems.value

    const exact = items.find((e: any) => e.type === candidate.type && e.title?.toLowerCase().trim() === nameLower)
    if (exact) {
      return {
        candidate,
        existingEntity: { id: exact.id, title: exact.title || candidate.name, type: exact.type },
        status: 'matched',
      }
    }

    const fuzzy = items.find((e: any) => e.type === candidate.type && e.title?.toLowerCase().includes(nameLower))
    if (fuzzy) {
      return {
        candidate,
        existingEntity: { id: fuzzy.id, title: fuzzy.title || candidate.name, type: fuzzy.type },
        status: 'matched',
      }
    }

    const crossType = items.find((e: any) => e.title?.toLowerCase().trim() === nameLower)
    if (crossType) {
      return {
        candidate,
        existingEntity: { id: crossType.id, title: crossType.title || candidate.name, type: crossType.type },
        status: 'matched',
      }
    }

    return { candidate, status: 'new' }
  }

  function cacheKeyFor(key: string): string {
    return `${options.kind}::${key}`
  }

  /**
   * For video transcripts: resolve the first timestamp at which each extracted
   * entity name is mentioned. Matching is case-insensitive and tolerant of
   * punctuation/possessives. Returns `undefined` when no cue mentions the name.
   */
  function resolveFirstMention(
    name: string,
    cues: Array<{ start: number; text: string }> | undefined,
  ): number | undefined {
    if (!cues || !cues.length || !name) return undefined
    const needle = name.toLowerCase().trim()
    if (needle.length < 2) return undefined

    // Allow partial matches on multi-word names — first word is usually enough.
    const firstWord = needle.split(/\s+/)[0] || ''

    for (const cue of cues) {
      const hay = cue.text.toLowerCase()
      if (hay.includes(needle)) return cue.start
      // Fall back to first-word match for names where the full phrase might
      // be split across cues.
      if (firstWord.length >= 3 && hay.includes(firstWord)) return cue.start
    }
    return undefined
  }

  /**
   * Run LLM extraction on the given text and match against the graph.
   * Results are cached by `${kind}::${key}`.
   *
   * @param text the content to analyze (email body, event description, etc.)
   * @param key a stable identifier for caching (threadId, eventId, entity id)
   * @param existingTags tags already on the source entity — filtered out of suggestions
   * @param videoCues optional transcript cues — enables timestamp resolution
   *   for each suggestion's first mention. Used by the video flow.
   */
  async function extract(
    text: string,
    key: string,
    existingTags?: string[],
    videoCues?: Array<{ start: number; text: string }>,
  ) {
    const ck = cacheKeyFor(key)
    const cached = cache.get(ck)
    if (cached) {
      suggestions.value = cached.suggestions
      suggestedTags.value = existingTags ? cached.tags.filter((t) => !existingTags.includes(t)) : cached.tags
      return
    }

    if (!text || text.trim().length < 20) return

    scanning.value = true
    error.value = null

    try {
      const data = await $fetch<{ entities: ContentEntityCandidate[]; tags: string[] }>('/api/extract-entities-llm', {
        method: 'POST',
        body: { text, kind: options.kind },
      })

      const matched = (data.entities || []).map((c) => {
        const base = matchCandidate(c)
        const firstMentionAt = videoCues ? resolveFirstMention(c.name, videoCues) : undefined
        return firstMentionAt !== undefined ? { ...base, firstMentionAt } : base
      })
      const tags = (data.tags || []).filter((t) => !(existingTags || []).includes(t))

      suggestions.value = matched
      suggestedTags.value = tags

      cache.set(ck, { suggestions: matched, tags: data.tags || [] })
    } catch (err: any) {
      error.value = err?.data?.message || err?.message || 'Extraction failed'
      suggestions.value = []
      suggestedTags.value = []
    } finally {
      scanning.value = false
    }
  }

  /**
   * Accept a suggestion: link to existing entity, or create + link a new one.
   * Mutates `sourceEntity.references` in place and creates the reciprocal
   * backlink on the target entity.
   */
  async function accept(suggestion: EnrichmentSuggestion, sourceEntity: any, sourceCacheKey?: string) {
    const s = suggestion.candidate
    let entityId: string
    let entityTitle: string

    if (suggestion.existingEntity) {
      entityId = suggestion.existingEntity.id
      entityTitle = suggestion.existingEntity.title
    } else {
      entityId = await createEntity({
        type: s.type as any,
        title: s.name,
      })
      entityTitle = s.name

      // Fire-and-forget: auto-fill the new entity's profile fields from the
      // LLM using the suggestion's context snippet. Errors are swallowed so
      // this never blocks the link/create flow — the user sees fields appear
      // a moment later via the reactive entity subscription.
      void enrichEntityInBackground(entityId, {
        name: s.name,
        type: s.type as EntityType,
        context: s.context || undefined,
      }).catch(() => {})
    }

    // Outgoing: source → target
    if (!sourceEntity.references) sourceEntity.references = []
    const alreadyLinked = sourceEntity.references.some((r: any) => r.kind === 'entity' && r.entityId === entityId)
    if (!alreadyLinked) {
      const ref: EntityReference = {
        kind: 'entity',
        id: crypto.randomUUID(),
        entityId,
        entityType: s.type as EntityType,
        title: entityTitle,
        direction: 'outgoing',
      }
      sourceEntity.references.push(ref)
    }

    // Incoming: target → source (bidirectional backlink)
    const targetEntity = allItems.value.find((e: any) => e.id === entityId)
    if (targetEntity) {
      const refs = (targetEntity as any).references || []
      const sourceId = sourceEntity.id
      const hasBackRef = refs.some((r: any) => r.kind === 'entity' && r.entityId === sourceId)
      if (!hasBackRef && sourceId) {
        refs.push({
          kind: 'entity',
          id: crypto.randomUUID(),
          entityId: sourceId,
          entityType: options.sourceEntityType,
          title: sourceEntity.title || sourceEntity.subject || 'Item',
          direction: 'incoming',
        } satisfies EntityReference)
        await updateEntity({ ...targetEntity, references: refs } as any)
      }
    }

    suggestions.value = suggestions.value.filter((x) => x !== suggestion)

    // Update cache if caller provided a stable key
    if (sourceCacheKey) {
      const ck = cacheKeyFor(sourceCacheKey)
      const cached = cache.get(ck)
      if (cached) {
        cached.suggestions = suggestions.value
        cache.set(ck, cached)
      }
    }
  }

  function dismiss(suggestion: EnrichmentSuggestion) {
    suggestions.value = suggestions.value.filter((x) => x !== suggestion)
  }

  function acceptTag(tag: string, sourceEntity: any) {
    if (!sourceEntity.tags) sourceEntity.tags = []
    if (!sourceEntity.tags.includes(tag)) {
      sourceEntity.tags.push(tag)
    }
    suggestedTags.value = suggestedTags.value.filter((t) => t !== tag)
  }

  function dismissTag(tag: string) {
    suggestedTags.value = suggestedTags.value.filter((t) => t !== tag)
  }

  return {
    suggestions,
    suggestedTags,
    scanning,
    error,
    hasSuggestions,
    extract,
    accept,
    dismiss,
    acceptTag,
    dismissTag,
  }
}
