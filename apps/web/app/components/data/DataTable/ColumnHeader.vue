<script setup lang="ts">
  import type { DatabaseField } from '~/types/database'

  const FIELD_TYPE_META: Record<string, { label: string; icon: string }> = {
    text: { label: 'Text', icon: 'lucide:type' },
    number: { label: 'Number', icon: 'lucide:hash' },
    select: { label: 'Select', icon: 'lucide:list' },
    multiselect: { label: 'Multi-select', icon: 'lucide:list-checks' },
    date: { label: 'Date', icon: 'lucide:calendar' },
    checkbox: { label: 'Checkbox', icon: 'lucide:check-square' },
    url: { label: 'URL', icon: 'lucide:link' },
    email: { label: 'Email', icon: 'lucide:mail' },
    file: { label: 'File', icon: 'lucide:paperclip' },
    formula: { label: 'Formula', icon: 'lucide:function-square' },
    relation: { label: 'Relation', icon: 'lucide:git-branch' },
  }

  const FIELD_TYPES = Object.entries(FIELD_TYPE_META).map(([value, meta]) => ({
    value,
    ...meta,
  }))

  const props = defineProps<{
    field: DatabaseField
    sortDirection?: 'asc' | 'desc' | false
    canSort?: boolean
  }>()

  const emit = defineEmits<{
    sort: []
    'update:field': [updates: Partial<DatabaseField>]
    delete: []
  }>()

  const isMenuOpen = ref(false)
  const isRenaming = ref(false)
  const renameValue = ref('')
  const renameInputRef = ref<HTMLInputElement | null>(null)

  // Formula editing state
  const isEditingFormula = ref(false)
  const formulaValue = ref('')
  const formulaReturnType = ref<'text' | 'number' | 'boolean' | 'date'>('text')
  const formulaInputRef = ref<HTMLTextAreaElement | null>(null)

  const typeMeta = computed(() => FIELD_TYPE_META[props.field.type] || { label: props.field.type, icon: 'lucide:circle' })

  const startRename = () => {
    renameValue.value = props.field.name
    isRenaming.value = true
    isMenuOpen.value = false
    nextTick(() => {
      renameInputRef.value?.focus()
      renameInputRef.value?.select()
    })
  }

  const confirmRename = () => {
    const trimmed = renameValue.value.trim()
    if (trimmed && trimmed !== props.field.name) {
      emit('update:field', { name: trimmed })
    }
    isRenaming.value = false
  }

  const cancelRename = () => {
    isRenaming.value = false
  }

  const handleRenameKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      confirmRename()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      cancelRename()
    }
  }

  const changeType = (newType: string) => {
    if (newType !== props.field.type) {
      emit('update:field', { type: newType as DatabaseField['type'] })
    }
    isMenuOpen.value = false
  }

  const toggleRequired = () => {
    emit('update:field', { required: !props.field.required })
  }

  const handleDelete = () => {
    emit('delete')
    isMenuOpen.value = false
  }

  // Formula editing
  const startEditFormula = () => {
    formulaValue.value = props.field.formula || ''
    formulaReturnType.value = props.field.formulaReturnType || 'text'
    isEditingFormula.value = true
    isMenuOpen.value = false
    nextTick(() => {
      formulaInputRef.value?.focus()
    })
  }

  const saveFormula = () => {
    emit('update:field', {
      formula: formulaValue.value.trim() || undefined,
      formulaReturnType: formulaReturnType.value,
    })
    isEditingFormula.value = false
  }

  const cancelFormula = () => {
    isEditingFormula.value = false
  }
</script>

<template>
  <div class="flex flex-col gap-1 w-full min-w-0">
    <!-- Formula editor (inline popover below header) -->
    <UiPopover v-if="isEditingFormula" :open="isEditingFormula" @update:open="(v) => { if (!v) cancelFormula() }">
      <UiPopoverTrigger as-child>
        <div class="flex items-center gap-1.5 min-w-0">
          <Icon :name="typeMeta.icon" class="h-3.5 w-3.5 shrink-0 opacity-40" />
          <span class="truncate">{{ field.name }}</span>
        </div>
      </UiPopoverTrigger>
      <UiPopoverContent align="start" :side-offset="4" class="w-72 p-3">
        <div class="space-y-3">
          <div class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Edit Formula</div>
          <textarea
            ref="formulaInputRef"
            v-model="formulaValue"
            rows="3"
            placeholder="e.g., $sum(price, tax) or status === 'Done' ? 1 : 0"
            class="w-full rounded-md border border-border bg-background px-2.5 py-2 text-xs font-mono outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary resize-none"
            @keydown.meta.enter="saveFormula"
            @keydown.ctrl.enter="saveFormula" />
          <div class="flex items-center gap-2">
            <label class="text-[11px] text-muted-foreground shrink-0">Returns:</label>
            <select
              v-model="formulaReturnType"
              class="h-7 flex-1 rounded-md border border-border bg-background px-2 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary">
              <option value="text">Text</option>
              <option value="number">Number</option>
              <option value="boolean">Boolean</option>
              <option value="date">Date</option>
            </select>
          </div>
          <div class="flex items-center gap-2">
            <UiButton size="sm" class="flex-1 h-7 text-xs" @click="saveFormula">Save</UiButton>
            <UiButton size="sm" variant="outline" class="h-7 text-xs" @click="cancelFormula">Cancel</UiButton>
          </div>
        </div>
      </UiPopoverContent>
    </UiPopover>

    <!-- Normal header (rename / display / menu) -->
    <div v-else class="flex items-center gap-1 w-full min-w-0">
    <!-- Rename inline input -->
    <template v-if="isRenaming">
      <input
        ref="renameInputRef"
        v-model="renameValue"
        type="text"
        class="h-5 flex-1 min-w-0 rounded border border-primary bg-background px-1.5 text-xs font-medium outline-none focus:ring-1 focus:ring-primary"
        @blur="confirmRename"
        @keydown="handleRenameKeydown" />
    </template>

    <!-- Normal header display -->
    <template v-else>
      <div
        class="flex flex-1 items-center gap-1.5 min-w-0"
        :class="{ 'cursor-pointer select-none hover:text-foreground': canSort }"
        @click="canSort && emit('sort')">
        <Icon :name="typeMeta.icon" class="h-3.5 w-3.5 shrink-0 opacity-40" />
        <span class="truncate">{{ field.name }}</span>
        <Icon
          v-if="sortDirection"
          :name="sortDirection === 'asc' ? 'lucide:chevron-up' : 'lucide:chevron-down'"
          class="h-3 w-3 shrink-0" />
      </div>

      <!-- Column menu trigger -->
      <UiDropdownMenu v-model:open="isMenuOpen">
        <UiDropdownMenuTrigger as-child>
          <button
            type="button"
            class="h-5 w-5 shrink-0 rounded flex items-center justify-center opacity-0 group-hover/col:opacity-100 hover:bg-accent transition-opacity"
            @click.stop>
            <Icon name="lucide:chevron-down" class="h-3 w-3" />
          </button>
        </UiDropdownMenuTrigger>
        <UiDropdownMenuContent align="start" :side-offset="4" class="w-52">
          <!-- Rename -->
          <UiDropdownMenuItem @click="startRename">
            <Icon name="lucide:pencil" class="mr-2 h-4 w-4" />
            Rename
          </UiDropdownMenuItem>

          <!-- Type submenu -->
          <UiDropdownMenuSub>
            <UiDropdownMenuSubTrigger>
              <Icon :name="typeMeta.icon" class="mr-2 h-4 w-4" />
              Type: {{ typeMeta.label }}
            </UiDropdownMenuSubTrigger>
            <UiDropdownMenuSubContent class="w-44">
              <UiDropdownMenuItem
                v-for="ft in FIELD_TYPES"
                :key="ft.value"
                @click="changeType(ft.value)">
                <Icon :name="ft.icon" class="mr-2 h-4 w-4" />
                <span class="flex-1">{{ ft.label }}</span>
                <Icon v-if="ft.value === field.type" name="lucide:check" class="h-3.5 w-3.5 text-primary" />
              </UiDropdownMenuItem>
            </UiDropdownMenuSubContent>
          </UiDropdownMenuSub>

          <!-- Required toggle -->
          <UiDropdownMenuItem @click.prevent="toggleRequired">
            <Icon :name="field.required ? 'lucide:check-square' : 'lucide:square'" class="mr-2 h-4 w-4" />
            Required
          </UiDropdownMenuItem>

          <UiDropdownMenuSeparator />

          <!-- Edit formula (only for formula fields) -->
          <UiDropdownMenuItem v-if="field.type === 'formula'" @click="startEditFormula">
            <Icon name="lucide:function-square" class="mr-2 h-4 w-4" />
            Edit formula
          </UiDropdownMenuItem>

          <!-- Sort -->
          <UiDropdownMenuItem v-if="canSort" @click="emit('sort')">
            <Icon name="lucide:arrow-up-down" class="mr-2 h-4 w-4" />
            Sort
          </UiDropdownMenuItem>

          <UiDropdownMenuSeparator />

          <!-- Delete -->
          <UiDropdownMenuItem class="text-destructive focus:text-destructive" @click="handleDelete">
            <Icon name="lucide:trash-2" class="mr-2 h-4 w-4" />
            Delete column
          </UiDropdownMenuItem>
        </UiDropdownMenuContent>
      </UiDropdownMenu>
    </template>
    </div>
  </div>
</template>
