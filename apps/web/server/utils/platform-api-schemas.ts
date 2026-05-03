import { z } from 'zod'

const emptyToUndefined = (value: unknown) => {
  if (typeof value !== 'string') return value
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

const RequiredStringSchema = z.string().trim().min(1)
const OptionalStringSchema = z.preprocess(emptyToUndefined, z.string().optional())
const DefaultScopeSchema = z.preprocess((value) => emptyToUndefined(value) ?? 'app', z.string())
const StringRecordSchema = z.record(z.string(), z.unknown())
const OptionalStringArraySchema = z.array(z.string().trim().min(1)).optional()

export const PlatformOptionalAppQuerySchema = z.object({
  appId: OptionalStringSchema,
})

export const PlatformAppListQuerySchema = z.object({
  orgId: OptionalStringSchema,
})

export const PlatformContextQuerySchema = z.object({
  orgId: OptionalStringSchema,
  appId: OptionalStringSchema,
})

export const PlatformSettingGetQuerySchema = z.object({
  key: RequiredStringSchema,
  scope: DefaultScopeSchema,
})

export const PlatformSettingListQuerySchema = z.object({
  scope: DefaultScopeSchema,
})

export const PlatformOrgCreateBodySchema = z
  .object({
    name: RequiredStringSchema,
    slug: OptionalStringSchema,
    description: OptionalStringSchema,
    agentId: OptionalStringSchema,
  })
  .passthrough()

export const PlatformAppCreateBodySchema = z
  .object({
    name: RequiredStringSchema,
    slug: OptionalStringSchema,
    orgId: OptionalStringSchema,
    icon: OptionalStringSchema,
    color: OptionalStringSchema,
    description: OptionalStringSchema,
    ontologies: z.array(z.unknown()).optional(),
    agentId: OptionalStringSchema,
  })
  .passthrough()

export const PlatformUpdateBodySchema = z
  .object({
    data: StringRecordSchema.optional(),
    agentId: OptionalStringSchema,
  })
  .passthrough()
  .default({})

export const PlatformDeleteBodySchema = z
  .object({
    agentId: OptionalStringSchema,
  })
  .passthrough()
  .default({})

export const PlatformCollectionCreateBodySchema = z
  .object({
    name: RequiredStringSchema,
    slug: OptionalStringSchema,
    appId: OptionalStringSchema,
    type: OptionalStringSchema,
    description: OptionalStringSchema,
    schema: z.unknown().optional(),
    agentId: OptionalStringSchema,
  })
  .passthrough()

export const PlatformPageCreateBodySchema = z
  .object({
    title: RequiredStringSchema,
    appId: OptionalStringSchema,
    dataSource: OptionalStringSchema,
    layout: OptionalStringSchema,
    defaultProjection: OptionalStringSchema,
    description: OptionalStringSchema,
    icon: OptionalStringSchema,
    agentId: OptionalStringSchema,
  })
  .passthrough()

export const PlatformCommentAddBodySchema = z
  .object({
    entityId: RequiredStringSchema,
    content: RequiredStringSchema,
    commentType: OptionalStringSchema,
    authorId: OptionalStringSchema,
    authorName: OptionalStringSchema,
    metadata: z.unknown().optional(),
    agentId: OptionalStringSchema,
  })
  .passthrough()

export const PlatformTagCreateBodySchema = z
  .object({
    name: RequiredStringSchema,
    color: OptionalStringSchema,
    description: OptionalStringSchema,
    agentId: OptionalStringSchema,
  })
  .passthrough()

export const PlatformTagAssignBodySchema = z
  .object({
    entityId: RequiredStringSchema,
    tags: z.array(z.string().trim().min(1)),
    agentId: OptionalStringSchema,
  })
  .passthrough()

export const PlatformBulkUpdateBodySchema = z
  .object({
    query: RequiredStringSchema,
    data: StringRecordSchema,
    agentId: OptionalStringSchema,
  })
  .passthrough()

export const PlatformBulkDeleteBodySchema = z
  .object({
    query: RequiredStringSchema,
    agentId: OptionalStringSchema,
  })
  .passthrough()

export const PlatformWorkflowCreateBodySchema = z
  .object({
    name: RequiredStringSchema,
    appId: OptionalStringSchema,
    trigger: z.unknown().optional(),
    graph: z.unknown().optional(),
    description: OptionalStringSchema,
    agentId: OptionalStringSchema,
  })
  .passthrough()

export const PlatformSettingSetBodySchema = z
  .object({
    key: RequiredStringSchema,
    value: z.unknown().optional(),
    scope: OptionalStringSchema,
    agentId: OptionalStringSchema,
  })
  .passthrough()

export const PlatformFileUploadBodySchema = z
  .object({
    entityId: OptionalStringSchema,
    field: OptionalStringSchema,
    fileBase64: RequiredStringSchema,
    filename: RequiredStringSchema,
    contentType: OptionalStringSchema,
    agentId: OptionalStringSchema,
  })
  .passthrough()

export const PlatformInviteSendBodySchema = z
  .object({
    email: OptionalStringSchema,
    emails: OptionalStringArraySchema,
    role: OptionalStringSchema,
    orgId: OptionalStringSchema,
    orgName: OptionalStringSchema,
    agentId: OptionalStringSchema,
  })
  .passthrough()
  .superRefine((input, ctx) => {
    const emailCount = input.emails?.length ?? 0
    if (!input.email && emailCount === 0) {
      ctx.addIssue({ code: 'custom', path: ['email'], message: '"email" or "emails" is required' })
    }
  })
