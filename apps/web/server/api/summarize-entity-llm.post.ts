/**
 * LLM-powered entity summarization endpoint.
 *
 * Given an entity's raw description/body text (often noisy — GCal meeting
 * metadata, email signatures, Calendly boilerplate, etc.), produces a
 * clean 1–3 sentence summary capturing the essential meaning.
 *
 * POST /api/summarize-entity-llm
 * Body: { text: string, type?: string, title?: string }
 * Response: { summary: string }
 *
 * Returns an empty summary string when the input is too short or the LLM
 * declines — callers should fall back to the raw text in that case.
 */

const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434'
const DEFAULT_MODEL = process.env.TRELLIS_LLM_DEFAULT_MODEL || 'gemma4:e4b'

// Per-class instructions so summaries fit the entity's purpose.
const CLASS_HINTS: Record<string, string> = {
  temporal: 'Summarize the purpose or agenda of this event/task in 1–2 sentences. Focus on what is happening and why.',
  document: 'Summarize the key point of this note/document in 1–3 sentences. Capture the TL;DR.',
  actor: 'Summarize who this person/organization is in 1–2 sentences. Role, affiliation, relevance.',
  container: 'Summarize the scope and outcome of this project/goal in 1–2 sentences.',
}

// Map entity type → class for prompt specialization.
const TYPE_TO_CLASS: Record<string, keyof typeof CLASS_HINTS> = {
  event: 'temporal',
  appointment: 'temporal',
  trip: 'temporal',
  task: 'temporal',
  deadline: 'temporal',
  payment: 'temporal',
  note: 'document',
  email: 'document',
  file: 'document',
  bookmark: 'document',
  blog_post: 'document',
  portfolio_item: 'document',
  person: 'actor',
  contact: 'actor',
  organization: 'actor',
  project: 'container',
  goal: 'container',
  milestone: 'container',
  folder: 'container',
}

const SYSTEM_PROMPT = `You are a concise summarization assistant. Produce a plain-text summary of the given content. Return ONLY the summary text — no preamble, no markdown, no quotes, no commentary. Strip boilerplate (dial-in numbers, signatures, calendar links, unsubscribe notices). Do NOT invent facts.`

function buildUserPrompt(text: string, type?: string, title?: string): string {
  const klass = type && TYPE_TO_CLASS[type]
  const hint = klass ? CLASS_HINTS[klass] : 'Summarize the content in 1–3 sentences.'
  const titlePart = title ? `\nTitle: "${title}"` : ''

  return `${hint}${titlePart}

Content:
"""
${text}
"""

Summary:`
}

/**
 * Strip HTML tags (cheap, not perfect) before sending to the LLM.
 * GCal descriptions often arrive as HTML soup; summarizing the plain-text
 * form yields cleaner results and saves tokens.
 */
function stripHtml(input: string): string {
  return input
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|ul|ol|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/**
 * Shared core so server-side callers (e.g. gmail-ingest.ts) can invoke
 * summarization directly without paying for an HTTP round-trip.
 */
export async function summarizeText(args: { text: string; type?: string; title?: string }): Promise<string> {
  const cleaned = stripHtml(args.text).slice(0, 4000)
  if (cleaned.length < 80) return ''

  const res = await fetch(`${OLLAMA_HOST}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      system: SYSTEM_PROMPT,
      prompt: buildUserPrompt(cleaned, args.type, args.title),
      stream: false,
    }),
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    throw new Error(`Ollama returned ${res.status}: ${errText || res.statusText}`)
  }

  const data = (await res.json()) as { response?: string; error?: string }
  if (data.error) throw new Error(`Ollama error: ${data.error}`)

  let summary = (data.response ?? '').trim()
  // Defensive: strip surrounding quotes or "Summary:" prefix if the model added them.
  summary = summary
    .replace(/^Summary:\s*/i, '')
    .replace(/^["']|["']$/g, '')
    .trim()
  return summary
}

export default defineEventHandler(async (event) => {
  const body = (await readBody(event)) as {
    text?: string
    type?: string
    title?: string
  }

  if (!body?.text || typeof body.text !== 'string') {
    throw createError({ statusCode: 400, message: '"text" is required' })
  }

  try {
    const summary = await summarizeText({ text: body.text, type: body.type, title: body.title })
    return { summary }
  } catch (err: any) {
    throw createError({
      statusCode: 502,
      message: `Summarization failed: ${err?.message || String(err)}`,
    })
  }
})
