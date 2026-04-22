/**
 * LLM-powered email classifier.
 *
 * Given a message's headers + body, classifies the email's importance to the
 * user (critical/high/medium/low) and returns a short list of topical labels
 * (finance, travel, personal, work, newsletter, auth, promo, …).
 *
 * Designed to be called once-on-ingest from the Gmail notifier so the result
 * can be cached on the email entity and surfaced to the UI without paying for
 * another LLM round-trip.
 *
 * POST /api/classify-email-llm
 * Body: { subject: string, body: string, from?: string, to?: string }
 * Response: { importance: 'critical'|'high'|'medium'|'low', labels: string[] }
 */

const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434'
const DEFAULT_MODEL = process.env.TRELLIS_LLM_DEFAULT_MODEL || 'gemma4:e4b'

export type EmailImportance = 'critical' | 'high' | 'medium' | 'low'

export interface EmailClassification {
  importance: EmailImportance
  labels: string[]
}

const VALID_IMPORTANCE: ReadonlySet<EmailImportance> = new Set(['critical', 'high', 'medium', 'low'])

// Suggested label vocabulary — the LLM may emit any slug-like string but
// these are the conventions we prefer. Keep to 1–2 words, lowercase.
const SUGGESTED_LABELS = [
  'finance',
  'billing',
  'receipt',
  'invoice',
  'travel',
  'booking',
  'flight',
  'hotel',
  'real-estate',
  'rental',
  'housing',
  'personal',
  'family',
  'friends',
  'work',
  'meeting',
  'calendar',
  'task',
  'deadline',
  'newsletter',
  'marketing',
  'promo',
  'auth',
  'security',
  'notification',
  'social',
  'shopping',
  'order',
  'shipping',
  'support',
  'health',
  'legal',
  'hr',
  'investing',
  'news',
]

const SYSTEM_PROMPT = `You are an email triage assistant. Classify an incoming email into a single importance level and a short set of topical labels. Return ONLY valid JSON — no markdown, no code fences, no preamble.

Importance scale (bias toward "medium" — reserve higher levels for clear signals):
- critical: security alerts, account lockouts, fraud alerts, urgent personal emergencies
- high: direct personal messages, action items with a deadline, booked travel confirmations, financial alerts (card declines, payments due), scheduled meetings today/tomorrow
- medium: regular correspondence, newsletters from trusted sources, receipts, shipping updates
- low: bulk marketing, promotional offers, social updates, generic notifications, newsletters the user clearly doesn't read

Labels: 1–5 short lowercase slugs describing the email's topic. Prefer the known vocabulary when applicable; invent new slugs only when clearly needed.`

function buildUserPrompt(args: { subject: string; body: string; from?: string; to?: string }): string {
  const { subject, body, from, to } = args
  const header: string[] = []
  if (from) header.push(`From: ${from}`)
  if (to) header.push(`To: ${to}`)
  header.push(`Subject: ${subject}`)

  return `Classify this email.

${header.join('\n')}

Body:
"""
${body}
"""

Preferred labels (use these when applicable, invent sparingly):
${SUGGESTED_LABELS.join(', ')}

Return JSON in this exact shape:
{"importance": "critical" | "high" | "medium" | "low", "labels": ["label1", "label2"]}`
}

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

function normalizeLabel(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const slug = raw
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 30)
  return slug || null
}

function parseLLMResponse(raw: string): EmailClassification {
  const fallback: EmailClassification = { importance: 'medium', labels: [] }
  if (!raw) return fallback

  // The model may wrap JSON in markdown fences or add preamble. Extract the
  // first balanced {...} block.
  let jsonText = raw.trim()
  const fenceMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fenceMatch?.[1]) jsonText = fenceMatch[1].trim()

  const firstBrace = jsonText.indexOf('{')
  const lastBrace = jsonText.lastIndexOf('}')
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    jsonText = jsonText.slice(firstBrace, lastBrace + 1)
  }

  try {
    const parsed = JSON.parse(jsonText) as { importance?: unknown; labels?: unknown }
    const importance =
      typeof parsed.importance === 'string' && VALID_IMPORTANCE.has(parsed.importance as EmailImportance)
        ? (parsed.importance as EmailImportance)
        : 'medium'

    const labels: string[] = []
    if (Array.isArray(parsed.labels)) {
      const seen = new Set<string>()
      for (const raw of parsed.labels) {
        const slug = normalizeLabel(raw)
        if (slug && !seen.has(slug)) {
          labels.push(slug)
          seen.add(slug)
        }
        if (labels.length >= 5) break
      }
    }

    return { importance, labels }
  } catch {
    return fallback
  }
}

/**
 * Shared core so `gmail-ingest.ts` can call this directly without going
 * through HTTP — avoids an extra round-trip and keeps per-thread latency low.
 */
export async function classifyEmail(args: {
  subject: string
  body: string
  from?: string
  to?: string
}): Promise<EmailClassification> {
  const subject = (args.subject || '').trim().slice(0, 400)
  const rawBody = args.body || ''
  const body = stripHtml(rawBody).slice(0, 3000)

  // Too little signal to classify meaningfully — return medium+empty.
  if (subject.length + body.length < 20) {
    return { importance: 'medium', labels: [] }
  }

  const res = await fetch(`${OLLAMA_HOST}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      system: SYSTEM_PROMPT,
      prompt: buildUserPrompt({ subject, body, from: args.from, to: args.to }),
      stream: false,
    }),
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    throw new Error(`Ollama returned ${res.status}: ${errText || res.statusText}`)
  }

  const data = (await res.json()) as { response?: string; error?: string }
  if (data.error) throw new Error(`Ollama error: ${data.error}`)

  return parseLLMResponse(data.response ?? '')
}

export default defineEventHandler(async (event) => {
  const body = (await readBody(event)) as {
    subject?: string
    body?: string
    from?: string
    to?: string
  }

  if (typeof body?.subject !== 'string' || typeof body?.body !== 'string') {
    throw createError({ statusCode: 400, message: '"subject" and "body" are required strings' })
  }

  try {
    return await classifyEmail({
      subject: body.subject,
      body: body.body,
      from: body.from,
      to: body.to,
    })
  } catch (err: any) {
    throw createError({
      statusCode: 502,
      message: `Email classification failed: ${err?.message || String(err)}`,
    })
  }
})
