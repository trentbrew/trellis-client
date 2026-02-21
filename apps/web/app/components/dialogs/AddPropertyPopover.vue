<script lang="ts" setup>
  /**
   * AddPropertyPopover — Inline field creator for user-tier ontologies.
   *
   * Renders a popover with:
   *  - Field name input (auto-slugged to camelCase)
   *  - Value type picker grid
   *  - Optional select options editor (for select/multi_select/status)
   *  - Add button that calls useOntologyRegistry.addFieldToType()
   */

  const props = defineProps<{
    schemaId: string
    existingFieldNames: string[]
  }>()

  const emit = defineEmits<{
    added: [fieldName: string]
  }>()

  const { addFieldToType } = useOntologyRegistry()
  const { $toast } = useNuxtApp()

  const open = ref(false)
  const fieldName = ref('')
  const selectedType = ref<string | null>(null)
  const adding = ref(false)
  const error = ref<string | null>(null)

  // Select/multi_select/status options
  const optionsInput = ref('')
  const selectOptions = ref<{ name: string; color?: string }[]>([])

  const VALUE_TYPES = [
    { value: 'text', label: 'Text', icon: 'lucide:type' },
    { value: 'rich_text', label: 'Rich Text', icon: 'lucide:align-left' },
    { value: 'number', label: 'Number', icon: 'lucide:hash' },
    { value: 'select', label: 'Select', icon: 'lucide:chevrons-up-down' },
    { value: 'multi_select', label: 'Multi Select', icon: 'lucide:list-checks' },
    { value: 'status', label: 'Status', icon: 'lucide:circle-dot' },
    { value: 'date', label: 'Date', icon: 'lucide:calendar' },
    { value: 'checkbox', label: 'Checkbox', icon: 'lucide:check-square' },
    { value: 'url', label: 'URL', icon: 'lucide:link' },
    { value: 'email', label: 'Email', icon: 'lucide:mail' },
    { value: 'phone_number', label: 'Phone', icon: 'lucide:phone' },
  ] as const

  const NEEDS_OPTIONS = new Set(['select', 'multi_select', 'status'])
  const showOptionsEditor = computed(() => selectedType.value && NEEDS_OPTIONS.has(selectedType.value))

  // Auto-slug field name to camelCase
  const sluggedName = computed(() => {
    return fieldName.value
      .trim()
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .replace(/\s+(.)/g, (_, c) => c.toUpperCase())
      .replace(/^\w/, (c) => c.toLowerCase())
  })

  const isDuplicate = computed(() => {
    return props.existingFieldNames.includes(sluggedName.value)
  })

  const isValid = computed(() => {
    if (!sluggedName.value || !selectedType.value) return false
    if (isDuplicate.value) return false
    if (showOptionsEditor.value && selectOptions.value.length === 0) return false
    return true
  })

  function addOption() {
    const name = optionsInput.value.trim()
    if (!name) return
    if (selectOptions.value.some((o) => o.name === name)) return
    selectOptions.value.push({ name })
    optionsInput.value = ''
  }

  function removeOption(name: string) {
    selectOptions.value = selectOptions.value.filter((o) => o.name !== name)
  }

  function reset() {
    fieldName.value = ''
    selectedType.value = null
    optionsInput.value = ''
    selectOptions.value = []
    error.value = null
    adding.value = false
  }

  async function handleAdd() {
    if (!isValid.value || adding.value) return
    adding.value = true
    error.value = null

    try {
      const field: Record<string, any> = {
        name: sluggedName.value,
        valueType: selectedType.value!,
      }

      if (showOptionsEditor.value && selectOptions.value.length > 0) {
        field.selectOptions = [...selectOptions.value]
      }

      await addFieldToType(props.schemaId, field as any)
      emit('added', sluggedName.value)
      reset()
      open.value = false
    } catch (err: any) {
      error.value = err.message || 'Failed to add property'
      ;($toast as any)?.error?.(error.value)
    } finally {
      adding.value = false
    }
  }

  watch(open, (val) => {
    if (!val) reset()
  })
</script>

<template>
  <UiPopover v-model:open="open">
    <UiPopoverTrigger as-child>
      <button
        class="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs border border-dashed border-muted-foreground/30 text-muted-foreground/60 hover:border-muted-foreground/50 hover:bg-muted/30 hover:text-muted-foreground transition-colors"
        title="Add property"
      >
        <Icon name="lucide:plus" class="h-3 w-3" />
      </button>
    </UiPopoverTrigger>
    <UiPopoverContent align="start" :side-offset="6" class="w-72 p-0">
      <div class="p-3 space-y-3">
        <!-- Header -->
        <p class="text-xs font-medium text-foreground">Add property</p>

        <!-- Field name -->
        <div class="space-y-1">
          <input
            v-model="fieldName"
            type="text"
            placeholder="Property name…"
            class="w-full h-8 rounded-md border border-border bg-transparent text-sm px-2.5 outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/50"
            @keydown.enter="isValid && handleAdd()"
          />
          <p v-if="sluggedName && sluggedName !== fieldName.trim()" class="text-[10px] text-muted-foreground px-0.5">
            Field ID: <code class="bg-muted/50 px-1 py-0.5 rounded text-[9px]">{{ sluggedName }}</code>
          </p>
          <p v-if="isDuplicate" class="text-[10px] text-destructive px-0.5">
            A field with this name already exists
          </p>
        </div>

        <!-- Value type grid -->
        <div class="space-y-1.5">
          <p class="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Type</p>
          <div class="grid grid-cols-2 gap-1">
            <button
              v-for="vt in VALUE_TYPES"
              :key="vt.value"
              class="flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors text-left"
              :class="selectedType === vt.value
                ? 'bg-primary/10 text-primary ring-1 ring-primary/30'
                : 'hover:bg-muted/50 text-muted-foreground hover:text-foreground'"
              @click="selectedType = vt.value"
            >
              <Icon :name="vt.icon" class="h-3.5 w-3.5 shrink-0" />
              <span>{{ vt.label }}</span>
            </button>
          </div>
        </div>

        <!-- Select options editor (for select/multi_select/status) -->
        <div v-if="showOptionsEditor" class="space-y-1.5">
          <p class="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Options</p>
          <!-- Existing options -->
          <div v-if="selectOptions.length" class="flex flex-wrap gap-1">
            <span
              v-for="opt in selectOptions"
              :key="opt.name"
              class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-muted/60 text-foreground"
            >
              {{ opt.name }}
              <button
                class="h-3 w-3 flex items-center justify-center rounded-full hover:bg-destructive/20 transition-colors"
                @click="removeOption(opt.name)"
              >
                <Icon name="lucide:x" class="h-2 w-2" />
              </button>
            </span>
          </div>
          <!-- Add option input -->
          <div class="flex items-center gap-1.5">
            <input
              v-model="optionsInput"
              type="text"
              placeholder="Add option…"
              class="flex-1 h-7 rounded-md border border-border bg-transparent text-xs px-2 outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/50"
              @keydown.enter.prevent="addOption"
            />
            <button
              :disabled="!optionsInput.trim()"
              class="h-7 px-2 rounded-md text-xs text-primary hover:bg-primary/10 disabled:opacity-40 transition-colors"
              @click="addOption"
            >Add</button>
          </div>
        </div>

        <!-- Error -->
        <p v-if="error" class="text-[11px] text-destructive">{{ error }}</p>

        <!-- Actions -->
        <div class="flex items-center justify-end gap-2 pt-1 border-t border-border">
          <button
            class="h-7 px-3 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            @click="open = false"
          >Cancel</button>
          <button
            :disabled="!isValid || adding"
            class="h-7 px-3 rounded-md text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 transition-colors"
            @click="handleAdd"
          >
            {{ adding ? 'Adding…' : 'Add property' }}
          </button>
        </div>
      </div>
    </UiPopoverContent>
  </UiPopover>
</template>
