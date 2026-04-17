/**
 * LLM-powered entity extraction endpoint.
 *
 * Takes email (or other) text content and uses Gemma 4 via Ollama to
 * extract structured entity candidates and tags.
 *
 * POST /api/extract-entities-llm
 * Body: { text: string }
 * Response: { entities: EntityCandidate[], tags: string[] }
 */

const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434'
const DEFAULT_MODEL = process.env.TRELLIS_LLM_DEFAULT_MODEL || 'gemma4:e4b'

const MAX_TEXT_LENGTH = 4000

const SYSTEM_PROMPT = `You are an entity extraction assistant for a personal knowledge graph. Extract structured entities from the provided text. Return ONLY valid JSON with no markdown formatting, no code fences, no explanation.`

function buildUserPrompt(text: string): string {
  return `Extract entities from this email. For each entity provide:
- name: the entity's proper name (not generic descriptions)
- type: one of [person, organization, project, task, event]
- confidence: high, medium, or low
- context: brief phrase explaining why this was extracted

Also extract relevant tags (topics, themes, keywords — lowercase, no duplicates).

Return JSON in this exact format:
{"entities":[{"name":"...","type":"...","confidence":"...","context":"..."}],"tags":["tag1","tag2"]}

Email text:
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

interface EntityCandidate {
  name: string
  type: 'person' | 'organization' | 'project' | 'task' | 'event'
  confidence: 'high' | 'medium' | 'low'
  context: string
}

interface ExtractionResult {
  entities: EntityCandidate[]
  tags: string[]
}

const VALID_TYPES = new Set(['person', 'organization', 'project', 'task', 'event'])
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
        VALID_TYPES.has(e.type) &&
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
  const body = (await readBody(event)) as { text?: string }

  if (!body?.text || typeof body.text !== 'string') {
    throw createError({ statusCode: 400, message: '"text" is required' })
  }

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
        prompt: buildUserPrompt(text),
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
