/**
 * LLM-powered entity extraction endpoint.
 *
 * Takes email / calendar-event / generic text content and uses Gemma 4 via
 * Ollama to extract structured entity candidates and tags.
 *
 * POST /api/extract-entities-llm
 * Body: { text: string, kind?: 'email' | 'event' | 'generic' }
 * Response: { entities: EntityCandidate[], tags: string[] }
 */

const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434'
const DEFAULT_MODEL = process.env.TRELLIS_LLM_DEFAULT_MODEL || 'gemma4:e4b'

const MAX_TEXT_LENGTH = 4000

type ContentKind = 'email' | 'event' | 'video' | 'generic'

const SYSTEM_PROMPT = `You are an entity extraction assistant for a personal knowledge graph. Extract structured entities from the provided text. Return ONLY valid JSON with no markdown formatting, no code fences, no explanation.`

const TYPE_LIST = 'person, organization, project, task, event, appointment, trip, deadline, payment'

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

function buildUserPrompt(text: string, kind: ContentKind): string {
  const source = sourceLabel(kind)
  return `Extract entities from this ${source}. For each entity provide:
- name: the entity's proper name (not generic descriptions)
- type: one of [${TYPE_LIST}]
- confidence: high, medium, or low
- context: brief phrase explaining why this was extracted

${kindHint(kind)}

Also extract relevant tags (topics, themes, keywords — lowercase, no duplicates).

Return JSON in this exact format:
{"entities":[{"name":"...","type":"...","confidence":"...","context":"..."}],"tags":["tag1","tag2"]}

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

interface ExtractionResult {
  entities: EntityCandidate[]
  tags: string[]
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

function parseResponse(raw: string): ExtractionResult {
  const empty: ExtractionResult = { entities: [], tags: [] }

  // Try direct JSON parse first
  let parsed: any
  try {
    parsed = JSON.parse(raw)
  } catch {
    // Try extracting JSON from markdown code block
    const codeBlockMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (codeBlockMatch) {
      try {
        parsed = JSON.parse(codeBlockMatch[1].trim())
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

  return { entities, tags: [...new Set(tags)] }
}

export default defineEventHandler(async (event) => {
  const body = (await readBody(event)) as { text?: string; kind?: ContentKind }

  if (!body?.text || typeof body.text !== 'string') {
    throw createError({ statusCode: 400, message: '"text" is required' })
  }

  const kind: ContentKind =
    body.kind === 'email' || body.kind === 'event' || body.kind === 'video' ? body.kind : 'generic'

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
    return { entities: [], tags: [] }
  }

  try {
    const res = await fetch(`${OLLAMA_HOST}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        system: SYSTEM_PROMPT,
        prompt: buildUserPrompt(text, kind),
        stream: false,
      }),
    })

    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      throw new Error(`Ollama returned ${res.status}: ${errText || res.statusText}`)
    }

    const data = (await res.json()) as { response?: string; error?: string }
    if (data.error) throw new Error(`Ollama error: ${data.error}`)

    return parseResponse(data.response ?? '')
  } catch (err: any) {
    throw createError({
      statusCode: 502,
      message: `Entity extraction failed: ${err?.message || String(err)}`,
    })
  }
})
