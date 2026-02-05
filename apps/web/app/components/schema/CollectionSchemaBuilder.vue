<script setup lang="ts">
import type { DatabaseSchema, DatabaseField } from '~/types/database'
import type { FieldTypeDefinition } from '~/composables/useSchemaBuilder'

const props = defineProps<{
  open: boolean
  schema: DatabaseSchema
  collectionTitle?: string
}>()

const emit = defineEmits<{
  'update:open': [open: boolean]
  save: [schema: DatabaseSchema]
}>()

const { fieldTypesByCategory, createFieldFromType } = useSchemaBuilder()

// Local copy of schema for editing
const localSchema = ref<DatabaseSchema>({ ...props.schema, fields: [...props.schema.fields] })

// Sync when props change
watch(() => props.schema, (newSchema) => {
  localSchema.value = { ...newSchema, fields: [...newSchema.fields] }
}, { deep: true })

// UI state
const showFieldPicker = ref(false)
const activeCategory = ref<string>('basic')

const categories = [
  { id: 'basic', label: 'Basic', icon: 'lucide:type' },
  { id: 'rich', label: 'Rich', icon: 'lucide:sparkles' },
  { id: 'relation', label: 'Relations', icon: 'lucide:link-2' },
  { id: 'computed', label: 'Computed', icon: 'lucide:function-square' },
  { id: 'ontology', label: 'Ontology', icon: 'lucide:network' },
]

const currentCategoryFields = computed(() => {
  return fieldTypesByCategory.value[activeCategory.value] || []
})

// Field operations
const addField = (typeDef: FieldTypeDefinition) => {
  const newField = createFieldFromType(typeDef)
  newField.order = localSchema.value.fields.length
  localSchema.value.fields.push(newField)
  showFieldPicker.value = false
}

const updateField = (index: number, field: DatabaseField) => {
  localSchema.value.fields[index] = field
}

const deleteField = (index: number) => {
  localSchema.value.fields.splice(index, 1)
  // Reorder remaining fields
  localSchema.value.fields.forEach((f, i) => {
    f.order = i
  })
}

const moveFieldUp = (index: number) => {
  if (index === 0) return
  const fields = localSchema.value.fields
  const current = fields[index]
  const previous = fields[index - 1]
  if (current && previous) {
    fields[index - 1] = current
    fields[index] = previous
    fields.forEach((f, i) => { f.order = i })
  }
}

const moveFieldDown = (index: number) => {
  const fields = localSchema.value.fields
  if (index === fields.length - 1) return
  const current = fields[index]
  const next = fields[index + 1]
  if (current && next) {
    fields[index] = next
    fields[index + 1] = current
    fields.forEach((f, i) => { f.order = i })
  }
}

// Save handler
const handleSave = () => {
  localSchema.value.updatedAt = Date.now()
  emit('save', localSchema.value)
  emit('update:open', false)
}

const handleCancel = () => {
  // Reset to original
  localSchema.value = { ...props.schema, fields: [...props.schema.fields] }
  emit('update:open', false)
}
</script>

<template>
  <UiDialog :open="open" @update:open="emit('update:open', $event)">
    <UiDialogContent class="max-w-3xl max-h-[85vh] flex flex-col">
      <UiDialogHeader>
        <UiDialogTitle class="flex items-center gap-2">
          <Icon name="lucide:table" class="h-5 w-5" />
          {{ collectionTitle ? `Schema: ${collectionTitle}` : 'Collection Schema' }}
        </UiDialogTitle>
        <UiDialogDescription>
          Define the fields and structure of your collection
        </UiDialogDescription>
      </UiDialogHeader>

      <div class="flex-1 overflow-hidden flex flex-col min-h-0">
        <!-- Fields List -->
        <div class="flex-1 overflow-y-auto pr-2 space-y-2">
          <SchemaSchemaFieldEditor
            v-for="(field, index) in localSchema.fields"
            :key="field.id"
            :field="field"
            :index="index"
            @update="updateField(index, $event)"
            @delete="deleteField(index)"
            @move-up="moveFieldUp(index)"
            @move-down="moveFieldDown(index)" />

          <!-- Empty State -->
          <div
            v-if="localSchema.fields.length === 0"
            class="rounded-lg border border-dashed border-border p-8 text-center">
            <Icon name="lucide:table" class="mx-auto h-10 w-10 text-muted-foreground/50 mb-3" />
            <h3 class="font-medium text-sm">No fields yet</h3>
            <p class="text-xs text-muted-foreground mt-1">Add your first field to define the collection schema</p>
          </div>
        </div>

        <!-- Add Field Section -->
        <div class="pt-4 border-t border-border mt-4">
          <div v-if="!showFieldPicker">
            <UiButton
              variant="outline"
              class="w-full border-dashed"
              @click="showFieldPicker = true">
              <Icon name="lucide:plus" class="mr-2 h-4 w-4" />
              Add Field
            </UiButton>
          </div>

          <!-- Field Type Picker -->
          <div v-else class="space-y-3">
            <div class="flex items-center justify-between">
              <h4 class="text-sm font-medium">Choose field type</h4>
              <UiButton
                variant="ghost"
                size="icon-sm"
                @click="showFieldPicker = false">
                <Icon name="lucide:x" class="h-4 w-4" />
              </UiButton>
            </div>

            <!-- Category Tabs -->
            <div class="flex gap-1 overflow-x-auto pb-1">
              <UiButton
                v-for="cat in categories"
                :key="cat.id"
                variant="ghost"
                size="sm"
                class="shrink-0"
                :class="activeCategory === cat.id ? 'bg-accent' : ''"
                @click="activeCategory = cat.id">
                <Icon :name="cat.icon" class="mr-1.5 h-3.5 w-3.5" />
                {{ cat.label }}
                <span
                  v-if="fieldTypesByCategory[cat.id]?.length"
                  class="ml-1.5 rounded-full bg-muted px-1.5 text-[10px]">
                  {{ fieldTypesByCategory[cat.id]?.length }}
                </span>
              </UiButton>
            </div>

            <!-- Field Type Grid -->
            <div class="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
              <SchemaFieldTypeCard
                v-for="fieldType in currentCategoryFields"
                :key="fieldType.id"
                :field-type="fieldType"
                compact
                @select="addField" />
            </div>

            <p v-if="currentCategoryFields.length === 0" class="text-sm text-muted-foreground text-center py-4">
              No field types in this category
            </p>
          </div>
        </div>
      </div>

      <UiDialogFooter class="pt-4">
        <UiButton variant="outline" @click="handleCancel">
          Cancel
        </UiButton>
        <UiButton @click="handleSave">
          <Icon name="lucide:check" class="mr-2 h-4 w-4" />
          Save Schema
        </UiButton>
      </UiDialogFooter>
    </UiDialogContent>
  </UiDialog>
</template>
