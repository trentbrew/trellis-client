<script setup lang="ts">
  import type { DatabaseField } from '~/types/database'

  interface Props {
    value: any
    field: DatabaseField
    rowId: string
    isLoading?: boolean
    rowData?: Record<string, any>
  }

  interface Emits {
    (e: 'update', value: any): void
  }

  const props = defineProps<Props>()
  const emit = defineEmits<Emits>()

  // Compute formula values
  const computedFormulaValue = computed(() => {
    if (props.field.type !== 'formula' || !props.field.formula) {
      return null
    }

    try {
      const { evaluateSingleFormula } = useCollectionFormulas('table')
      const result = evaluateSingleFormula(props.field.formula, props.rowData || {})

      // Format based on return type
      if (result === null || result === undefined) return '-'

      switch (props.field.formulaReturnType) {
        case 'number':
          return typeof result === 'number' ? result.toLocaleString() : String(result)
        case 'boolean':
          return result ? '✓' : '✗'
        case 'date':
          return result instanceof Date ? result.toLocaleDateString() : String(result)
        default:
          return String(result)
      }
    } catch (error) {
      console.error('Formula evaluation error:', error)
      return '⚠️ Error'
    }
  })

  const isEditing = ref(false)
  const localValue = ref(props.value)
  const inputRef = ref<HTMLElement | null>(null)
  const isSaving = ref(false)
  const error = ref<string | null>(null)

  watch(
    () => props.value,
    (newValue) => {
      localValue.value = newValue
    },
  )

  const startEditing = () => {
    // Formula fields are non-editable
    if (props.field.type === 'formula') {
      return
    }

    if (props.field.type === 'checkbox') {
      toggleCheckbox()
      return
    }

    isEditing.value = true
    localValue.value = props.value
    error.value = null

    nextTick(() => {
      inputRef.value?.focus()
    })
  }

  const cancelEditing = () => {
    isEditing.value = false
    localValue.value = props.value
    error.value = null
  }

  const validateValue = (value: any): string | null => {
    if (props.field.required && (value === null || value === undefined || value === '')) {
      return 'This field is required'
    }

    switch (props.field.type) {
      case 'email':
        if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          return 'Invalid email format'
        }
        break
      case 'url':
        if (value && !/^https?:\/\/.+/.test(value)) {
          return 'Invalid URL format (must start with http:// or https://)'
        }
        break
      case 'number':
        if (value && isNaN(Number(value))) {
          return 'Must be a valid number'
        }
        break
    }

    return null
  }

  const saveValue = async () => {
    const validationError = validateValue(localValue.value)
    if (validationError) {
      error.value = validationError
      return
    }

    let processedValue = localValue.value

    if (props.field.type === 'number' && processedValue !== '') {
      processedValue = Number(processedValue)
    }

    if (props.field.type === 'date' && processedValue) {
      processedValue = new Date(processedValue).getTime()
    }

    isSaving.value = true
    try {
      emit('update', processedValue)
      isEditing.value = false
      error.value = null
    } catch {
      error.value = 'Failed to save'
    } finally {
      isSaving.value = false
    }
  }

  const toggleCheckbox = () => {
    emit('update', !props.value)
  }

  const handleKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      saveValue()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      cancelEditing()
    }
  }

  const displayValue = computed(() => {
    // Use computed formula value for formula fields
    if (props.field.type === 'formula') {
      return computedFormulaValue.value
    }

    const val = props.value

    if (val === undefined || val === null || val === '') return '-'

    switch (props.field.type) {
      case 'checkbox':
        return val ? '✓' : '✗'
      case 'date':
        return new Date(val).toLocaleDateString()
      case 'select':
      case 'multiselect':
        if (Array.isArray(val)) {
          return val.join(', ')
        }
        return String(val)
      default:
        return String(val)
    }
  })
</script>

<template>
  <div class="relative group">
    <!-- Read Mode -->
    <div
      v-if="!isEditing"
      class="min-h-8 flex items-center cursor-pointer hover:bg-accent/50 rounded px-2 -mx-2 transition-colors"
      :class="{ 'opacity-50': isLoading }"
      @dblclick="startEditing"
    >
      <!-- Checkbox Field -->
      <UiCheckbox v-if="field.type === 'checkbox'" :checked="value" :disabled="isLoading" @click="toggleCheckbox" />

      <!-- Formula Field (with indicator) -->
      <div v-else-if="field.type === 'formula'" class="flex items-center gap-2 w-full">
        <Icon name="lucide:zap" class="h-3 w-3 text-amber-500 shrink-0" />
        <span class="truncate italic text-muted-foreground">
          {{ displayValue }}
        </span>
      </div>

      <!-- Other Field Types -->
      <span v-else class="truncate">
        {{ displayValue }}
      </span>

      <!-- Edit Indicator (shows on hover, not for formulas) -->
      <Icon
        v-if="field.type !== 'formula'"
        name="lucide:pencil"
        class="ml-auto h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
      />
    </div>

    <!-- Edit Mode -->
    <div v-else class="relative">
      <!-- Text Input -->
      <input
        v-if="field.type === 'text'"
        ref="inputRef"
        v-model="localValue"
        type="text"
        class="w-full rounded border border-primary bg-background px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-primary"
        :class="{ 'border-destructive': error }"
        @blur="saveValue"
        @keydown="handleKeydown"
      />

      <!-- Number Input -->
      <input
        v-else-if="field.type === 'number'"
        ref="inputRef"
        v-model="localValue"
        type="number"
        class="w-full rounded border border-primary bg-background px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-primary"
        :class="{ 'border-destructive': error }"
        @blur="saveValue"
        @keydown="handleKeydown"
      />

      <!-- Email Input -->
      <input
        v-else-if="field.type === 'email'"
        ref="inputRef"
        v-model="localValue"
        type="email"
        class="w-full rounded border border-primary bg-background px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-primary"
        :class="{ 'border-destructive': error }"
        @blur="saveValue"
        @keydown="handleKeydown"
      />

      <!-- URL Input -->
      <input
        v-else-if="field.type === 'url'"
        ref="inputRef"
        v-model="localValue"
        type="url"
        class="w-full rounded border border-primary bg-background px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-primary"
        :class="{ 'border-destructive': error }"
        @blur="saveValue"
        @keydown="handleKeydown"
      />

      <!-- Date Input -->
      <input
        v-else-if="field.type === 'date'"
        ref="inputRef"
        v-model="localValue"
        type="date"
        class="w-full rounded border border-primary bg-background px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-primary"
        :class="{ 'border-destructive': error }"
        @blur="saveValue"
        @keydown="handleKeydown"
      />

      <!-- Select Input -->
      <select
        v-else-if="field.type === 'select' && field.options"
        ref="inputRef"
        v-model="localValue"
        class="w-full rounded border border-primary bg-background px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-primary"
        :class="{ 'border-destructive': error }"
        @blur="saveValue"
        @change="saveValue"
        @keydown="handleKeydown"
      >
        <option value="">Select...</option>
        <option v-for="option in field.options" :key="option.value" :value="option.value">
          {{ option.value }}
        </option>
      </select>

      <!-- File Input (placeholder) -->
      <input
        v-else-if="field.type === 'file'"
        ref="inputRef"
        type="text"
        disabled
        placeholder="File upload coming soon..."
        class="w-full rounded border border-muted bg-muted px-2 py-1 text-sm"
      />

      <!-- Relation Input (placeholder) -->
      <input
        v-else-if="field.type === 'relation'"
        ref="inputRef"
        type="text"
        disabled
        placeholder="Relation field coming soon..."
        class="w-full rounded border border-muted bg-muted px-2 py-1 text-sm"
      />

      <!-- Formula Input (read-only) -->
      <input
        v-else-if="field.type === 'formula'"
        ref="inputRef"
        type="text"
        disabled
        :value="displayValue"
        class="w-full rounded border border-muted bg-muted px-2 py-1 text-sm"
      />

      <!-- Saving Indicator -->
      <div v-if="isSaving" class="absolute -right-6 top-1/2 -translate-y-1/2">
        <Icon name="lucide:loader-2" class="h-3 w-3 animate-spin text-muted-foreground" />
      </div>

      <!-- Error Message -->
      <div
        v-if="error"
        class="absolute left-0 top-full mt-1 text-xs text-destructive bg-destructive/10 px-2 py-1 rounded whitespace-nowrap z-10"
      >
        {{ error }}
      </div>
    </div>
  </div>
</template>
