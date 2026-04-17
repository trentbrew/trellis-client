/**
 * Embedding proxy endpoint (Ollama by default).
 *
 * Mirrors the generate.post.ts pattern but targets the embedding endpoint.
 * Ollama's /api/embed accepts either a single string or an array in `input`
 * and returns `{ embeddings: number[][] }`. We always normalize to an array
 * response so callers can batch without branching.
 *
 * Request body:
 *   {
 *     model?: string      // default: nomic-embed-text
 *     input: string | string[]
 *   }
 *
 * Response:
 *   {
 *     model: string
 *     provider: 'ollama'
 *     dimensions: number
 *     embeddings: number[][]   // one vector per input
 *   }
 */

const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434'
const DEFAULT_EMBED_MODEL = process.env.TRELLIS_EMBED_MODEL || 'nomic-embed-text'

interface OllamaEmbedResponse {
  model?: string
  embeddings?: number[][]
  // Older Ollama builds returned `embedding` (singular) on /api/embeddings.
  embedding?: number[]
  error?: string
}

async function callOllamaEmbed(params: { model: string; input: string[] }): Promise<number[][]> {
  const res = await fetch(`${OLLAMA_HOST}/api/embed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: params.model, input: params.input }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Ollama /api/embed returned ${res.status}: ${text || res.statusText}`)
  }

  const data = (await res.json()) as OllamaEmbedResponse
  if (data.error) throw new Error(`Ollama error: ${data.error}`)

  if (Array.isArray(data.embeddings) && data.embeddings.length > 0) {
    return data.embeddings
  }
  // Legacy single-vector shape fallback.
  if (Array.isArray(data.embedding) && data.embedding.length > 0) {
    return [data.embedding]
  }
  throw new Error('Ollama returned no embeddings')
}

export default defineEventHandler(async (event) => {
  const body = (await readBody(event)) as {
    model?: string
    input?: string | string[]
  }

  if (!body?.input) {
    throw createError({ statusCode: 400, message: '"input" is required' })
  }

  const inputs = Array.isArray(body.input) ? body.input : [body.input]
  const cleaned = inputs
    .map((s) => (typeof s === 'string' ? s.trim() : ''))
    .filter((s) => s.length > 0)

  if (cleaned.length === 0) {
    throw createError({ statusCode: 400, message: '"input" must contain at least one non-empty string' })
  }

  const model = body.model || DEFAULT_EMBED_MODEL

  try {
    const embeddings = await callOllamaEmbed({ model, input: cleaned })
    return {
      model,
      provider: 'ollama' as const,
      dimensions: embeddings[0]?.length ?? 0,
      embeddings,
    }
  } catch (err: any) {
    throw createError({
      statusCode: 502,
      message: `Embed call failed (ollama:${model}): ${err?.message || String(err)}`,
    })
  }
})
