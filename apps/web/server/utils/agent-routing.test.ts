// @vitest-environment node
/**
 * Unit tests for the agent-routing classifier.
 *
 * The classifier is the heart of the "smart routing" surface: it picks
 * a task class per request and routes to the local Ollama Gemma model.
 * These tests lock in the routing decisions so we don't accidentally
 * break the surface by tweaking regex patterns.
 */

import { describe, it, expect } from 'vitest'
import {
  classifyRequest,
  resolveRoutingDecision,
  ROUTING_THRESHOLDS,
  MODEL_FAST,
  MODEL_BALANCED,
  MODEL_DEEP,
  type RoutingDecision,
} from './agent-routing'

describe('classifyRequest', () => {
  describe('lookup queries (short, factual) → MODEL_FAST', () => {
    const lookupExamples = [
      'show me my tasks',
      'list all my projects',
      'find my latest note',
      'what is my next meeting',
      'how many tasks do I have',
      'count my unread messages',
      'which tasks are overdue',
      'search for invoices',
      'look up John Smith',
      'give me the most recent file',
    ]

    it.each(lookupExamples)('classifies "%s" as lookup', (msg) => {
      const decision = classifyRequest(msg)
      expect(decision.taskClass).toBe('lookup')
      expect(decision.model).toBe(MODEL_FAST)
      expect(decision.rationale).toContain('Gemma')
    })

    it('routes lookups to Gemma for cost efficiency', () => {
      const decision = classifyRequest('show me my tasks')
      expect(decision.model).toMatch(/gemma/i)
    })
  })

  describe('reasoning queries (planning/analysis) → MODEL_DEEP', () => {
    const reasoningExamples = [
      'plan my Q3 roadmap',
      'design an architecture for the new feature',
      'analyze my workspace and tell me where to focus',
      'recommend a strategy for shipping faster',
      'compare our top three options',
      'evaluate the trade-offs between these approaches',
      'investigate why my last task failed',
      'diagnose the root cause of this bug',
      'what are the pros and cons of this design',
    ]

    it.each(reasoningExamples)('classifies "%s" as reasoning', (msg) => {
      const decision = classifyRequest(msg)
      expect(decision.taskClass).toBe('reasoning')
      expect(decision.model).toBe(MODEL_DEEP)
      expect(decision.rationale).toContain('Gemma')
    })

    it('classifies very long prompts as reasoning even without keywords', () => {
      // Build a prompt that exceeds the threshold without using reasoning keywords.
      const filler = 'word '.repeat(ROUTING_THRESHOLDS.reasoningWordCount + 5)
      const decision = classifyRequest(filler)
      expect(decision.taskClass).toBe('reasoning')
      expect(decision.rationale).toMatch(/Long prompt/)
    })
  })

  describe('creative queries (generation) → MODEL_BALANCED', () => {
    const creativeExamples = [
      'draft a standup update for tomorrow',
      'write a project description',
      'compose an email to the team',
      'generate a list of OKRs',
      'summarize my last week',
      'outline the next steps',
      'brainstorm ideas for the launch',
      'rewrite this paragraph more concisely',
      'rephrase the announcement',
    ]

    it.each(creativeExamples)('classifies "%s" as creative', (msg) => {
      const decision = classifyRequest(msg)
      expect(decision.taskClass).toBe('creative')
      expect(decision.model).toBe(MODEL_BALANCED)
    })
  })

  describe('default → synthesis', () => {
    const synthesisExamples = [
      "I'd like to know more about that",
      'tell me a story',
      'okay continue',
      'sure go ahead',
      'thanks',
    ]

    it.each(synthesisExamples)('classifies "%s" as synthesis', (msg) => {
      const decision = classifyRequest(msg)
      expect(decision.taskClass).toBe('synthesis')
      expect(decision.model).toBe(MODEL_BALANCED)
    })
  })

  describe('precedence rules', () => {
    it('treats long lookup-keyword prompts as reasoning, not lookup', () => {
      // "show me" appears, but the prompt is way over the maxLookupWords threshold.
      const longLookup = 'show me my tasks ' + 'and also '.repeat(40)
      const decision = classifyRequest(longLookup)
      expect(decision.taskClass).not.toBe('lookup')
    })

    it('reasoning keywords beat creative keywords', () => {
      // Both "draft" (creative) and "plan" (reasoning) appear; reasoning wins.
      const decision = classifyRequest('plan and draft a roadmap')
      expect(decision.taskClass).toBe('reasoning')
    })

    it('case-insensitive matching', () => {
      const decision = classifyRequest('SHOW ME MY TASKS')
      expect(decision.taskClass).toBe('lookup')
    })
  })

  describe('edge cases', () => {
    it('handles empty string gracefully', () => {
      const decision = classifyRequest('')
      expect(decision.taskClass).toBe('synthesis')
      expect(decision.model).toBe(MODEL_BALANCED)
    })

    it('handles whitespace-only string', () => {
      const decision = classifyRequest('   \n  \t  ')
      expect(decision.taskClass).toBe('synthesis')
    })

    it('handles null-like input safely', () => {
      // @ts-expect-error — testing runtime guard
      const decision = classifyRequest(null)
      expect(decision.taskClass).toBe('synthesis')
    })

    it('handles undefined input safely', () => {
      // @ts-expect-error — testing runtime guard
      const decision = classifyRequest(undefined)
      expect(decision.taskClass).toBe('synthesis')
    })

    it('always returns a valid RoutingDecision shape', () => {
      const decision = classifyRequest('any random message')
      expect(decision).toMatchObject({
        model: expect.any(String),
        taskClass: expect.any(String),
        rationale: expect.any(String),
      })
      expect(decision.model.length).toBeGreaterThan(0)
      expect(decision.rationale.length).toBeGreaterThan(0)
    })
  })
})

describe('resolveRoutingDecision', () => {
  it('respects explicit OLLAMA_MODEL override', () => {
    const decision = resolveRoutingDecision('show me my tasks', 'gemma4:e4b')
    expect(decision.taskClass).toBe('override')
    expect(decision.model).toBe('gemma4:e4b')
    expect(decision.rationale).toContain('OLLAMA_MODEL')
  })

  it('falls back to classifier when env is undefined', () => {
    const decision = resolveRoutingDecision('show me my tasks', undefined)
    expect(decision.taskClass).toBe('lookup')
    expect(decision.model).toBe(MODEL_FAST)
  })

  it('falls back to classifier when env is empty string', () => {
    const decision = resolveRoutingDecision('show me my tasks', '')
    expect(decision.taskClass).toBe('lookup')
  })

  it('falls back to classifier when env is whitespace only', () => {
    const decision = resolveRoutingDecision('show me my tasks', '   ')
    expect(decision.taskClass).toBe('lookup')
  })

  it('preserves auto:* routing modes when set explicitly', () => {
    const decision = resolveRoutingDecision('plan something', 'auto:balance')
    expect(decision.taskClass).toBe('override')
    expect(decision.model).toBe('auto:balance')
  })

  it('returns a stable RoutingDecision shape regardless of input', () => {
    const cases: Array<[string, string | undefined]> = [
      ['show me tasks', undefined],
      ['plan a roadmap', 'anthropic:claude-3-opus-20240229'],
      ['', 'auto:cost'],
      ['hello', ''],
    ]
    for (const [msg, env] of cases) {
      const decision: RoutingDecision = resolveRoutingDecision(msg, env)
      expect(decision).toMatchObject({
        model: expect.any(String),
        taskClass: expect.any(String),
        rationale: expect.any(String),
      })
    }
  })
})

describe('routing model identifiers', () => {
  it('all default models are non-empty strings', () => {
    expect(MODEL_FAST.length).toBeGreaterThan(0)
    expect(MODEL_BALANCED.length).toBeGreaterThan(0)
    expect(MODEL_DEEP.length).toBeGreaterThan(0)
  })

  it('MODEL_FAST is the local Gemma model (Ollama)', () => {
    expect(MODEL_FAST).toMatch(/gemma/i)
  })

  it('MODEL_BALANCED is the local Gemma model (Ollama)', () => {
    expect(MODEL_BALANCED).toMatch(/gemma/i)
  })

  it('MODEL_DEEP is the local Gemma model (Ollama)', () => {
    expect(MODEL_DEEP).toMatch(/gemma/i)
  })

  it('default models use the `model:tag` format (Ollama)', () => {
    const looksTagged = (m: string) => /^[a-z0-9._-]+:[a-z0-9._-]+$/i.test(m)
    expect(looksTagged(MODEL_FAST)).toBe(true)
    expect(looksTagged(MODEL_BALANCED)).toBe(true)
    expect(looksTagged(MODEL_DEEP)).toBe(true)
  })
})
