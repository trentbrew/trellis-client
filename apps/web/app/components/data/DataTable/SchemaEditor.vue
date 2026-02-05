<script setup lang="ts">
  import type { DatabaseSchema, DatabaseField } from '~/types/database'

  const props = defineProps<{
    schema: DatabaseSchema
  }>()

  const emit = defineEmits<{
    update: [schema: DatabaseSchema]
  }>()

  const fieldTypes = [
    { value: 'text', label: 'Text', icon: 'lucide:type' },
    { value: 'number', label: 'Number', icon: 'lucide:hash' },
    { value: 'select', label: 'Select', icon: 'lucide:list' },
    { value: 'multiselect', label: 'Multi-select', icon: 'lucide:list-checks' },
    { value: 'date', label: 'Date', icon: 'lucide:calendar' },
    { value: 'checkbox', label: 'Checkbox', icon: 'lucide:check-square' },
    { value: 'url', label: 'URL', icon: 'lucide:link' },
    { value: 'email', label: 'Email', icon: 'lucide:mail' },
    { value: 'file', label: 'File', icon: 'lucide:paperclip' },
    { value: 'formula', label: 'Formula', icon: 'lucide:function-square' },
  ]

  // Formula validation state
  const formulaErrors = ref<Record<string, string | null>>({})
  const validatingFormulas = ref<Record<string, boolean>>({})

  // Validate formula in real-time
  const validateFormula = (fieldId: string, formula: string) => {
    if (!formula || !formula.trim()) {
      formulaErrors.value[fieldId] = null
      return
    }

    validatingFormulas.value[fieldId] = true

    try {
      // Create test context with sample data
      const testContext = {
        field1: 100,
        field2: 200,
        categories: [{ amount: 50 }, { amount: 75 }],
        items: [{ price: 10 }, { price: 20 }],
      }

      const { evaluateSingleFormula } = useCollectionFormulas('validation')
      const result = evaluateSingleFormula(formula, testContext)

      if (result === null) {
        formulaErrors.value[fieldId] = 'Formula returned null - check syntax'
      } else {
        formulaErrors.value[fieldId] = null
      }
    } catch (error) {
      formulaErrors.value[fieldId] = error instanceof Error ? error.message : 'Invalid formula'
    } finally {
      validatingFormulas.value[fieldId] = false
    }
  }

  // Formula templates organized by category
  const formulaTemplates = [
    {
      category: 'Budget & Finance',
      templates: [
        {
          name: 'Total Sum',
          description: 'Sum all values in an array',
          code: '$sum(...items.map(i => i.amount))',
        },
        {
          name: 'Budget Remaining',
          description: 'Calculate remaining budget',
          code: '$sum(...categories.map(c => c.budgeted - c.spent))',
        },
        {
          name: 'Currency Format',
          description: 'Format as USD currency',
          code: '$currency($sum(...items.map(i => i.price)))',
        },
        {
          name: 'Budget Utilization',
          description: 'Percentage of budget used',
          code: '$percent($sum(...items.map(i => i.spent)) / $sum(...items.map(i => i.budgeted)))',
        },
      ],
    },
    {
      category: 'Project Tracking',
      templates: [
        {
          name: 'Completion Rate',
          description: 'Tasks completed as percentage',
          code: '$percent(tasks.filter(t => t.completed).length / tasks.length)',
        },
        {
          name: 'Days Remaining',
          description: 'Days until deadline',
          code: '$round(($date(deadline) - $date(new Date())) / (1000 * 60 * 60 * 24))',
        },
        {
          name: 'Overdue Tasks',
          description: 'Count tasks past deadline',
          code: '$count(tasks.filter(t => !t.completed && new Date(t.deadline) < new Date()))',
        },
      ],
    },
    {
      category: 'Aggregations',
      templates: [
        {
          name: 'Average Value',
          description: 'Calculate average across items',
          code: '$avg(...items.map(i => i.value))',
        },
        {
          name: 'Maximum Value',
          description: 'Find highest value',
          code: '$max(...items.map(i => i.value))',
        },
        {
          name: 'Minimum Value',
          description: 'Find lowest value',
          code: '$min(...items.map(i => i.value))',
        },
        {
          name: 'Count Items',
          description: 'Count array items',
          code: '$count(items)',
        },
      ],
    },
    {
      category: 'Conditionals',
      templates: [
        {
          name: 'Status Label',
          description: 'Show status based on condition',
          code: '$if(completed, "Done", "In Progress")',
        },
        {
          name: 'Multiple Conditions',
          description: 'Switch between multiple values',
          code: '$switch(status, { "draft": "📝", "review": "👀", "done": "✅" }, "❓")',
        },
        {
          name: 'Budget Alert',
          description: 'Warn if over budget',
          code: '$if(spent > budgeted, "⚠️ Over Budget", "✅ On Track")',
        },
      ],
    },
    {
      category: 'Graph Traversal',
      templates: [
        {
          name: 'Related Nodes',
          description: 'Get nodes connected via edges',
          code: '$related(record, "linkedTo")',
        },
        {
          name: 'Child Nodes',
          description: 'Get all descendant nodes (children, grandchildren...)',
          code: '$descendants(record, Infinity, "hasChild")',
        },
        {
          name: 'Parent Nodes',
          description: 'Get all ancestor nodes (parents, grandparents...)',
          code: '$ancestors(record, Infinity, "hasParent")',
        },
        {
          name: 'Direct Children',
          description: 'Get immediate children (depth=1)',
          code: '$descendants(record, 1)',
        },
        {
          name: 'Sibling Nodes',
          description: 'Get nodes sharing the same parent',
          code: '$siblings(record)',
        },
        {
          name: 'Path Exists',
          description: 'Check if a path exists between nodes',
          code: '$path(record, targetNode)',
        },
        {
          name: 'Outgoing Edges',
          description: 'Get edges going out from this node',
          code: '$nodeEdges(record, "outgoing")',
        },
        {
          name: 'Sum Related Values',
          description: 'Sum a field across all related nodes',
          code: '$sum(...$descendants(record).map(n => n.amount))',
        },
      ],
    },
  ]

  const formulaHelpers = [
    { label: 'Sum', code: '$sum(field1, field2)', category: 'Math' },
    { label: 'Average', code: '$avg(field1, field2)', category: 'Math' },
    { label: 'Count', code: '$count(array)', category: 'Array' },
    { label: 'Filter', code: 'items.filter(i => i.active)', category: 'Array' },
    { label: 'Map', code: 'items.map(i => i.name)', category: 'Array' },
    { label: 'Currency', code: '$currency(value)', category: 'Format' },
    { label: 'Percent', code: '$percent(value)', category: 'Format' },
    { label: 'Round', code: '$round(value, 2)', category: 'Format' },
    { label: 'If/Else', code: '$if(condition, true, false)', category: 'Logic' },
    { label: 'Switch', code: '$switch(value, {a: 1}, 0)', category: 'Logic' },
    { label: 'Related', code: '$related(record)', category: 'Graph' },
    { label: 'Ancestors', code: '$ancestors(record)', category: 'Graph' },
    { label: 'Descendants', code: '$descendants(record)', category: 'Graph' },
    { label: 'Siblings', code: '$siblings(record)', category: 'Graph' },
    { label: 'Edges', code: '$nodeEdges(record)', category: 'Graph' },
  ]

  const showTemplates = ref(false)
  const selectedTemplate = ref<(typeof formulaTemplates)[0]['templates'][0] | null>(null)

  const insertHelper = (fieldId: string, code: string) => {
    const field = props.schema.fields.find((f) => f.id === fieldId)
    if (!field) return

    const currentFormula = field.formula || ''
    const newFormula = currentFormula ? `${currentFormula}\n${code}` : code
    updateField(fieldId, { formula: newFormula })

    // Validate after insertion
    nextTick(() => validateFormula(fieldId, newFormula))
  }

  const insertTemplate = (fieldId: string, template: (typeof formulaTemplates)[0]['templates'][0]) => {
    updateField(fieldId, { formula: template.code })
    selectedTemplate.value = null
    showTemplates.value = false

    // Validate after insertion
    nextTick(() => validateFormula(fieldId, template.code))
  }

  // Validate on formula change
  const handleFormulaChange = (fieldId: string, value: string) => {
    updateField(fieldId, { formula: value })

    // Debounce validation
    const timeoutId = setTimeout(() => {
      validateFormula(fieldId, value)
    }, 500)

    return () => clearTimeout(timeoutId)
  }

  const addField = () => {
    const newField: DatabaseField = {
      id: crypto.randomUUID(),
      name: 'New Field',
      type: 'text',
      required: false,
      order: props.schema.fields.length,
    }

    emit('update', {
      ...props.schema,
      fields: [...props.schema.fields, newField],
    })
  }

  const updateField = (fieldId: string, updates: Partial<DatabaseField>) => {
    emit('update', {
      ...props.schema,
      fields: props.schema.fields.map((f) => (f.id === fieldId ? { ...f, ...updates } : f)),
    })
  }

  const deleteField = (fieldId: string) => {
    emit('update', {
      ...props.schema,
      fields: props.schema.fields.filter((f) => f.id !== fieldId),
    })
  }
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <div>
        <h3 class="text-lg font-semibold">Database Schema</h3>
        <p class="text-muted-foreground text-sm">Define the structure of your database</p>
      </div>
      <UiButton size="sm" @click="addField">
        <Icon name="lucide:plus" class="mr-2 h-4 w-4" />
        Add Field
      </UiButton>
    </div>

    <div class="space-y-2">
      <div
        v-for="field in schema.fields"
        :key="field.id"
        class="hover:bg-accent/50 group flex items-center gap-3 rounded-lg border border-border p-3 transition-colors">
        <Icon name="lucide:grip-vertical" class="text-muted-foreground h-4 w-4 cursor-move" />

        <div class="flex-1 space-y-2">
          <div class="flex items-center gap-2">
            <UiInput
              :model-value="field.name"
              placeholder="Field name"
              class="flex-1"
              @update:model-value="updateField(field.id, { name: $event })" />

            <UiSelect
              :model-value="field.type"
              @update:model-value="updateField(field.id, { type: $event as DatabaseField['type'] })">
              <UiSelectTrigger class="w-[180px]">
                <UiSelectValue />
              </UiSelectTrigger>
              <UiSelectContent>
                <UiSelectItem v-for="type in fieldTypes" :key="type.value" :value="type.value">
                  <div class="flex items-center gap-2">
                    <Icon :name="type.icon" class="h-4 w-4" />
                    {{ type.label }}
                  </div>
                </UiSelectItem>
              </UiSelectContent>
            </UiSelect>

            <UiButton
              variant="ghost"
              size="icon"
              class="opacity-0 group-hover:opacity-100"
              @click="deleteField(field.id)">
              <Icon name="lucide:trash-2" class="h-4 w-4" />
            </UiButton>
          </div>

          <div v-if="field.type === 'formula'" class="space-y-3 rounded-lg bg-transparent p-3">
            <div class="space-y-1">
              <div class="flex items-center justify-between">
                <label class="text-xs font-medium">Formula Expression</label>
                <UiButton variant="ghost" size="sm" class="h-6 text-xs" @click="showTemplates = !showTemplates">
                  <Icon name="lucide:sparkles" class="mr-1 h-3 w-3" />
                  Templates
                </UiButton>
              </div>
              <div class="relative">
                <textarea
                  :value="field.formula || ''"
                  placeholder="e.g., $sum(budget, expenses) or categories.reduce((sum, c) => sum + c.amount, 0)"
                  rows="3"
                  :class="[
                    'w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
                    formulaErrors[field.id] ? 'border-destructive' : 'border-input',
                  ]"
                  @input="handleFormulaChange(field.id, ($event.target as HTMLTextAreaElement).value)" />
                <div v-if="validatingFormulas[field.id]" class="absolute right-2 top-2">
                  <Icon name="lucide:loader-2" class="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              </div>
              <div v-if="formulaErrors[field.id]" class="flex items-start gap-2 rounded-md bg-destructive/10 p-2">
                <Icon name="lucide:alert-circle" class="h-4 w-4 shrink-0 text-destructive mt-0.5" />
                <p class="text-xs text-destructive">{{ formulaErrors[field.id] }}</p>
              </div>
              <div
                v-else-if="field.formula && !validatingFormulas[field.id]"
                class="flex items-center gap-2 text-xs text-emerald-600">
                <Icon name="lucide:check-circle" class="h-3.5 w-3.5" />
                Valid formula
              </div>
            </div>

            <!-- Formula Templates Panel -->
            <div v-if="showTemplates" class="space-y-3 rounded-lg border bg-background p-3">
              <div class="flex items-center justify-between">
                <h4 class="text-sm font-medium">Formula Templates</h4>
                <UiButton variant="ghost" size="sm" class="h-6 w-6 p-0" @click="showTemplates = false">
                  <Icon name="lucide:x" class="h-4 w-4" />
                </UiButton>
              </div>
              <div class="space-y-3 max-h-64 overflow-y-auto">
                <div v-for="category in formulaTemplates" :key="category.category" class="space-y-2">
                  <h5 class="text-xs font-semibold text-muted-foreground">{{ category.category }}</h5>
                  <div class="space-y-1">
                    <button
                      v-for="template in category.templates"
                      :key="template.name"
                      type="button"
                      class="w-full rounded-md border bg-background p-2 text-left transition hover:bg-accent"
                      @click="insertTemplate(field.id, template)">
                      <div class="text-xs font-medium">{{ template.name }}</div>
                      <div class="text-xs text-muted-foreground">{{ template.description }}</div>
                      <code class="mt-1 block text-xs text-primary">{{ template.code }}</code>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div class="space-y-1">
              <label class="text-xs font-medium">Return Type</label>
              <UiSelect
                :model-value="field.formulaReturnType || 'text'"
                @update:model-value="updateField(field.id, { formulaReturnType: $event as any })">
                <UiSelectTrigger class="h-8 text-xs">
                  <UiSelectValue />
                </UiSelectTrigger>
                <UiSelectContent>
                  <UiSelectItem value="text">Text</UiSelectItem>
                  <UiSelectItem value="number">Number</UiSelectItem>
                  <UiSelectItem value="boolean">Boolean</UiSelectItem>
                  <UiSelectItem value="date">Date</UiSelectItem>
                </UiSelectContent>
              </UiSelect>
            </div>

            <div class="space-y-2">
              <label class="text-xs font-medium">Quick Insert</label>
              <div class="space-y-2">
                <div v-for="category in ['Math', 'Array', 'Format', 'Logic']" :key="category" class="space-y-1">
                  <div class="text-xs font-medium text-muted-foreground">{{ category }}</div>
                  <div class="flex flex-wrap gap-1">
                    <UiButton
                      v-for="helper in formulaHelpers.filter((h) => h.category === category)"
                      :key="helper.label"
                      variant="outline"
                      size="sm"
                      class="h-7 text-xs font-mono"
                      @click="insertHelper(field.id, helper.code)">
                      {{ helper.label }}
                    </UiButton>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="flex items-center gap-4">
            <label class="flex items-center gap-2 text-sm">
              <UiCheckbox :checked="field.required" @update:checked="updateField(field.id, { required: $event })" />
              Required
            </label>
          </div>
        </div>
      </div>

      <div v-if="schema.fields.length === 0" class="rounded-lg border border-dashed p-8 text-center">
        <Icon name="lucide:table" class="text-muted-foreground mx-auto mb-2 h-8 w-8" />
        <p class="text-muted-foreground text-sm">No fields yet. Add your first field to get started.</p>
      </div>
    </div>
  </div>
</template>
