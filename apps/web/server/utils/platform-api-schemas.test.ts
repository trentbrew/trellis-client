// @vitest-environment node

import { describe, it, expect } from 'vitest'
import {
  PlatformAppCreateBodySchema,
  PlatformBulkUpdateBodySchema,
  PlatformDeleteBodySchema,
  PlatformInviteSendBodySchema,
  PlatformOrgCreateBodySchema,
  PlatformSettingGetQuerySchema,
  PlatformUpdateBodySchema,
} from './platform-api-schemas'

describe('platform-api-schemas', () => {
  it('requires names for create bodies and normalizes optional blanks', () => {
    expect(PlatformOrgCreateBodySchema.parse({ name: ' Turtle Labs ', slug: '' })).toMatchObject({
      name: 'Turtle Labs',
      slug: undefined,
    })
    expect(PlatformOrgCreateBodySchema.safeParse({ name: '' }).success).toBe(false)
    expect(PlatformAppCreateBodySchema.safeParse({ name: 'World', ontologies: ['task'] }).success).toBe(true)
  })

  it('keeps update and delete bodies optional for CLI callers', () => {
    expect(PlatformUpdateBodySchema.parse(undefined)).toEqual({})
    expect(PlatformDeleteBodySchema.parse(undefined)).toEqual({})
  })

  it('requires a settings key and defaults scope', () => {
    expect(PlatformSettingGetQuerySchema.parse({ key: 'theme' })).toEqual({ key: 'theme', scope: 'app' })
    expect(PlatformSettingGetQuerySchema.safeParse({}).success).toBe(false)
  })

  it('requires bulk update query and data', () => {
    expect(PlatformBulkUpdateBodySchema.parse({ query: 'FIND entity AS ?e', data: { done: true } })).toMatchObject({
      query: 'FIND entity AS ?e',
      data: { done: true },
    })
    expect(PlatformBulkUpdateBodySchema.safeParse({ query: 'FIND entity AS ?e' }).success).toBe(false)
  })

  it('accepts either single or batch invite emails', () => {
    expect(PlatformInviteSendBodySchema.parse({ email: 'person@example.com' })).toMatchObject({
      email: 'person@example.com',
    })
    expect(PlatformInviteSendBodySchema.parse({ emails: ['one@example.com'] })).toMatchObject({
      emails: ['one@example.com'],
    })
    expect(PlatformInviteSendBodySchema.safeParse({ emails: [] }).success).toBe(false)
  })
})
