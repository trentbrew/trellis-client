import {
  TrellisDocumentSchema,
  FlexibleTrellisDocumentSchema,
  TRELLIS_SCHEMA_VERSION,
  type TrellisDocument,
} from './schema'

export interface ValidationIssue {
  path: string
  message: string
  code?: string
}

export class TrellisValidationError extends Error {
  constructor(
    message: string,
    public issues: ValidationIssue[],
  ) {
    super(message)
    this.name = 'TrellisValidationError'
  }
}

/**
 * Validate a Trellis document (strict v2.0)
 * @throws TrellisValidationError if invalid
 */
export function validateTrellisDocument(data: unknown): TrellisDocument {
  const result = TrellisDocumentSchema.safeParse(data)

  if (!result.success) {
    const issues = result.error.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
      code: issue.code,
    }))

    throw new TrellisValidationError('Invalid Trellis document', issues)
  }

  return result.data
}

/**
 * Validate and return detailed errors (non-throwing)
 */
export function validateTrellisDocumentSafe(data: unknown): {
  valid: boolean
  data: TrellisDocument | null
  errors: ValidationIssue[]
} {
  const result = TrellisDocumentSchema.safeParse(data)

  return {
    valid: result.success,
    data: result.success ? result.data : null,
    errors: result.success
      ? []
      : result.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
          code: issue.code,
        })),
  }
}

/**
 * Validate flexibly (accepts v1.0 or v2.0)
 */
export function validateFlexibleDocument(data: unknown): {
  valid: boolean
  data: unknown
  version: string | null
  errors: ValidationIssue[]
} {
  const result = FlexibleTrellisDocumentSchema.safeParse(data)

  if (!result.success) {
    return {
      valid: false,
      data: null,
      version: null,
      errors: result.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
        code: issue.code,
      })),
    }
  }

  const doc = result.data as any
  const version = doc.version || '1.0'

  return {
    valid: true,
    data: result.data,
    version,
    errors: [],
  }
}

/**
 * Check if data is a valid Trellis document (type guard)
 */
export function isTrellisDocument(data: unknown): data is TrellisDocument {
  return TrellisDocumentSchema.safeParse(data).success
}

/**
 * Check if data looks like a Trellis document (loose check)
 * Checks for @context with trellis prefix
 */
export function looksLikeTrellisDocument(data: unknown): boolean {
  if (!data || typeof data !== 'object') return false

  const obj = data as Record<string, unknown>
  const ctx = obj['@context']

  if (!ctx || typeof ctx !== 'object') return false

  return 'trellis' in (ctx as Record<string, unknown>)
}

/**
 * Get the version of a Trellis document
 */
export function getTrellisDocumentVersion(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null

  const obj = data as Record<string, unknown>

  // v2.0 has explicit version
  if (typeof obj.version === 'string') {
    return obj.version
  }

  // v1.0 has @graph array
  if (Array.isArray(obj['@graph'])) {
    return '1.0'
  }

  // New format has graph.nodes
  if (obj.graph && typeof obj.graph === 'object') {
    return '1.0' // Assume 1.0 if no explicit version
  }

  return null
}

/**
 * Check if document needs migration
 */
export function needsMigration(data: unknown): boolean {
  const version = getTrellisDocumentVersion(data)
  return version !== null && version !== TRELLIS_SCHEMA_VERSION
}
