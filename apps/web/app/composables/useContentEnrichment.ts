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
import type { ProposedField, ProposedInstance, TypeProposal } from '~/types/enrichment'
import { entityId as toEntityId } from '~/lib/tql-namespace'

export type { TypeProposal, ProposedField, ProposedInstance } from '~/types/enrichment'

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

export type ContentKind = 'email' | 'event' | 'video' | 'file' | 'generic'

interface CachedResult {
  suggestions: EnrichmentSuggestion[]
  tags: string[]
  typeProposals: TypeProposal[]
}

// Module-level cache keyed by `${kind}::${cacheKey}` so email + event
// never collide on a shared threadId or similar.
const cache = new Map<string, CachedResult>()

/**
 * Per-entity record of dismissed proposals so we never re-surface a rejected
 * type in the same session. Keyed by `${kind}::${cacheKey}` → set of slugs.
 */
const dismissedTypeSlugs = new Map<string, Set<string>>()

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
  const { allTypeIds, getEntityConfig, waitForType, refresh: refreshOntologies } = useOntologyRegistry()
  const { mutate: mutateGraph } = useTrellisGraph()

  const suggestions = ref<EnrichmentSuggestion[]>([])
  const suggestedTags = ref<string[]>([])
  const typeProposals = ref<TypeProposal[]>([])
  const scanning = ref(false)
  const error = ref<string | null>(null)
  const acceptingTypeSlug = ref<string | null>(null)

  const hasSuggestions = computed(
    () => suggestions.value.length > 0 || suggestedTags.value.length > 0 || typeProposals.value.length > 0,
  )

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
      typeProposals.value = filterDismissed(ck, cached.typeProposals)
      return
    }

    if (!text || text.trim().length < 20) return

    scanning.value = true
    error.value = null

    // Snapshot the user's current types so the LLM doesn't re-propose
    // things the graph already knows about.
    const existingTypeSlugs = allTypeIds.value
    const existingTypeLabelsList = existingTypeSlugs.map((slug) => getEntityConfig(slug)?.label || slug).filter(Boolean)

    try {
      const data = await $fetch<{
        entities: ContentEntityCandidate[]
        tags: string[]
        typeProposals?: TypeProposal[]
      }>('/api/extract-entities-llm', {
        method: 'POST',
        body: {
          text,
          kind: options.kind,
          existingTypes: existingTypeSlugs,
          existingTypeLabels: existingTypeLabelsList,
        },
      })

      const matched = (data.entities || []).map((c) => {
        const base = matchCandidate(c)
        const firstMentionAt = videoCues ? resolveFirstMention(c.name, videoCues) : undefined
        return firstMentionAt !== undefined ? { ...base, firstMentionAt } : base
      })
      const tags = (data.tags || []).filter((t) => !(existingTags || []).includes(t))
      const proposalsRaw = Array.isArray(data.typeProposals) ? data.typeProposals : []

      suggestions.value = matched
      suggestedTags.value = tags
      typeProposals.value = filterDismissed(ck, proposalsRaw)

      cache.set(ck, {
        suggestions: matched,
        tags: data.tags || [],
        typeProposals: proposalsRaw,
      })
    } catch (err: any) {
      error.value = err?.data?.message || err?.message || 'Extraction failed'
      suggestions.value = []
      suggestedTags.value = []
      typeProposals.value = []
    } finally {
      scanning.value = false
    }
  }

  /** Strip out any type proposals the user has already dismissed this session. */
  function filterDismissed(ck: string, list: TypeProposal[]): TypeProposal[] {
    const dismissed = dismissedTypeSlugs.get(ck)
    if (!dismissed || dismissed.size === 0) return list
    return list.filter((p) => !dismissed.has(p.slug))
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

  /**
   * Dismiss a proposed type — removes it from the visible list AND records
   * the slug in the session-level dismissal set so re-scans won't re-surface it.
   */
  function dismissTypeProposal(proposal: TypeProposal, sourceCacheKey?: string) {
    typeProposals.value = typeProposals.value.filter((p) => p.slug !== proposal.slug)
    if (sourceCacheKey) {
      const ck = cacheKeyFor(sourceCacheKey)
      if (!dismissedTypeSlugs.has(ck)) dismissedTypeSlugs.set(ck, new Set())
      dismissedTypeSlugs.get(ck)!.add(proposal.slug)
    }
  }

  /**
   * Accept a proposed type:
   *   1. POST /api/graph/ontology with the (possibly-edited) schema, tier 'user'.
   *   2. Wait for the new type to appear in the registry (SSE-driven).
   *   3. Create each selected instance and wire up reciprocal references
   *      to the source entity.
   *
   * Caller can customise the schema (rename label, tweak fields, pick icon/color)
   * and the subset of instances via the `overrides` param.
   */
  async function acceptTypeProposal(
    proposal: TypeProposal,
    sourceEntity: any,
    overrides?: {
      label?: string
      labelPlural?: string
      icon?: string
      color?: string
      fields?: ProposedField[]
      instances?: ProposedInstance[]
    },
    sourceCacheKey?: string,
  ): Promise<{ ok: true; schemaId: string; createdIds: string[] } | { ok: false; error: string }> {
    if (acceptingTypeSlug.value === proposal.slug) {
      return { ok: false, error: 'Already accepting this proposal' }
    }
    acceptingTypeSlug.value = proposal.slug

    const finalLabel = overrides?.label?.trim() || proposal.label
    const finalLabelPlural = overrides?.labelPlural?.trim() || proposal.labelPlural
    const finalIcon = overrides?.icon?.trim() || proposal.icon
    const finalColor = overrides?.color?.trim() || proposal.color
    const finalFields = overrides?.fields?.length ? overrides.fields : proposal.fields
    const finalInstances = overrides?.instances ?? proposal.exampleInstances

    const schemaId = `trellis:schema/${proposal.slug}`
    const schema = {
      '@id': schemaId,
      '@type': 'trellis:Schema',
      version: '1.0.0',
      tier: 'user' as const,
      entityClass: proposal.entityClass,
      label: finalLabel,
      labelPlural: finalLabelPlural,
      icon: finalIcon,
      color: finalColor,
      description: proposal.description || undefined,
      fields: finalFields,
    }

    // ── Step 1: create the ontology ────────────────────────────────────
    try {
      await $fetch('/api/graph/ontology', {
        method: 'POST',
        body: { schema, agentId: 'ai-suggest' },
      })
    } catch (err: any) {
      // 409 means the schema already exists — treat as soft success.
      const status = err?.statusCode ?? err?.response?.status
      if (status !== 409) {
        acceptingTypeSlug.value = null
        return { ok: false, error: err?.data?.message || err?.message || 'Failed to create type' }
      }
    }

    // ── Step 2: wait for SSE → registry to pick up the new type ────────
    // Trigger a refetch in case SSE is slow/dropped; waitForType resolves
    // immediately if the type was already visible from a prior run.
    refreshOntologies().catch(() => {})
    const appeared = await waitForType(proposal.slug, 3000)
    if (!appeared) {
      // Non-fatal — mutations to the namespace still succeed; the sidebar
      // will catch up on the next SSE tick.
      console.warn(`[useContentEnrichment] type ${proposal.slug} not in registry after 3s`)
    }

    // ── Step 3: create each selected instance + reciprocal refs ────────
    // References are stored as TQL links (not entity attrs) — see
    // useTrellisEntities hydration, which folds links with relation
    // 'references' | 'mentions' | 'derivedFrom' into `entity.references`
    // with both `outgoing` and `incoming` directions. We link once per
    // instance; hydration handles both sides.
    const createdIds: string[] = []
    const sourceFullId = sourceEntity?.id ? toEntityId(sourceEntity.id) : null

    for (const inst of finalInstances) {
      try {
        const payload: Record<string, any> = {
          type: proposal.slug,
          title: inst.title,
        }
        if (inst.properties) {
          for (const [k, v] of Object.entries(inst.properties)) {
            if (k === 'title') continue // already in payload
            payload[k] = v
          }
        }
        const newId = await createEntity(payload as any)
        createdIds.push(newId)

        // Canonical bidirectional link via TQL graph API.
        if (sourceFullId) {
          try {
            await mutateGraph({
              action: 'link',
              e1: sourceFullId,
              relation: 'references',
              e2: toEntityId(newId),
            })
          } catch (linkErr: any) {
            console.warn(
              `[useContentEnrichment] failed to link ${sourceEntity.id} → ${newId}:`,
              linkErr?.message || linkErr,
            )
          }
        }

        // Mirror the link optimistically into the in-memory `sourceEntity.references`
        // so the References section in the currently-open dialog updates instantly
        // (the authoritative state arrives via SSE + hydration shortly after).
        if (!Array.isArray(sourceEntity.references)) sourceEntity.references = []
        const alreadyLinked = sourceEntity.references.some((r: any) => r?.kind === 'entity' && r?.entityId === newId)
        if (!alreadyLinked) {
          sourceEntity.references.push({
            kind: 'entity',
            id: `ref-references-${toEntityId(newId)}`,
            entityId: newId,
            entityType: proposal.slug as EntityType,
            title: inst.title,
            direction: 'outgoing',
          } satisfies EntityReference)
        }
      } catch (err: any) {
        console.warn(`[useContentEnrichment] failed to create instance "${inst.title}":`, err?.message || err)
      }
    }

    // `updateEntity` is no longer needed for refs — TQL links are the source
    // of truth. Kept imported because the existing `accept()` method still
    // uses it.
    void updateEntity
    void allItems

    // ── Step 4: remove the accepted proposal from state + cache ────────
    typeProposals.value = typeProposals.value.filter((p) => p.slug !== proposal.slug)
    if (sourceCacheKey) {
      const ck = cacheKeyFor(sourceCacheKey)
      const cached = cache.get(ck)
      if (cached) {
        cached.typeProposals = cached.typeProposals.filter((p) => p.slug !== proposal.slug)
        cache.set(ck, cached)
      }
    }

    acceptingTypeSlug.value = null
    return { ok: true, schemaId, createdIds }
  }

  return {
    suggestions,
    suggestedTags,
    typeProposals,
    acceptingTypeSlug,
    scanning,
    error,
    hasSuggestions,
    extract,
    accept,
    dismiss,
    acceptTag,
    dismissTag,
    acceptTypeProposal,
    dismissTypeProposal,
  }
}
