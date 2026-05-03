// @vitest-environment node

import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import { formatValidationPath, formatZodIssues, validateApiInput } from './api-validation'

describe('api-validation', () => {
  it('formats empty paths as the root marker', () => {
    expect(formatValidationPath([])).toBe('(root)')
  })

  it('formats nested issue paths with dots', () => {
    expect(formatValidationPath(['graph', 'nodes', 0, 'id'])).toBe('graph.nodes.0.id')
  })

  it('formats Zod issues into JSON-safe validation details', () => {
    const schema = z.object({
      email: z.string().email(),
      graph: z.object({
        nodes: z.array(z.object({ id: z.string().min(1) })),
      }),
    })

    const result = schema.safeParse({ email: 'bad', graph: { nodes: [{ id: '' }] } })
    expect(result.success).toBe(false)
    if (result.success) return

    expect(formatZodIssues(result.error)).toEqual([
      expect.objectContaining({ path: 'email', code: 'invalid_format' }),
      expect.objectContaining({ path: 'graph.nodes.0.id', code: 'too_small' }),
    ])
  })

  it('returns parsed data for valid input', () => {
    const schema = z.object({
      email: z.string().trim().toLowerCase().email(),
    })

    expect(validateApiInput(schema, { email: '  USER@EXAMPLE.COM ' }, 'query')).toEqual({
      email: 'user@example.com',
    })
  })

  it('throws an H3 400 with structured validation details for invalid input', () => {
    const schema = z.object({
      email: z.string().email(),
    })

    expect(() => validateApiInput(schema, { email: 'not-an-email' }, 'query')).toThrow(/Invalid query/)

    try {
      validateApiInput(schema, { email: 'not-an-email' }, 'query')
    } catch (err: unknown) {
      const error = err as { statusCode?: number; statusMessage?: string; data?: unknown }
      expect(error.statusCode).toBe(400)
      expect(error.statusMessage).toBe('Bad Request')
      expect(error.data).toMatchObject({
        code: 'VALIDATION_ERROR',
        source: 'query',
        issues: [expect.objectContaining({ path: 'email' })],
      })
    }
  })
})
