<script setup lang="ts">
import type { DatabaseField } from '~/types/database'
import { getFieldTypeIcon, getFieldTypeLabel } from '~/composables/useSchemaBuilder'

const props = defineProps<{
  field: DatabaseField
  index: number
}>()

const emit = defineEmits<{
  update: [field: DatabaseField]
  delete: []
  moveUp: []
  moveDown: []
}>()

const isExpanded = ref(false)

const update = (updates: Partial<DatabaseField>) => {
  emit('update', { ...props.field, ...updates })
}

const hasOptions = computed(() => ['select', 'multiselect'].includes(props.field.type))

const addOption = () => {
  const options = props.field.options || []
  update({
    options: [...options, { value: `Option ${options.length + 1}`, color: 'gray' }],
  })
}

const updateOption = (index: number, value: string) => {
  const options = [...(props.field.options || [])]
  if (options[index]) {
    options[index] = { value, color: options[index].color || 'gray' }
  }
  update({ options })
}

const removeOption = (index: number) => {
  const options = [...(props.field.options || [])]
  options.splice(index, 1)
  update({ options })
}

const optionColors = ['gray', 'red', 'orange', 'amber', 'yellow', 'lime', 'green', 'emerald', 'teal', 'cyan', 'sky', 'blue', 'indigo', 'violet', 'purple', 'fuchsia', 'pink', 'rose']
</script>

<template>
  <div
    class="group rounded-lg border border-border bg-card transition-all"
    :class="{ 'ring-1 ring-primary/20': isExpanded }">
    <!-- Field Header -->
    <div class="flex items-center gap-2 p-3">
      <button
        type="button"
        class="cursor-grab text-muted-foreground hover:text-foreground"
        aria-label="Drag to reorder">
        <Icon name="lucide:grip-vertical" class="h-4 w-4" />
      </button>

      <div
        class="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted/50">
        <Icon :name="getFieldTypeIcon(field.type)" class="h-4 w-4 text-muted-foreground" />
      </div>

      <div class="flex-1 min-w-0">
        <UiInput
          :model-value="field.name"
          placeholder="Field name"
          class="h-8 border-transparent bg-transparent hover:bg-muted/50 focus:bg-background focus:border-input"
          @update:model-value="update({ name: String($event) })" />
      </div>

      <span class="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
        {{ getFieldTypeLabel(field.type) }}
      </span>

      <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <UiButton
          variant="ghost"
          size="icon-sm"
          class="h-7 w-7"
          @click="emit('moveUp')">
          <Icon name="lucide:chevron-up" class="h-3.5 w-3.5" />
        </UiButton>
        <UiButton
          variant="ghost"
          size="icon-sm"
          class="h-7 w-7"
          @click="emit('moveDown')">
          <Icon name="lucide:chevron-down" class="h-3.5 w-3.5" />
        </UiButton>
        <UiButton
          variant="ghost"
          size="icon-sm"
          class="h-7 w-7"
          @click="isExpanded = !isExpanded">
          <Icon :name="isExpanded ? 'lucide:chevron-up' : 'lucide:settings-2'" class="h-3.5 w-3.5" />
        </UiButton>
        <UiButton
          variant="ghost"
          size="icon-sm"
          class="h-7 w-7 text-destructive hover:text-destructive"
          :disabled="field.isDefault"
          @click="emit('delete')">
          <Icon name="lucide:trash-2" class="h-3.5 w-3.5" />
        </UiButton>
      </div>
    </div>

    <!-- Field Settings (Expanded) -->
    <div v-if="isExpanded" class="border-t border-border p-3 space-y-4">
      <!-- Required Toggle -->
      <div class="flex items-center justify-between">
        <label class="text-sm font-medium">Required</label>
        <UiSwitch
          :checked="field.required"
          @update:checked="update({ required: $event })" />
      </div>

      <!-- Options (for select/multiselect) -->
      <div v-if="hasOptions" class="space-y-2">
        <div class="flex items-center justify-between">
          <label class="text-sm font-medium">Options</label>
          <UiButton
            variant="ghost"
            size="sm"
            class="h-7 text-xs"
            @click="addOption">
            <Icon name="lucide:plus" class="mr-1 h-3 w-3" />
            Add Option
          </UiButton>
        </div>
        <div class="space-y-1">
          <div
            v-for="(option, idx) in field.options"
            :key="idx"
            class="flex items-center gap-2">
            <UiDropdownMenu>
              <UiDropdownMenuTrigger as-child>
                <button
                  type="button"
                  class="h-6 w-6 rounded-md border"
                  :class="`bg-${option.color}-500/20 border-${option.color}-500/30`" />
              </UiDropdownMenuTrigger>
              <UiDropdownMenuContent>
                <div class="grid grid-cols-6 gap-1 p-2">
                  <button
                    v-for="color in optionColors"
                    :key="color"
                    type="button"
                    class="h-6 w-6 rounded-md border transition-transform hover:scale-110"
                    :class="`bg-${color}-500/20 border-${color}-500/30`"
                    @click="update({ options: field.options?.map((o, i) => i === idx ? { ...o, color } : o) })" />
                </div>
              </UiDropdownMenuContent>
            </UiDropdownMenu>
            <UiInput
              :model-value="option.value"
              class="h-7 flex-1 text-sm"
              @update:model-value="updateOption(idx, String($event))" />
            <UiButton
              variant="ghost"
              size="icon-sm"
              class="h-7 w-7"
              @click="removeOption(idx)">
              <Icon name="lucide:x" class="h-3.5 w-3.5" />
            </UiButton>
          </div>
        </div>
      </div>

      <!-- Formula (for formula fields) -->
      <div v-if="field.type === 'formula'" class="space-y-2">
        <label class="text-sm font-medium">Formula Expression</label>
        <textarea
          :value="field.formula || ''"
          placeholder="e.g., $sum(field1, field2)"
          rows="2"
          class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          @input="update({ formula: ($event.target as HTMLTextAreaElement).value })" />
      </div>

      <!-- Relation Config (for relation fields) -->
      <div v-if="field.type === 'relation'" class="space-y-2">
        <label class="text-sm font-medium">Related Collection</label>
        <UiSelect
          :model-value="field.config?.collectionId || ''"
          @update:model-value="update({ config: { ...field.config, collectionId: $event } })">
          <UiSelectTrigger class="h-8 text-sm">
            <UiSelectValue placeholder="Select collection" />
          </UiSelectTrigger>
          <UiSelectContent>
            <UiSelectItem value="">None</UiSelectItem>
          </UiSelectContent>
        </UiSelect>
      </div>
    </div>
  </div>
</template>
