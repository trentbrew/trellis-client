import type { H3Event } from 'h3'
import { createError, getQuery, readBody } from 'h3'
import type { ZodError } from 'zod'
import { z } from 'zod'

export type ApiInputSource = 'body' | 'query' | 'params'

export interface ApiValidationIssue {
  path: string
  message: string
  code: string
}

export interface ApiValidationErrorData {
  code: 'VALIDATION_ERROR'
  source: ApiInputSource
  issues: ApiValidationIssue[]
}

type ParseableSchema<T> = {
  parse: (_input: unknown) => T
}

export function formatValidationPath(path: Array<PropertyKey>): string {
  return path.length > 0 ? path.map(String).join('.') : '(root)'
}

export function formatZodIssues(error: ZodError): ApiValidationIssue[] {
  return error.issues.map((issue) => ({
    path: formatValidationPath(issue.path),
    message: issue.message,
    code: issue.code,
  }))
}

export function createApiValidationError(error: ZodError, source: ApiInputSource): never {
  const issues = formatZodIssues(error)
  const summary = issues.map((issue) => `${issue.path}: ${issue.message}`).join('; ')

  throw createError({
    statusCode: 400,
    statusMessage: 'Bad Request',
    message: summary ? `Invalid ${source}: ${summary}` : `Invalid ${source}`,
    data: {
      code: 'VALIDATION_ERROR',
      source,
      issues,
    } satisfies ApiValidationErrorData,
  })
}

export function validateApiInput<T>(schema: ParseableSchema<T>, input: unknown, source: ApiInputSource): T {
  try {
    return schema.parse(input)
  } catch (err) {
    if (err instanceof z.ZodError) {
      return createApiValidationError(err, source)
    }
    throw err
  }
}

export async function parseApiBody<T>(event: H3Event, schema: ParseableSchema<T>): Promise<T> {
  const body = await readBody(event).catch(() => undefined)
  return validateApiInput(schema, body, 'body')
}

export function parseApiQuery<T>(event: H3Event, schema: ParseableSchema<T>): T {
  return validateApiInput(schema, getQuery(event), 'query')
}

export function parseApiRouterParams<T>(event: H3Event, schema: ParseableSchema<T>): T {
  return validateApiInput(schema, event.context.params ?? {}, 'params')
}
