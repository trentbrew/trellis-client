import type { LLMClient } from '@turtle.tech/trellis-kernel/graph'

/**
 * LLM client factory.
 *
 * Returns an LLMClient that conforms to the @turtle.tech/trellis-kernel/graph interface.
 * All calls are proxied through /api/llm/generate (the Nuxt server) so that:
 *   - Ollama (localhost:11434) is not called directly from the browser (CORS)
 *   - Gemini API keys remain server-side
 *   - Server-scheduled workflows use the same code path
 *
 * Model routing is handled server-side based on the model identifier:
 *   - Models starting with "gemini-" → Gemini
 *   - Anything else → Ollama (default: gemma4:e4b)
 */

export interface LLMGenerateResponse {
  text: string
  model: string
  provider: 'ollama' | 'gemini'
}

export interface CreateLLMClientOptions {
  /** Default model to use when the caller doesn't specify one. */
  defaultModel?: string
  /** Override the endpoint (useful for tests). */
  endpoint?: string
  /** Optional fetch impl override. */
  fetchImpl?: typeof fetch
}

export function createLLMClient(options: CreateLLMClientOptions = {}): LLMClient {
  const endpoint = options.endpoint ?? '/api/llm/generate'
  const fetchImpl = options.fetchImpl ?? fetch

  const client: LLMClient = async (req) => {
    const res = await fetchImpl(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: req.model ?? options.defaultModel,
        system: req.system,
        prompt: req.prompt,
      }),
    })

    if (!res.ok) {
      const detail = await res.text().catch(() => res.statusText)
      throw new Error(`LLM request failed (${res.status}): ${detail}`)
    }

    const data = (await res.json()) as LLMGenerateResponse
    return { text: data.text ?? '' }
  }

  return client
}

/** Convenience preset for the default Ollama + Gemma configuration. */
export function createDefaultLLMClient(): LLMClient {
  return createLLMClient({ defaultModel: 'gemma4:e4b' })
}
