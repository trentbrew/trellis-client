import { normalizeDatabaseSchema, parseCollectionIdFromSchemaSettingKey } from '~/lib/normalizeDatabaseSchema'
import { normalizeProjections } from '~/lib/projections'

export const CURRENT_DATA_VERSION = 2

export async function migrateUserToV1(instant: any, ownerId: string) {
  const tx = instant.tx as any

  const resp = await instant.queryOnce({
    settings: {
      $: {
        where: {
          ownerId,
          entityType: 'collection',
          key: 'schema',
        },
      },
    },
  })

  const settings = (((resp.data as any)?.settings || []) as any[]).filter((s) => s && typeof s === 'object')
  if (!settings.length) return

  const now = Date.now()
  const chunks: any[] = []

  for (const s of settings) {
    const id = typeof s.id === 'string' ? s.id : ''
    const entityId = typeof s.entityId === 'string' ? s.entityId : ''
    const settingKeyFromRecord = typeof s.settingKey === 'string' ? s.settingKey : ''
    const collectionId = entityId || parseCollectionIdFromSchemaSettingKey(settingKeyFromRecord) || ''
    if (!id || !collectionId) continue

    const expectedSettingKey = `collection:${collectionId}:schema`
    const normalized = normalizeDatabaseSchema(s.value, collectionId)

    const needsRepair =
      settingKeyFromRecord !== expectedSettingKey ||
      !s.value ||
      typeof s.value !== 'object' ||
      Array.isArray(s.value) ||
      !Array.isArray((s.value as any).fields) ||
      !Array.isArray((s.value as any).views) ||
      (Array.isArray((s.value as any).views) && (s.value as any).views.length === 0)

    if (!needsRepair) continue

    const nextValue = {
      ...normalized,
      id,
      collectionId,
      fields: JSON.parse(JSON.stringify(normalized.fields)),
      views: JSON.parse(JSON.stringify(normalized.views)),
      updatedAt: now,
    }

    chunks.push(
      tx.settings[id].update({
        ownerId,
        settingKey: expectedSettingKey,
        entityType: 'collection',
        entityId: collectionId,
        key: 'schema',
        value: nextValue,
        updatedAt: now,
      }),
    )
  }

  if (chunks.length) {
    await instant.transact(chunks)
  }
}

export async function migrateUserToV2(instant: any, ownerId: string) {
  const tx = instant.tx as any

  const collectionsResp = await instant.queryOnce({
    collections: {
      $: {
        where: {
          ownerId,
        },
      },
    },
  })

  const collectionTypeById = new Map<string, any>()
  const collections = (((collectionsResp.data as any)?.collections || []) as any[]).filter(
    (c) => c && typeof c === 'object',
  )
  collections.forEach((c) => {
    if (typeof c.id === 'string' && c.id) {
      collectionTypeById.set(c.id, c.type)
    }
  })

  const resp = await instant.queryOnce({
    settings: {
      $: {
        where: {
          ownerId,
          entityType: 'collection',
          key: 'projections',
        },
      },
    },
  })

  const settings = (((resp.data as any)?.settings || []) as any[]).filter((s) => s && typeof s === 'object')
  if (!settings.length) return

  const now = Date.now()
  const chunks: any[] = []

  for (const s of settings) {
    const id = typeof s.id === 'string' ? s.id : ''
    const entityId = typeof s.entityId === 'string' ? s.entityId : ''
    if (!id || !entityId) continue

    const expectedSettingKey = `collection:${entityId}:projections`
    const settingKeyFromRecord = typeof s.settingKey === 'string' ? s.settingKey : ''

    const collectionType = collectionTypeById.get(entityId) || 'database'
    const normalized = normalizeProjections(s.value, entityId, collectionType)

    const needsRepair =
      settingKeyFromRecord !== expectedSettingKey ||
      !Array.isArray(s.value) ||
      (s.value && typeof s.value === 'object' && Array.isArray((s.value as any).projections))

    if (!needsRepair) continue

    const nextValue = normalized.map((p) => ({
      ...p,
      config: JSON.parse(JSON.stringify(p.config)),
      query: p.query ? JSON.parse(JSON.stringify(p.query)) : undefined,
    }))

    chunks.push(
      tx.settings[id].update({
        ownerId,
        settingKey: expectedSettingKey,
        entityType: 'collection',
        entityId,
        key: 'projections',
        value: nextValue,
        updatedAt: now,
      }),
    )
  }

  if (chunks.length) {
    await instant.transact(chunks)
  }
}
