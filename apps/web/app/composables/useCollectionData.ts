import type { DatabaseSchema, DatabaseRecord } from '~/types/database'
import type { ColumnDef } from '@tanstack/vue-table'
import { createDefaultDatabaseSchema, normalizeDatabaseSchema } from '~/lib/normalizeDatabaseSchema'

export const useCollectionData = (collectionId: string) => {
  const instant = useInstantDb()
  const tx = instant.tx as any

  const schemaSettingKey = `collection:${collectionId}:schema`
  const recordsSettingKey = `collection:${collectionId}:records`

  const schema = ref<DatabaseSchema | null>(null)
  const records = ref<DatabaseRecord[]>([])
  const loading = ref(true)
  const error = ref<string | null>(null)

  const getAuthUserId = async () => {
    const authUser = await instant.getAuth()
    return authUser?.id || 'system'
  }

  const upsertSetting = async (settingKey: string, payload: { key: string; value: any }) => {
    const now = Date.now()
    const ownerId = await getAuthUserId()

    const resp = await instant.queryOnce({
      settings: {
        $: {
          where: {
            settingKey,
          },
        },
      },
    })

    const existing = (resp.data as any)?.settings?.[0]

    if (existing?.id) {
      await instant.transact([
        tx.settings[existing.id].update({
          ownerId,
          settingKey,
          entityType: 'collection',
          entityId: collectionId,
          key: payload.key,
          value: payload.value,
          updatedAt: now,
        }),
      ])
      return existing.id as string
    }

    const id = crypto.randomUUID()
    await instant.transact([
      tx.settings[id].create({
        ownerId,
        settingKey,
        entityType: 'collection',
        entityId: collectionId,
        key: payload.key,
        value: payload.value,
        updatedAt: now,
      }),
    ])
    return id
  }

  // Load schema from settings
  const loadSchema = async () => {
    try {
      const resp = await instant.queryOnce({
        settings: {
          $: {
            where: {
              settingKey: schemaSettingKey,
            },
          },
        },
      })

      let settingData = (resp.data as any)?.settings?.[0]

      if (!settingData?.id) {
        const fallbackResp = await instant.queryOnce({
          settings: {
            $: {
              where: {
                entityType: 'collection',
                entityId: collectionId,
                key: 'schema',
              },
            },
          },
        })
        settingData = (fallbackResp.data as any)?.settings?.[0]
      }

      if (settingData?.value) {
        const normalized = normalizeDatabaseSchema(settingData.value, collectionId)
        schema.value = {
          ...normalized,
          id: typeof settingData.id === 'string' ? settingData.id : normalized.id,
          collectionId,
        }
      } else {
        schema.value = createDefaultDatabaseSchema(collectionId)
      }
    } catch (e) {
      console.error('Failed to load schema:', e)
      error.value = 'Failed to load schema'
    }
  }

  // Load records (mocked for now until we add records entity)
  const loadRecords = async () => {
    try {
      const resp = await instant.queryOnce({
        settings: {
          $: {
            where: {
              settingKey: recordsSettingKey,
            },
          },
        },
      })

      const settingData = (resp.data as any)?.settings?.[0]
      const value = settingData?.value
      records.value = Array.isArray(value) ? (value as DatabaseRecord[]) : []
    } catch (e) {
      console.error('Failed to load records:', e)
      error.value = 'Failed to load records'
    }
  }

  // Generate TanStack Table columns from schema
  const generateColumns = (): ColumnDef<any, any>[] => {
    if (!schema.value) return []

    const columns: ColumnDef<any, any>[] = schema.value.fields
      .sort((a, b) => a.order - b.order)
      .map((field) => ({
        id: `fields.${field.id}`,
        accessorFn: (row: DatabaseRecord) => row.fields[field.id],
        header: field.name,
        cell: (info: any) => info.getValue(),
        meta: {
          field,
        },
      }))

    // Add actions column
    columns.push({
      id: 'actions',
      header: '',
      size: 60,
      cell: () => null,
    })

    return columns
  }

  // Save schema
  const saveSchema = async (updatedSchema: DatabaseSchema) => {
    try {
      await upsertSetting(schemaSettingKey, { key: 'schema', value: updatedSchema })
      schema.value = updatedSchema
    } catch (e) {
      console.error('Failed to save schema:', e)
      throw e
    }
  }

  const saveRecords = async (nextRecords: DatabaseRecord[]) => {
    await upsertSetting(recordsSettingKey, { key: 'records', value: nextRecords })
  }

  // Create record
  const createRecord = async () => {
    if (!schema.value) return

    const newRecord: DatabaseRecord = {
      id: crypto.randomUUID(),
      collectionId,
      fields: {},
      createdBy: await getAuthUserId(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }

    // Initialize fields with defaults
    schema.value.fields.forEach((field) => {
      if (field.type === 'formula') return

      switch (field.type) {
        case 'checkbox':
          newRecord.fields[field.id] = false
          break
        case 'number':
          newRecord.fields[field.id] = 0
          break
        default:
          newRecord.fields[field.id] = ''
      }
    })

    records.value.push(newRecord)
    await saveRecords(records.value)
  }

  // Update record
  const updateRecord = async (rowId: string, fieldId: string, value: any) => {
    const record = records.value.find((r) => r.id === rowId)
    if (!record) return

    record.fields[fieldId] = value
    record.updatedAt = Date.now()

    await saveRecords(records.value)
  }

  // Delete record
  const deleteRecord = async (rowId: string) => {
    const index = records.value.findIndex((r) => r.id === rowId)
    if (index !== -1) {
      records.value.splice(index, 1)
    }
    await saveRecords(records.value)
  }

  const setRecords = async (nextRecords: DatabaseRecord[]) => {
    records.value = nextRecords
    await saveRecords(nextRecords)
  }

  // Initialize
  const init = async () => {
    loading.value = true
    error.value = null

    try {
      await loadSchema()
      await loadRecords()
    } catch (e) {
      console.error('Initialization failed:', e)
    } finally {
      loading.value = false
    }
  }

  return {
    schema,
    records,
    loading,
    error,
    generateColumns,
    saveSchema,
    createRecord,
    updateRecord,
    deleteRecord,
    setRecords,
    refresh: init,
  }
}
