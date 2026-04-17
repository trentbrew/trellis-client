/**
 * LLM-powered entity auto-fill endpoint.
 *
 * Given an entity's name + type (and optional context), uses Gemma 4 via
 * Ollama to produce structured profile data for that entity — description,
 * website, industry, role, etc. — so newly-created entities can be
 * populated with meaningful metadata instead of just a bare title.
 *
 * POST /api/enrich-entity-llm
 * Body: { name: string, type: EntityType, context?: string }
 * Response: { fields: Record<string, string>, tags: string[] }
 *
 * The endpoint returns empty arrays/objects when the model has no
 * grounded knowledge about the entity — avoiding confident hallucination.
 */

const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434'
const DEFAULT_MODEL = process.env.TRELLIS_LLM_DEFAULT_MODEL || 'gemma4:e4b'

type EntityType =
  | 'person'
  | 'organization'
  | 'project'
  | 'task'
  | 'event'
  | 'appointment'
  | 'trip'
  | 'deadline'
  | 'payment'

const VALID_TYPES = new Set<EntityType>([
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

/**
 * Per-type schema of enrichable fields. The model is instructed to fill only
 * these keys for the given type; unknown fields are filtered out server-side.
 */
const FIELD_SCHEMA: Record<EntityType, string[]> = {
  organization: ['description', 'website', 'industry', 'headquarters', 'founded'],
  person: ['description', 'role', 'company', 'email', 'website'],
  project: ['description'],
  task: ['description'],
  event: ['description', 'location'],
  appointment: ['description', 'location'],
  trip: ['description', 'location'],
  deadline: ['description'],
  payment: ['description', 'vendor'],
}

const SYSTEM_PROMPT = `You are a knowledge-graph enrichment assistant. Given an entity's name and type, return publicly-known factual profile information. Return ONLY valid JSON (no markdown, no code fences, no commentary). If you do not know a specific entity with high confidence, return empty strings or omit the fields entirely — do NOT guess or fabricate.`

function buildUserPrompt(name: string, type: EntityType, context?: string): string {
  const fields = FIELD_SCHEMA[type] || ['description']
  const fieldJson = fields.map((f) => `"${f}":"..."`).join(',')
  const ctx = context ? `\n\nExtra context from where this entity was mentioned:\n"""${context}"""` : ''

  return `Entity name: "${name}"
Entity type: ${type}${ctx}

Return a JSON object with ONLY these keys (empty string if unknown):
{${fieldJson},"tags":["relevant","topic","keywords"]}

Rules:
- description: 1–2 concise sentences, factual only.
- website: full URL with protocol (e.g. "https://example.com") or empty.
- tags: 3-6 short lowercase topical tags, no duplicates.
- If you genuinely don't recognise this entity, return {"${fields[0]}":"","tags":[]}.
- No hallucination. No marketing language. Facts only.`
}

function parseResponse(raw: string, allowedFields: string[]): {
  fields: Record<string, string>
  tags: string[]
} {
  const empty = { fields: {}, tags: [] }
  let parsed: any

  try {
    parsed = JSON.parse(raw)
  } catch {
    const code = raw.match(/```(?:json)?\s*([\s\S]*?)```/)
    const obj = code ? code[1] : raw.match(/\{[\s\S]*\}/)?.[0]
    if (!obj) return empty
    try {
      parsed = JSON.parse(obj.trim())
    } catch {
      return empty
    }
  }

  if (!parsed || typeof parsed !== 'object') return empty

  const fields: Record<string, string> = {}
  for (const key of allowedFields) {
    const val = parsed[key]
    if (typeof val === 'string' && val.trim().length > 0) {
      fields[key] = val.trim()
    }
  }

  const tags: string[] = []
  if (Array.isArray(parsed.tags)) {
    for (const t of parsed.tags) {
      if (typeof t === 'string' && t.trim()) tags.push(t.trim().toLowerCase())
    }
  }

  return { fields, tags: [...new Set(tags)] }
}

export default defineEventHandler(async (event) => {
  const body = (await readBody(event)) as {
    name?: string
    type?: EntityType
    context?: string
  }

  if (!body?.name || typeof body.name !== 'string') {
    throw createError({ statusCode: 400, message: '"name" is required' })
  }
  if (!body.type || !VALID_TYPES.has(body.type)) {
    throw createError({ statusCode: 400, message: '"type" must be a valid entity type' })
  }

  const allowedFields = FIELD_SCHEMA[body.type]
  const name = body.name.trim().slice(0, 200)
  const context = body.context?.trim().slice(0, 600)

  try {
    const res = await fetch(`${OLLAMA_HOST}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        system: SYSTEM_PROMPT,
        prompt: buildUserPrompt(name, body.type, context),
        stream: false,
      }),
    })

    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      throw new Error(`Ollama returned ${res.status}: ${errText || res.statusText}`)
    }

    const data = (await res.json()) as { response?: string; error?: string }
    if (data.error) throw new Error(`Ollama error: ${data.error}`)

    return parseResponse(data.response ?? '', allowedFields)
  } catch (err: any) {
    throw createError({
      statusCode: 502,
      message: `Entity enrichment failed: ${err?.message || String(err)}`,
    })
  }
})
