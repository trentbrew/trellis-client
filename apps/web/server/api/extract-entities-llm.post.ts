/**
 * LLM-powered entity extraction endpoint.
 *
 * Takes email / calendar-event / generic text content and uses Gemma 4 via
 * Ollama to extract three things:
 *   1. `entities`       — candidates of known types (person, organization, …)
 *   2. `tags`           — free-form topical tags
 *   3. `typeProposals`  — full ontology schemas for types that DON'T exist
 *                         yet in the user's graph (see ~/types/enrichment).
 *
 * POST /api/extract-entities-llm
 * Body: {
 *   text: string,
 *   kind?: 'email' | 'event' | 'video' | 'generic',
 *   existingTypes?: string[],       // ontology slugs the user already has
 *   existingTypeLabels?: string[],  // labels for dedupe
 * }
 */

const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434'
const DEFAULT_MODEL = process.env.TRELLIS_LLM_DEFAULT_MODEL || 'gemma4:e4b'

const MAX_TEXT_LENGTH = 4000

type ContentKind = 'email' | 'event' | 'video' | 'generic'

const SYSTEM_PROMPT = `You are an entity extraction assistant for a personal knowledge graph. Extract structured entities from the provided text and, when clearly warranted, propose new entity types (ontology schemas) that the user's graph doesn't yet have. Return ONLY valid JSON with no markdown formatting, no code fences, no explanation.`

const TYPE_LIST = 'person, organization, project, task, event, appointment, trip, deadline, payment'

// Palette suggested to the LLM for new type proposals. Any Tailwind key is
// accepted at validation time; this is just semantic guidance.
const COLOR_PALETTE = [
  'slate',
  'gray',
  'red',
  'orange',
  'amber',
  'yellow',
  'lime',
  'green',
  'emerald',
  'teal',
  'cyan',
  'sky',
  'blue',
  'indigo',
  'violet',
  'purple',
  'fuchsia',
  'pink',
  'rose',
]

function sourceLabel(kind: ContentKind): string {
  switch (kind) {
    case 'email':
      return 'email'
    case 'event':
      return 'calendar event'
    case 'video':
      return 'video transcript'
    default:
      return 'text'
  }
}

function kindHint(kind: ContentKind): string {
  switch (kind) {
    case 'email':
      return 'Focus on people, organizations, projects, tasks (action items with deadlines), trips (travel plans), payments/invoices, and scheduled events mentioned in the message.'
    case 'event':
      return 'Focus on people attending or mentioned, organizations involved, related projects, preparation tasks, and any related trips, payments, or sub-appointments implied by the description.'
    case 'video':
      return 'Focus on people mentioned or speaking (hosts, guests, authors), organizations/companies referenced, products or projects named, key concepts or topics, and any events or deadlines discussed. Prefer proper nouns that appear clearly in the transcript. Ignore filler words, "uh"/"um", and generic descriptors.'
    default:
      return 'Extract any distinct named entities that would be useful to link in a personal knowledge graph.'
  }
}

function buildUserPrompt(
  text: string,
  kind: ContentKind,
  existingTypes: string[],
  existingTypeLabels: string[],
): string {
  const source = sourceLabel(kind)
  const existingTypesSection =
    existingTypes.length > 0
      ? `\nThe user's graph ALREADY contains these entity types — do NOT propose duplicates of any of them (check both the slug and the label):\n  slugs: ${existingTypes.join(', ')}\n  labels: ${existingTypeLabels.join(', ')}\n`
      : ''

  return `Extract entities from this ${source}. For each entity provide:
- name: the entity's proper name (not generic descriptions)
- type: one of [${TYPE_LIST}]
- confidence: high, medium, or low
- context: brief phrase explaining why this was extracted

${kindHint(kind)}

Also extract relevant tags (topics, themes, keywords — lowercase, no duplicates).

─── NEW TYPE PROPOSALS ──────────────────────────────────────────────────
IF the content surfaces a distinct cluster of named things that do NOT fit any of the existing types listed above AND do NOT fit any built-in type [${TYPE_LIST}], you MAY propose up to 3 new entity types. Only propose a new type when you can also give 2+ concrete example instances from this content. Skip this section entirely if nothing fits.
${existingTypesSection}
For each proposed new type, return:
- slug:         lowercase hyphenated identifier, e.g. "technology"
- label:        singular display name, e.g. "Technology"
- labelPlural:  plural display name, e.g. "Technologies"
- entityClass:  one of ["temporal", "document", "actor", "container"]
    • temporal  — has dates/times, lives on a calendar (events, deadlines)
    • document  — has rich content body (notes, pages, articles)
    • actor     — represents a person or agent (people, organizations)
    • container — groups or organizes other entities (projects, categories, concepts)
- icon:         REQUIRED — an Iconify name that semantically matches the type,
                e.g. "lucide:cpu" for Technology, "lucide:lightbulb" for Concept,
                "lucide:languages" for Language. Always include the "lucide:" prefix.
- color:        REQUIRED — a single Tailwind palette key from: [${COLOR_PALETTE.join(', ')}].
                Pick one whose hue matches the type (cool tones for technical
                concepts, warm tones for ideas/emotional things, etc.).
- description:  one short sentence describing what this type represents.
- confidence:   high, medium, or low.
- fields:       array of 3–7 property definitions. MUST include a field with
                name "title" and valueType "title". Each field has:
                  • name       — lowerCamelCase identifier
                  • valueType  — one of: title, rich_text, number, select,
                                 multi_select, status, date, checkbox, url,
                                 email, phone_number, people, files, relation
                  • required?  — true/false
                  • description? — short hint for the user
                  • selectOptions? — array of strings, for select/multi_select/status only
- exampleInstances: 1–5 concrete instances extracted from the content. Each has:
                  • title       — the instance name
                  • context?    — one-line rationale
                  • properties? — optional object keyed by field name, with
                                  per-field values (strings, numbers, booleans)

Return JSON in this exact format:
{"entities":[{"name":"...","type":"...","confidence":"...","context":"..."}],"tags":["tag1","tag2"],"typeProposals":[{"slug":"...","label":"...","labelPlural":"...","entityClass":"...","icon":"lucide:...","color":"...","description":"...","confidence":"...","fields":[{"name":"title","valueType":"title","required":true}],"exampleInstances":[{"title":"...","context":"..."}]}]}

If you have no new types to propose, return "typeProposals": [].

${source.charAt(0).toUpperCase() + source.slice(1)} content:
---
${text}
---`
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
}

type CandidateType =
  | 'person'
  | 'organization'
  | 'project'
  | 'task'
  | 'event'
  | 'appointment'
  | 'trip'
  | 'deadline'
  | 'payment'

interface EntityCandidate {
  name: string
  type: CandidateType
  confidence: 'high' | 'medium' | 'low'
  context: string
}

// New type proposal wire shape (matches ~/types/enrichment).
type ProposalEntityClass = 'temporal' | 'document' | 'actor' | 'container'
type ProposalValueType =
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

interface ProposedField {
  name: string
  valueType: ProposalValueType
  required?: boolean
  description?: string
  selectOptions?: string[]
}
interface ProposedInstance {
  title: string
  context?: string
  properties?: Record<string, string | number | boolean>
}
interface TypeProposal {
  slug: string
  label: string
  labelPlural: string
  entityClass: ProposalEntityClass
  icon: string
  color: string
  description: string
  confidence: 'high' | 'medium' | 'low'
  fields: ProposedField[]
  exampleInstances: ProposedInstance[]
}

interface ExtractionResult {
  entities: EntityCandidate[]
  tags: string[]
  typeProposals: TypeProposal[]
}

const VALID_TYPES = new Set<CandidateType>([
  'person',
  'organization',
  'project',
  'task',
  'event',
  'appointment',
  'trip',
  'deadline',
  'payment',
])
const VALID_CONFIDENCES = new Set(['high', 'medium', 'low'])

const VALID_ENTITY_CLASSES = new Set<ProposalEntityClass>(['temporal', 'document', 'actor', 'container'])

const VALID_VALUE_TYPES = new Set<ProposalValueType>([
  'title',
  'rich_text',
  'number',
  'select',
  'multi_select',
  'status',
  'date',
  'checkbox',
  'url',
  'email',
  'phone_number',
  'people',
  'files',
  'relation',
])

// Class-level fallbacks — mirror CLASS_COLORS / CLASS_ICONS in useOntologyRegistry.
const CLASS_ICONS: Record<ProposalEntityClass, string> = {
  temporal: 'lucide:calendar',
  document: 'lucide:file-text',
  actor: 'lucide:user',
  container: 'lucide:folder',
}
const CLASS_COLORS: Record<ProposalEntityClass, string> = {
  temporal: 'blue',
  document: 'emerald',
  actor: 'sky',
  container: 'violet',
}

const SLUG_RE = /^[a-z][a-z0-9_-]{1,40}$/

/** Normalise a label or slug for dedupe: lowercase + strip non-alphanum. */
function normaliseName(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '')
}

/** Plain Levenshtein distance; short strings only. */
function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length
  const prev = new Array(b.length + 1)
  const curr = new Array(b.length + 1)
  for (let j = 0; j <= b.length; j++) prev[j] = j
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i
    for (let j = 1; j <= b.length; j++) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost)
    }
    for (let j = 0; j <= b.length; j++) prev[j] = curr[j]
  }
  return prev[b.length]
}

function normaliseIcon(raw: unknown, entityClass: ProposalEntityClass): string {
  if (typeof raw !== 'string') return CLASS_ICONS[entityClass]
  const trimmed = raw.trim()
  if (!trimmed) return CLASS_ICONS[entityClass]
  // Pass through any already-namespaced icon (`lucide:*`, `mdi:*`, etc.).
  if (trimmed.includes(':')) return trimmed
  // Bare names like `cpu` → `lucide:cpu`.
  return `lucide:${trimmed}`
}

function normaliseColor(raw: unknown, entityClass: ProposalEntityClass): string {
  if (typeof raw !== 'string') return CLASS_COLORS[entityClass]
  const trimmed = raw.trim().toLowerCase()
  // Any plain lowercase word is accepted — broken colors will render muted
  // and the user can fix them via the review card.
  if (!/^[a-z]+$/.test(trimmed)) return CLASS_COLORS[entityClass]
  return trimmed
}

function parseProposedField(raw: any): ProposedField | null {
  if (!raw || typeof raw !== 'object') return null
  const name = typeof raw.name === 'string' ? raw.name.trim() : ''
  const valueType = typeof raw.valueType === 'string' ? raw.valueType.trim() : ''
  if (!name) return null
  if (!VALID_VALUE_TYPES.has(valueType as ProposalValueType)) return null
  const field: ProposedField = { name, valueType: valueType as ProposalValueType }
  if (raw.required === true) field.required = true
  if (typeof raw.description === 'string' && raw.description.trim()) {
    field.description = raw.description.trim()
  }
  if (Array.isArray(raw.selectOptions)) {
    const opts = raw.selectOptions.filter((o: unknown) => typeof o === 'string' && (o as string).trim()) as string[]
    if (opts.length > 0) field.selectOptions = opts.map((o) => o.trim())
  }
  return field
}

function parseProposedInstance(raw: any): ProposedInstance | null {
  if (!raw || typeof raw !== 'object') return null
  const title = typeof raw.title === 'string' ? raw.title.trim() : ''
  if (!title) return null
  const inst: ProposedInstance = { title }
  if (typeof raw.context === 'string' && raw.context.trim()) inst.context = raw.context.trim()
  if (raw.properties && typeof raw.properties === 'object') {
    const props: Record<string, string | number | boolean> = {}
    for (const [k, v] of Object.entries(raw.properties)) {
      if (typeof k !== 'string' || !k) continue
      if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
        props[k] = v
      }
    }
    if (Object.keys(props).length > 0) inst.properties = props
  }
  return inst
}

function parseResponse(raw: string, existingTypes: string[], existingTypeLabels: string[]): ExtractionResult {
  const empty: ExtractionResult = { entities: [], tags: [], typeProposals: [] }

  // Try direct JSON parse first
  let parsed: any
  try {
    parsed = JSON.parse(raw)
  } catch {
    // Try extracting JSON from markdown code block
    const codeBlockMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (codeBlockMatch) {
      try {
        parsed = JSON.parse(codeBlockMatch[1]!.trim())
      } catch {
        return empty
      }
    } else {
      // Try finding JSON object in the response
      const jsonMatch = raw.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        try {
          parsed = JSON.parse(jsonMatch[0])
        } catch {
          return empty
        }
      } else {
        return empty
      }
    }
  }

  if (!parsed || typeof parsed !== 'object') return empty

  const entities: EntityCandidate[] = []
  if (Array.isArray(parsed.entities)) {
    for (const e of parsed.entities) {
      if (
        typeof e?.name === 'string' &&
        e.name.trim() &&
        VALID_TYPES.has(e.type as CandidateType) &&
        VALID_CONFIDENCES.has(e.confidence)
      ) {
        entities.push({
          name: e.name.trim(),
          type: e.type,
          confidence: e.confidence,
          context: typeof e.context === 'string' ? e.context : '',
        })
      }
    }
  }

  const tags: string[] = []
  if (Array.isArray(parsed.tags)) {
    for (const t of parsed.tags) {
      if (typeof t === 'string' && t.trim()) {
        tags.push(t.trim().toLowerCase())
      }
    }
  }

  const typeProposals = parseTypeProposals(parsed.typeProposals, existingTypes, existingTypeLabels)

  return { entities, tags: [...new Set(tags)], typeProposals }
}

/**
 * Parse, validate, and dedupe the LLM's `typeProposals` array.
 *
 * Guardrails (strict):
 *   - Drop low-confidence proposals.
 *   - Drop exact slug/label duplicates of existing types.
 *   - Drop near-duplicates (Levenshtein ≤ 2 on normalised label, or slug
 *     that's a substring of an existing slug and vice versa).
 *   - Ensure every proposal has a `title` field (auto-add when missing).
 *   - Auto-fill icon/color from class defaults if the LLM forgot or
 *     returned garbage.
 *   - Hard-cap at 3 proposals per request.
 */
function parseTypeProposals(
  rawProposals: unknown,
  existingTypes: string[],
  existingTypeLabels: string[],
): TypeProposal[] {
  if (!Array.isArray(rawProposals) || rawProposals.length === 0) return []

  const existingSlugs = new Set(existingTypes.map((s) => normaliseName(s)))
  const existingLabels = new Set(existingTypeLabels.map((s) => normaliseName(s)))
  const existingLabelsForFuzzy = existingTypeLabels.map((s) => normaliseName(s))

  const seenSlugs = new Set<string>()
  const out: TypeProposal[] = []

  for (const raw of rawProposals) {
    if (out.length >= 3) break
    if (!raw || typeof raw !== 'object') continue

    const p: any = raw
    const confidence = p.confidence
    if (!VALID_CONFIDENCES.has(confidence)) continue
    if (confidence === 'low') continue // strict: drop low-confidence

    const slug = typeof p.slug === 'string' ? p.slug.trim().toLowerCase() : ''
    const label = typeof p.label === 'string' ? p.label.trim() : ''
    if (!SLUG_RE.test(slug)) continue
    if (!label) continue

    const entityClass = VALID_ENTITY_CLASSES.has(p.entityClass) ? (p.entityClass as ProposalEntityClass) : 'container'

    // ── Dedupe against existing types ─────────────────────────────────
    const normSlug = normaliseName(slug)
    const normLabel = normaliseName(label)
    if (existingSlugs.has(normSlug) || existingLabels.has(normLabel)) continue
    if (seenSlugs.has(normSlug)) continue

    // Near-match filter: skip if the label is within edit-distance 2 of any
    // existing label, OR if the slug is a substring of an existing slug.
    let tooSimilar = false
    for (const existing of existingLabelsForFuzzy) {
      if (!existing) continue
      if (Math.abs(existing.length - normLabel.length) > 3) continue
      if (levenshtein(existing, normLabel) <= 2) {
        tooSimilar = true
        break
      }
    }
    if (tooSimilar) continue
    for (const existing of existingSlugs) {
      if (existing && (existing.includes(normSlug) || normSlug.includes(existing)) && existing.length >= 4) {
        tooSimilar = true
        break
      }
    }
    if (tooSimilar) continue

    // ── Fields ────────────────────────────────────────────────────────
    let fields: ProposedField[] = []
    if (Array.isArray(p.fields)) {
      for (const f of p.fields) {
        const parsed = parseProposedField(f)
        if (parsed) fields.push(parsed)
      }
    }
    // Guarantee a title field — if the LLM forgot, auto-add so downstream
    // scaffolding doesn't break.
    const hasTitle = fields.some((f) => f.valueType === 'title')
    if (!hasTitle) {
      fields = [{ name: 'title', valueType: 'title', required: true }, ...fields]
    }
    // Keep at most 8 fields (3–7 requested + title buffer).
    if (fields.length > 8) fields = fields.slice(0, 8)

    // ── Instances ─────────────────────────────────────────────────────
    const exampleInstances: ProposedInstance[] = []
    if (Array.isArray(p.exampleInstances)) {
      for (const inst of p.exampleInstances) {
        const parsed = parseProposedInstance(inst)
        if (parsed) exampleInstances.push(parsed)
        if (exampleInstances.length >= 5) break
      }
    }
    if (exampleInstances.length === 0) continue // no instances = not useful

    // ── Icon / color (required, with fallback + warn) ─────────────────
    const iconMissing = typeof p.icon !== 'string' || !p.icon.trim()
    const colorMissing = typeof p.color !== 'string' || !p.color.trim()
    if (iconMissing || colorMissing) {
      console.warn('[extract-entities-llm] proposal missing icon|color, using class default', {
        slug,
        iconMissing,
        colorMissing,
      })
    }
    const icon = normaliseIcon(p.icon, entityClass)
    const color = normaliseColor(p.color, entityClass)

    const labelPlural =
      typeof p.labelPlural === 'string' && p.labelPlural.trim()
        ? p.labelPlural.trim()
        : label.endsWith('s')
          ? label
          : `${label}s`

    out.push({
      slug,
      label,
      labelPlural,
      entityClass,
      icon,
      color,
      description: typeof p.description === 'string' ? p.description.trim() : '',
      confidence,
      fields,
      exampleInstances,
    })
    seenSlugs.add(normSlug)
  }

  return out
}

export default defineEventHandler(async (event) => {
  const body = (await readBody(event)) as {
    text?: string
    kind?: ContentKind
    existingTypes?: string[]
    existingTypeLabels?: string[]
  }

  if (!body?.text || typeof body.text !== 'string') {
    throw createError({ statusCode: 400, message: '"text" is required' })
  }

  const kind: ContentKind =
    body.kind === 'email' || body.kind === 'event' || body.kind === 'video' ? body.kind : 'generic'

  const existingTypes = Array.isArray(body.existingTypes)
    ? body.existingTypes.filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
    : []
  const existingTypeLabels = Array.isArray(body.existingTypeLabels)
    ? body.existingTypeLabels.filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
    : []

  // Prefer plain text; strip HTML if that's all we have
  let text = body.text
  if (text.includes('<') && text.includes('>')) {
    text = stripHtml(text)
  }

  // Truncate to avoid blowing token limits
  if (text.length > MAX_TEXT_LENGTH) {
    text = text.slice(0, MAX_TEXT_LENGTH) + '\n[...truncated]'
  }

  if (text.trim().length < 20) {
    return { entities: [], tags: [], typeProposals: [] }
  }

  try {
    const res = await fetch(`${OLLAMA_HOST}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        system: SYSTEM_PROMPT,
        prompt: buildUserPrompt(text, kind, existingTypes, existingTypeLabels),
        stream: false,
      }),
    })

    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      throw new Error(`Ollama returned ${res.status}: ${errText || res.statusText}`)
    }

    const data = (await res.json()) as { response?: string; error?: string }
    if (data.error) throw new Error(`Ollama error: ${data.error}`)

    return parseResponse(data.response ?? '', existingTypes, existingTypeLabels)
  } catch (err: any) {
    throw createError({
      statusCode: 502,
      message: `Entity extraction failed: ${err?.message || String(err)}`,
    })
  }
})
