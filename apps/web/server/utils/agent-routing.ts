/**
 * Agent routing — classifies an incoming user message into a task class
 * and picks the appropriate model for TokenRouter to dispatch to.
 *
 * Pure module (no side effects, no IO) so it's trivially testable.
 *
 * The mapping from `taskClass` to `model` is intentionally explicit and
 * lives in one place. Swap MODEL_FAST / MODEL_BALANCED / MODEL_DEEP to
 * change the cost/quality profile of the entire agent surface in one edit.
 */

/**
 * Default model identifiers. These are passed verbatim to TokenRouter
 * (api.tokenrouter.com/v1/chat/completions). IDs come from the catalog at
 * `GET /v1/models` and may use either:
 *   - Bare names (e.g. `claude-haiku-4-5`)
 *   - `<provider>/<model>` (e.g. `anthropic/claude-sonnet-4.5`, `openai/gpt-5.2`)
 *
 * Override any of these via the `TOKENROUTER_MODEL` env var (the override
 * always bypasses the classifier).
 */
export const MODEL_FAST = 'claude-haiku-4-5'
export const MODEL_BALANCED = 'anthropic/claude-sonnet-4.5'
export const MODEL_DEEP = 'anthropic/claude-opus-4.7'

export type TaskClass = 'lookup' | 'synthesis' | 'reasoning' | 'creative' | 'vision' | 'override'

export interface RoutingDecision {
  model: string
  taskClass: TaskClass
  rationale: string
}

/**
 * Pre-compiled regexes for performance and easier testing.
 */
const LOOKUP_SIGNALS =
  /\b(show me|list|find|what is|what are|how many|count|get my|which|search|look up|give me the)\b/i

const REASONING_SIGNALS =
  /\b(plan|design|architect|strategy|analyze|analyse|recommend|compare|evaluate|reason|investigate|diagnose|pros and cons|trade[- ]offs?)\b/i

const CREATIVE_SIGNALS = /\b(draft|write|compose|generate|summarize|summarise|outline|brainstorm|rewrite|rephrase)\b/i

/** Soft thresholds — tweak these to tune routing aggressiveness. */
export const ROUTING_THRESHOLDS = {
  maxLookupWords: 25,
  reasoningWordCount: 60,
} as const

/**
 * Classify an incoming user message into a task class and pick the right model.
 * This is an intentionally simple heuristic that's fast, explainable, and
 * produces a visible routing story for the UI badge.
 *
 * Precedence (specific signals beat generic lookup):
 *   1. Long prompts or explicit reasoning verbs → `reasoning` → deep model
 *   2. Generation verbs (write/draft/generate/etc.) → `creative` → balanced model
 *   3. Short factual queries → `lookup` → fast/cheap model
 *   4. Otherwise → `synthesis` → balanced model (default)
 *
 * Reasoning and Creative are checked first because their signals are more
 * specific than the lookup signal set. e.g. "generate a list of OKRs" should
 * route to creative (because of "generate"), not to lookup (because of "list").
 */
export function classifyRequest(message: string): RoutingDecision {
  const text = (message ?? '').trim()
  const lower = text.toLowerCase()
  const wordCount = text.length === 0 ? 0 : text.split(/\s+/).filter(Boolean).length

  // 1. Reasoning: multi-step analysis, planning, architecture (most specific)
  if (REASONING_SIGNALS.test(lower) || wordCount > ROUTING_THRESHOLDS.reasoningWordCount) {
    return {
      model: MODEL_DEEP,
      taskClass: 'reasoning',
      rationale:
        wordCount > ROUTING_THRESHOLDS.reasoningWordCount
          ? `Long prompt (${wordCount} words). Routed to Sonnet for deeper reasoning.`
          : 'Multi-step reasoning detected. Routed to Sonnet for depth.',
    }
  }

  // 2. Creative: generation, drafting, summarization
  if (CREATIVE_SIGNALS.test(lower)) {
    return {
      model: MODEL_BALANCED,
      taskClass: 'creative',
      rationale: 'Generation/composition task. Routed to Sonnet for quality.',
    }
  }

  // 3. Lookup: short, direct, factual queries
  if (LOOKUP_SIGNALS.test(lower) && wordCount <= ROUTING_THRESHOLDS.maxLookupWords) {
    return {
      model: MODEL_FAST,
      taskClass: 'lookup',
      rationale: `Short factual query (${wordCount} words). Routed to Haiku for speed & cost.`,
    }
  }

  // 4. Default: general synthesis
  return {
    model: MODEL_BALANCED,
    taskClass: 'synthesis',
    rationale: 'General synthesis task. Routed to Sonnet (balanced default).',
  }
}

/**
 * Resolve the final routing decision honoring the explicit `TOKENROUTER_MODEL`
 * env override. Pure helper — caller passes both the message and the env value.
 */
export function resolveRoutingDecision(
  message: string,
  explicitModel: string | undefined,
  opts?: { hasImages?: boolean },
): RoutingDecision {
  const trimmed = explicitModel?.trim()
  if (trimmed) {
    return {
      model: trimmed,
      taskClass: 'override',
      rationale: `Explicit model pinned via TOKENROUTER_MODEL env (${trimmed}).`,
    }
  }

  if (opts?.hasImages) {
    return {
      model: MODEL_BALANCED,
      taskClass: 'vision',
      rationale: 'Image attachment detected. Routed to Sonnet for vision.',
    }
  }

  return classifyRequest(message)
}
