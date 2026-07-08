<script setup lang="ts">
  import type { FilterRule, FilterFieldDef, FilterOperator } from '~/composables/useAdvancedFilters'
  import { operatorsByType } from '~/composables/useAdvancedFilters'

  const props = defineProps<{
    rule: FilterRule
    fields: FilterFieldDef[]
    showConjunction?: boolean
    conjunction?: string
  }>()

  const emit = defineEmits<{
    remove: []
    'update:conjunction': [value: string]
  }>()

  const selectedField = computed(() => props.fields.find((f) => f.key === props.rule.fieldKey))

  const availableOperators = computed(() => {
    const field = selectedField.value
    if (!field) return operatorsByType.text
    return operatorsByType[field.type] || operatorsByType.text
  })

  const currentOperatorDef = computed(() =>
    availableOperators.value.find((o) => o.value === props.rule.operator),
  )

  const needsValue = computed(() => currentOperatorDef.value?.needsValue ?? true)

  function onFieldChange(key: string) {
    props.rule.fieldKey = key
    const field = props.fields.find((f) => f.key === key)
    if (field) {
      const ops = operatorsByType[field.type] || operatorsByType.text
      props.rule.operator = ops[0]?.value || 'contains'
    }
    props.rule.value = ''
  }

  function onOperatorChange(op: string) {
    props.rule.operator = op as FilterOperator
    const opDef = availableOperators.value.find((o) => o.value === op)
    if (!opDef?.needsValue) {
      props.rule.value = ''
    }
  }
</script>

<template>
  <div class="flex items-center gap-1.5 min-w-0">
    <div class="w-[60px] shrink-0 text-right">
      <UiSelect
        v-if="showConjunction"
        :model-value="conjunction"
        @update:model-value="emit('update:conjunction', $event as string)">
        <UiSelectTrigger class="h-7 w-[60px] text-xs px-2 bg-muted/50 border-0 font-medium">
          <UiSelectValue />
        </UiSelectTrigger>
        <UiSelectContent>
          <UiSelectItem value="and">And</UiSelectItem>
          <UiSelectItem value="or">Or</UiSelectItem>
        </UiSelectContent>
      </UiSelect>
      <span v-else class="text-xs font-medium text-muted-foreground">Where</span>
    </div>

    <UiSelect :model-value="rule.fieldKey" @update:model-value="onFieldChange($event as string)">
      <UiSelectTrigger class="h-7 w-[140px] text-xs px-2 bg-card">
        <UiSelectValue placeholder="Select field" />
      </UiSelectTrigger>
      <UiSelectContent>
        <UiSelectItem v-for="field in fields" :key="field.key" :value="field.key">
          <div class="flex items-center gap-1.5">
            <Icon v-if="field.icon" :name="field.icon" class="h-3 w-3 text-muted-foreground" />
            {{ field.label }}
          </div>
        </UiSelectItem>
      </UiSelectContent>
    </UiSelect>

    <UiSelect :model-value="rule.operator" @update:model-value="onOperatorChange($event as string)">
      <UiSelectTrigger class="h-7 w-[130px] text-xs px-2 bg-card">
        <UiSelectValue />
      </UiSelectTrigger>
      <UiSelectContent>
        <UiSelectItem v-for="op in availableOperators" :key="op.value" :value="op.value">
          {{ op.label }}
        </UiSelectItem>
      </UiSelectContent>
    </UiSelect>

    <template v-if="needsValue">
      <UiSelect
        v-if="selectedField?.type === 'select' && selectedField.options?.length"
        :model-value="rule.value"
        @update:model-value="rule.value = $event as string">
        <UiSelectTrigger class="h-7 min-w-[140px] flex-1 text-xs px-2 bg-card">
          <UiSelectValue placeholder="Select value" />
        </UiSelectTrigger>
        <UiSelectContent>
          <UiSelectItem v-for="opt in selectedField.options" :key="opt.value" :value="opt.value">
            {{ opt.label }}
          </UiSelectItem>
        </UiSelectContent>
      </UiSelect>
      <input
        v-else-if="selectedField?.type === 'date'"
        v-model="rule.value"
        type="date"
        class="h-7 min-w-[140px] flex-1 rounded-md border border-border bg-card px-2 text-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
      <input
        v-else-if="selectedField?.type === 'number'"
        v-model="rule.value"
        type="number"
        placeholder="Value"
        class="h-7 min-w-[100px] flex-1 rounded-md border border-border bg-card px-2 text-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
      <input
        v-else
        v-model="rule.value"
        type="text"
        placeholder="Value"
        class="h-7 min-w-[140px] flex-1 rounded-md border border-border bg-card px-2 text-xs placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
    </template>

    <button
      type="button"
      class="h-6 w-6 shrink-0 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
      title="Remove filter rule"
      @click="emit('remove')">
      <Icon name="lucide:x" class="h-3.5 w-3.5" />
    </button>
  </div>
</template>
