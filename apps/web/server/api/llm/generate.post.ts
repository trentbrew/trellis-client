import { GoogleGenerativeAI } from '@google/generative-ai'

/**
 * Unified LLM proxy endpoint.
 *
 * Routes to either Ollama (local, default) or Gemini (cloud) based on the
 * model identifier. Keeps the Gemini API key server-side and avoids browser
 * CORS issues when calling Ollama from the client.
 *
 * Request body:
 *   {
 *     model?: string     // e.g. "gemma4:e4b" (Ollama) or "gemini-2.0-flash" (Gemini)
 *     system?: string    // system prompt (optional)
 *     prompt: string     // user prompt (required)
 *   }
 *
 * Response:
 *   { text: string, model: string, provider: 'ollama' | 'gemini' }
 */

const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434'
const DEFAULT_MODEL = process.env.TRELLIS_LLM_DEFAULT_MODEL || 'gemma4:e4b'

function isGeminiModel(model: string): boolean {
  return /^gemini-/i.test(model)
}

async function callOllama(params: { model: string; system?: string; prompt: string }): Promise<string> {
  const res = await fetch(`${OLLAMA_HOST}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: params.model,
      prompt: params.prompt,
      system: params.system,
      stream: false,
    }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Ollama returned ${res.status}: ${text || res.statusText}`)
  }

  const data = (await res.json()) as { response?: string; error?: string }
  if (data.error) throw new Error(`Ollama error: ${data.error}`)
  return data.response ?? ''
}

async function callGemini(params: { model: string; system?: string; prompt: string }): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured')

  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({
    model: params.model,
    ...(params.system ? { systemInstruction: params.system } : {}),
  })

  const result = await model.generateContent(params.prompt)
  return result.response.text()
}

export default defineEventHandler(async (event) => {
  const body = (await readBody(event)) as {
    model?: string
    system?: string
    prompt?: string
  }

  if (!body?.prompt || typeof body.prompt !== 'string') {
    throw createError({ statusCode: 400, message: '"prompt" is required' })
  }

  const model = body.model || DEFAULT_MODEL

  // Special case: the workflow Start node uses model="passthrough" to forward
  // its input without invoking any LLM. Echo the prompt back.
  if (model === 'passthrough') {
    return { text: body.prompt, model, provider: 'passthrough' as const }
  }

  const provider: 'ollama' | 'gemini' = isGeminiModel(model) ? 'gemini' : 'ollama'

  try {
    const text =
      provider === 'gemini'
        ? await callGemini({ model, system: body.system, prompt: body.prompt })
        : await callOllama({ model, system: body.system, prompt: body.prompt })

    return { text, model, provider }
  } catch (err: any) {
    throw createError({
      statusCode: 502,
      message: `LLM call failed (${provider}:${model}): ${err?.message || String(err)}`,
    })
  }
})
