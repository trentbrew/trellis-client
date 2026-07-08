<script setup lang="ts">
  import type { DatabaseSchema } from '~/types/database'
  import { createDefaultDatabaseSchema, normalizeDatabaseSchema } from '~/lib/normalizeDatabaseSchema'
  import DataTableSchemaEditor from '~/components/data/DataTable/DataTableSchemaEditor.vue'

  const props = defineProps<{
    open: boolean
    pageId: string
    schema?: DatabaseSchema | null
  }>()

  const emit = defineEmits<{
    'update:open': [value: boolean]
    created: [schema: DatabaseSchema]
  }>()

  const instant = useInstantDb()
  const tx = instant.tx as any

  const localSchema = ref<DatabaseSchema>({
    id: '',
    collectionId: props.pageId,
    fields: [],
    views: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  })

  // Initialize default view
  onMounted(async () => {
    if (!props.schema && localSchema.value.views.length === 0) {
      localSchema.value = createDefaultDatabaseSchema(props.pageId)
    }

    if (!props.schema) {
      const settingKey = `collection:${props.pageId}:schema`
      const resp = await instant.queryOnce({
        settings: {
          $: {
            where: {
              settingKey,
            },
          },
        },
      })

      let existing = (resp.data as any)?.settings?.[0]

      if (!existing?.id) {
        const fallbackResp = await instant.queryOnce({
          settings: {
            $: {
              where: {
                entityType: 'collection',
                entityId: props.pageId,
                key: 'schema',
              },
            },
          },
        })
        existing = (fallbackResp.data as any)?.settings?.[0]
      }

      if (existing?.value) {
        const normalized = normalizeDatabaseSchema(existing.value, props.pageId)
        localSchema.value = {
          ...normalized,
          id: existing.id,
          collectionId: props.pageId,
        }
      }
    }
  })

  watch(
    () => props.schema,
    (newSchema) => {
      if (newSchema) {
        localSchema.value = normalizeDatabaseSchema(newSchema, props.pageId)
      }
    },
    { immediate: true },
  )

  const isSaving = ref(false)

  const saveSchema = async () => {
    isSaving.value = true
    try {
      // Deep clone to plain JSON to remove any Vue reactivity proxies
      const plainFields = JSON.parse(JSON.stringify(localSchema.value.fields))
      const plainViews = JSON.parse(JSON.stringify(localSchema.value.views))

      const authUser = await instant.getAuth()
      if (!authUser) return

      const now = Date.now()
      const settingKey = `collection:${props.pageId}:schema`
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

      const nextValue: DatabaseSchema = {
        ...localSchema.value,
        collectionId: props.pageId,
        fields: plainFields,
        views: plainViews,
        updatedAt: now,
      }

      if (existing?.id) {
        await instant.transact([
          tx.settings[existing.id].update({
            ownerId: authUser.id,
            settingKey,
            entityType: 'collection',
            entityId: props.pageId,
            key: 'schema',
            value: nextValue,
            updatedAt: now,
          }),
        ])
        localSchema.value.id = existing.id
      } else {
        const id = crypto.randomUUID()
        await instant.transact([
          tx.settings[id].create({
            ownerId: authUser.id,
            settingKey,
            entityType: 'collection',
            entityId: props.pageId,
            key: 'schema',
            value: nextValue,
            updatedAt: now,
          }),
        ])
        localSchema.value.id = id
      }

      emit('created', localSchema.value)
      emit('update:open', false)
    } finally {
      isSaving.value = false
    }
  }
</script>

<template>
  <UiDialog :open="props.open" @update:open="emit('update:open', $event)">
    <UiDialogContent class="max-w-3xl max-h-[80vh] flex flex-col">
      <UiDialogHeader>
        <UiDialogTitle>{{ schema ? 'Edit' : 'Create' }} Database Schema</UiDialogTitle>
        <UiDialogDescription>Define the structure and fields for your database</UiDialogDescription>
      </UiDialogHeader>

      <div class="flex-1 overflow-y-auto py-4">
        <DataTableSchemaEditor :schema="localSchema" @update="localSchema = $event" />
      </div>

      <UiDialogFooter>
        <UiButton variant="outline" @click="emit('update:open', false)">Cancel</UiButton>
        <UiButton :disabled="localSchema.fields.length === 0 || isSaving" @click="saveSchema">
          <Icon v-if="isSaving" name="lucide:loader-2" class="mr-2 h-4 w-4 animate-spin" />
          {{ schema ? 'Save Changes' : 'Create Schema' }}
        </UiButton>
      </UiDialogFooter>
    </UiDialogContent>
  </UiDialog>
</template>
