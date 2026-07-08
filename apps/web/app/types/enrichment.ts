/**
 * Shared types for the AI enrichment pipeline.
 *
 * The server-side extractor (/api/extract-entities-llm) returns:
 *   - `entities`       — candidates of an already-known entity type
 *   - `tags`           — free-form topical tags
 *   - `typeProposals`  — full ontology schemas for types that DON'T exist yet,
 *                        each bundled with example instances pulled from the
 *                        same source content.
 *
 * Accepting a TypeProposal creates (a) a new user-tier ontology and
 * (b) one entity per selected instance — wired up to the source entity
 * via reciprocal references.
 */

/**
 * The 4 entity classes that every ontology belongs to. Keep in sync with
 * `EntityClass` in ~/types/entity.
 */
export type ProposalEntityClass = 'temporal' | 'document' | 'actor' | 'container'

/**
 * All valueTypes accepted by the TQL ontology schema (Notion-compatible set).
 * Mirrors the list in OntologyCreateDialog.vue.
 */
export type ProposalValueType =
  | 'title'
  | 'rich_text'
  | 'number'
  | 'select'
  | 'multi_select'
  | 'status'
  | 'date'
  | 'checkbox'
  | 'url'
  | 'email'
  | 'phone_number'
  | 'people'
  | 'files'
  | 'relation'

export interface ProposedField {
  name: string
  valueType: ProposalValueType
  required?: boolean
  description?: string
  /** Options for select / multi_select / status. */
  selectOptions?: string[]
}

export interface ProposedInstance {
  /** Display name for the new entity. */
  title: string
  /** One-line rationale from the LLM — shown in the review card. */
  context?: string
  /**
   * Optional per-field values the LLM extracted. Keys should match
   * `ProposedField.name`. Unknown keys are silently dropped on accept.
   */
  properties?: Record<string, string | number | boolean>
}

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

export interface TypeProposal {
  /** URL-safe slug, e.g. 'technology'. */
  slug: string
  /** Singular display label, e.g. 'Technology'. */
  label: string
  /** Plural display label, e.g. 'Technologies'. */
  labelPlural: string
  /** Entity class the new type belongs to. */
  entityClass: ProposalEntityClass
  /**
   * REQUIRED — Iconify name (typically `lucide:*`). The server normalises
   * bare names like `"cpu"` to `"lucide:cpu"`; missing/empty values fall
   * back to the class default before this object is returned.
   */
  icon: string
  /**
   * REQUIRED — Tailwind palette key (e.g. `violet`, `emerald`, `sky`). No
   * allowlist; broken values fall back to the class default server-side.
   */
  color: string
  /** 1-line description shown in the expanded review card. */
  description: string
  confidence: 'high' | 'medium' | 'low'
  /** 3–7 fields; always includes a `title` field. */
  fields: ProposedField[]
  /** 1–5 instances pulled from the source content. */
  exampleInstances: ProposedInstance[]
}
