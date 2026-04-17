import type { EntityReference, EntityType } from '~/types/entity'

/**
 * Entity candidate extracted by the LLM from email text.
 */
export interface EmailEntityCandidate {
  name: string
  type: 'person' | 'organization' | 'project' | 'task' | 'event'
  confidence: 'high' | 'medium' | 'low'
  context: string
}

/**
 * A candidate matched (or not) against the existing graph.
 */
export interface EnrichmentSuggestion {
  candidate: EmailEntityCandidate
  existingEntity?: { id: string; title: string; type: string }
  status: 'matched' | 'new'
}

interface CachedResult {
  suggestions: EnrichmentSuggestion[]
  tags: string[]
}

// Module-level cache keyed by gmailThreadId — survives composable re-instantiation
const cache = new Map<string, CachedResult>()

/**
 * Composable for LLM-powered entity extraction + graph matching on email content.
 *
 * Usage:
 *   const { suggestions, tags, scanning, error, extract, accept, dismiss } = useEmailEnrichment()
 *   await extract(emailEntity.bodyText, emailEntity.gmailThreadId)
 */
export function useEmailEnrichment() {
  const { items: allItems, create: createEntity, update: updateEntity } = useEntities()

  const suggestions = ref<EnrichmentSuggestion[]>([])
  const suggestedTags = ref<string[]>([])
  const scanning = ref(false)
  const error = ref<string | null>(null)

  const hasSuggestions = computed(() => suggestions.value.length > 0 || suggestedTags.value.length > 0)

  /**
   * Match a candidate against existing graph entities.
   * Priority: exact title+type > fuzzy substring+type > cross-type exact title.
   */
  function matchCandidate(candidate: EmailEntityCandidate): EnrichmentSuggestion {
    const nameLower = candidate.name.toLowerCase().trim()
    const items = allItems.value

    // Exact match: same type + same title
    const exact = items.find(
      (e: any) => e.type === candidate.type && e.title?.toLowerCase().trim() === nameLower,
    )
    if (exact) {
      return {
        candidate,
        existingEntity: { id: exact.id, title: exact.title || candidate.name, type: exact.type },
        status: 'matched',
      }
    }

    // Fuzzy: same type + title contains candidate name
    const fuzzy = items.find(
      (e: any) => e.type === candidate.type && e.title?.toLowerCase().includes(nameLower),
    )
    if (fuzzy) {
      return {
        candidate,
        existingEntity: { id: fuzzy.id, title: fuzzy.title || candidate.name, type: fuzzy.type },
        status: 'matched',
      }
    }

    // Cross-type: exact title match regardless of type
    const crossType = items.find(
      (e: any) => e.title?.toLowerCase().trim() === nameLower,
    )
    if (crossType) {
      return {
        candidate,
        existingEntity: { id: crossType.id, title: crossType.title || candidate.name, type: crossType.type },
        status: 'matched',
      }
    }

    return { candidate, status: 'new' }
  }

  /**
   * Run LLM extraction on email text and match results against the graph.
   * Results are cached by threadId.
   */
  async function extract(text: string, threadId: string, existingTags?: string[]) {
    // Check cache
    const cached = cache.get(threadId)
    if (cached) {
      suggestions.value = cached.suggestions
      suggestedTags.value = existingTags
        ? cached.tags.filter((t) => !existingTags.includes(t))
        : cached.tags
      return
    }

    if (!text || text.trim().length < 20) return

    scanning.value = true
    error.value = null

    try {
      const data = await $fetch<{ entities: EmailEntityCandidate[]; tags: string[] }>(
        '/api/extract-entities-llm',
        { method: 'POST', body: { text } },
      )

      const matched = (data.entities || []).map(matchCandidate)
      const tags = (data.tags || []).filter((t) => !(existingTags || []).includes(t))

      suggestions.value = matched
      suggestedTags.value = tags

      // Cache result
      cache.set(threadId, { suggestions: matched, tags: data.tags || [] })
    } catch (err: any) {
      error.value = err?.data?.message || err?.message || 'Extraction failed'
      suggestions.value = []
      suggestedTags.value = []
    } finally {
      scanning.value = false
    }
  }

  /**
   * Accept a suggestion: link (if matched) or create + link (if new).
   * Mirrors BookmarkContent.vue acceptSuggestion pattern.
   */
  async function accept(suggestion: EnrichmentSuggestion, emailEntity: any) {
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
    }

    // Add outgoing reference: email → target entity
    if (!emailEntity.references) emailEntity.references = []
    const alreadyLinked = emailEntity.references.some(
      (r: any) => r.kind === 'entity' && r.entityId === entityId,
    )
    if (!alreadyLinked) {
      const ref: EntityReference = {
        kind: 'entity',
        id: crypto.randomUUID(),
        entityId,
        entityType: s.type as EntityType,
        title: entityTitle,
        direction: 'outgoing',
      }
      emailEntity.references.push(ref)
    }

    // Add incoming backlink: target entity → email
    const targetEntity = allItems.value.find((e: any) => e.id === entityId)
    if (targetEntity) {
      const refs = (targetEntity as any).references || []
      const emailId = emailEntity.id
      const hasBackRef = refs.some((r: any) => r.kind === 'entity' && r.entityId === emailId)
      if (!hasBackRef && emailId) {
        refs.push({
          kind: 'entity',
          id: crypto.randomUUID(),
          entityId: emailId,
          entityType: 'email',
          title: emailEntity.title || 'Email',
          direction: 'incoming',
        } satisfies EntityReference)
        await updateEntity({ ...targetEntity, references: refs } as any)
      }
    }

    // Remove from suggestions list
    suggestions.value = suggestions.value.filter((x) => x !== suggestion)

    // Update cache
    const threadId = emailEntity.gmailThreadId
    if (threadId) {
      const cached = cache.get(threadId)
      if (cached) {
        cached.suggestions = suggestions.value
        cache.set(threadId, cached)
      }
    }
  }

  /**
   * Dismiss a suggestion without acting on it.
   */
  function dismiss(suggestion: EnrichmentSuggestion) {
    suggestions.value = suggestions.value.filter((x) => x !== suggestion)
  }

  /**
   * Accept a suggested tag.
   */
  function acceptTag(tag: string, emailEntity: any) {
    if (!emailEntity.tags) emailEntity.tags = []
    if (!emailEntity.tags.includes(tag)) {
      emailEntity.tags.push(tag)
    }
    suggestedTags.value = suggestedTags.value.filter((t) => t !== tag)
  }

  /**
   * Dismiss a suggested tag.
   */
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
