<script lang="ts" setup>
  export interface TemplateField {
    id: string
    name: string
    type: 'choice' | 'text' | 'image' | 'file'
    options?: string[]
  }

  export interface GroupInstance {
    id: string
    name: string
  }

  export interface RepeatingGroupConfig {
    name: string
    helpText: string
    groups: GroupInstance[]
    templateFields: TemplateField[]
  }

  const props = defineProps<{
    open: boolean
    config: RepeatingGroupConfig
  }>()

  const emit = defineEmits<{
    'update:open': [value: boolean]
    'update:config': [value: RepeatingGroupConfig]
    save: [config: RepeatingGroupConfig]
  }>()

  const localConfig = reactive<RepeatingGroupConfig>({
    name: '',
    helpText: '',
    groups: [],
    templateFields: [],
  })

  const newGroupName = ref('')

  const templateFieldTypes = [
    { value: 'choice', label: 'Choice', icon: 'lucide:list' },
    { value: 'text', label: 'Text', icon: 'lucide:type' },
    { value: 'image', label: 'Image upload', icon: 'lucide:image' },
    { value: 'file', label: 'File upload', icon: 'lucide:upload' },
  ]

  watch(
    () => props.open,
    (isOpen) => {
      if (isOpen) {
        Object.assign(localConfig, JSON.parse(JSON.stringify(props.config)))
      }
    },
    { immediate: true },
  )

  const addGroup = () => {
    if (!newGroupName.value.trim()) return
    localConfig.groups.push({
      id: `group-${Date.now()}`,
      name: newGroupName.value.trim(),
    })
    newGroupName.value = ''
  }

  const removeGroup = (id: string) => {
    const index = localConfig.groups.findIndex((g) => g.id === id)
    if (index !== -1) localConfig.groups.splice(index, 1)
  }

  const addTemplateField = () => {
    localConfig.templateFields.push({
      id: `field-${Date.now()}`,
      name: '',
      type: 'text',
    })
  }

  const removeTemplateField = (id: string) => {
    const index = localConfig.templateFields.findIndex((f) => f.id === id)
    if (index !== -1) localConfig.templateFields.splice(index, 1)
  }

  const handleSave = () => {
    emit('save', JSON.parse(JSON.stringify(localConfig)))
    emit('update:open', false)
  }

  const handleCancel = () => {
    emit('update:open', false)
  }
</script>

<template>
  <UiDialog :open="open" @update:open="emit('update:open', $event)">
    <UiDialogContent class="sm:max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
      <UiDialogHeader class="shrink-0">
        <UiDialogTitle class="flex items-center gap-2">
          <Icon name="lucide:layers" class="h-5 w-5 text-primary" />
          Configure Repeating Question Group
        </UiDialogTitle>
        <UiDialogDescription>
          Create groups that will each get their own set of questions. Each group will generate a separate copy of the
          template questions below.
        </UiDialogDescription>
      </UiDialogHeader>

      <div class="flex-1 overflow-y-auto py-4 space-y-6">
        <!-- Group Name -->
        <div class="space-y-2">
          <label class="text-sm font-medium">Repeating Question Group Name</label>
          <input
            v-model="localConfig.name"
            type="text"
            placeholder="e.g., Storage Areas"
            class="w-full h-9 text-sm bg-card rounded-md px-3 border border-border focus:outline-none focus:ring-2 focus:ring-primary" />
          <p class="text-xs text-muted-foreground">
            This will be used as the overall header for the repeating question group.
          </p>
        </div>

        <!-- Help Text -->
        <div class="space-y-2">
          <label class="text-sm font-medium">Help Text</label>
          <textarea
            v-model="localConfig.helpText"
            placeholder="If needed, describe what information should be filled in for this repeating question group."
            rows="3"
            class="w-full text-sm bg-card rounded-md px-3 py-2 border border-border focus:outline-none focus:ring-2 focus:ring-primary resize-none" />
        </div>

        <!-- Create Groups -->
        <div class="space-y-3">
          <div>
            <label class="text-sm font-medium">Create Groups</label>
            <p class="text-xs text-muted-foreground mt-0.5">
              Create groups that will each get their own set of questions. Examples: "Storage Area 1", "Storage Area 2",
              "Loading Dock", "Maintenance Shop", etc.
            </p>
          </div>

          <div class="flex gap-2">
            <input
              v-model="newGroupName"
              type="text"
              placeholder="e.g., Storage Area 1"
              class="flex-1 h-9 text-sm bg-card rounded-md px-3 border border-border focus:outline-none focus:ring-2 focus:ring-primary"
              @keydown.enter="addGroup" />
            <UiButton variant="outline" size="sm" class="h-9 shrink-0" @click="addGroup">
              <Icon name="lucide:plus" class="h-4 w-4 mr-1" />
              Add
            </UiButton>
          </div>

          <!-- Groups List -->
          <div v-if="localConfig.groups.length" class="space-y-2">
            <div
              v-for="group in localConfig.groups"
              :key="group.id"
              class="flex items-center gap-2 px-3 py-2 bg-muted/30 rounded-lg border border-border">
              <Icon name="lucide:folder" class="h-4 w-4 text-muted-foreground shrink-0" />
              <input
                v-model="group.name"
                type="text"
                class="flex-1 text-sm bg-transparent border-none focus:outline-none" />
              <UiButton
                variant="ghost"
                size="icon"
                class="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
                @click="removeGroup(group.id)">
                <Icon name="lucide:x" class="h-3.5 w-3.5" />
              </UiButton>
            </div>
          </div>
          <p v-else class="text-xs text-muted-foreground italic">
            Each group will create a separate set of fields from your template. Add groups above to get started.
          </p>
        </div>

        <!-- Template Fields -->
        <div class="space-y-3 pt-4 border-t border-border">
          <div class="flex items-center justify-between">
            <div>
              <label class="text-sm font-medium">Template Fields</label>
              <p class="text-xs text-muted-foreground mt-0.5">
                Add fields that will be repeated for each instance. Use # in fields below to insert the name of the
                group.
              </p>
            </div>
            <UiButton variant="outline" size="sm" class="h-8 text-xs" @click="addTemplateField">
              <Icon name="lucide:plus" class="h-3.5 w-3.5 mr-1" />
              Add Template Field
            </UiButton>
          </div>

          <!-- Template Fields Header -->
          <div v-if="localConfig.templateFields.length" class="flex gap-2 text-xs text-muted-foreground">
            <span class="shrink-0">Field type</span>
            <span class="flex-1">Field name</span>
            <span class="w-6 shrink-0" />
          </div>

          <!-- Template Fields List -->
          <div v-if="localConfig.templateFields.length" class="space-y-2">
            <div v-for="field in localConfig.templateFields" :key="field.id" class="flex items-center gap-2">
              <!-- Field Type (dynamic width) -->
              <UiSelect v-model="field.type">
                <UiSelectTrigger class="h-8 text-xs w-auto shrink-0 min-w-[90px]">
                  <div class="flex items-center gap-1.5">
                    <Icon
                      :name="templateFieldTypes.find((t) => t.value === field.type)?.icon || 'lucide:type'"
                      class="h-3 w-3 shrink-0" />
                    <UiSelectValue class="truncate" />
                  </div>
                </UiSelectTrigger>
                <UiSelectContent>
                  <UiSelectItem v-for="t in templateFieldTypes" :key="t.value" :value="t.value">
                    <div class="flex items-center gap-2">
                      <Icon :name="t.icon" class="h-3.5 w-3.5" />
                      {{ t.label }}
                    </div>
                  </UiSelectItem>
                </UiSelectContent>
              </UiSelect>

              <!-- Field Name -->
              <input
                v-model="field.name"
                type="text"
                placeholder="Field name (use # for group name)"
                class="flex-1 h-8 text-xs bg-card rounded px-2 border border-border focus:outline-none focus:ring-1 focus:ring-primary" />

              <!-- Delete -->
              <UiButton
                variant="ghost"
                size="icon"
                class="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
                @click="removeTemplateField(field.id)">
                <Icon name="lucide:trash-2" class="h-3.5 w-3.5" />
              </UiButton>
            </div>
          </div>

          <!-- Available field types hint -->
          <p class="text-xs text-muted-foreground">
            <span class="font-medium">Available field types:</span>
            Choice, Text, Image upload, File upload
          </p>
        </div>

        <!-- Preview Section -->
        <div
          v-if="localConfig.groups.length && localConfig.templateFields.length"
          class="space-y-3 pt-4 border-t border-border">
          <div class="flex items-center justify-between">
            <label class="text-sm font-medium">Preview</label>
            <span class="text-xs text-muted-foreground">
              {{ localConfig.groups.length }} group(s) × {{ localConfig.templateFields.length }} field(s)
            </span>
          </div>
          <div class="bg-muted/20 rounded-lg p-3 space-y-3 max-h-48 overflow-y-auto">
            <div v-for="group in localConfig.groups" :key="group.id" class="space-y-1.5">
              <p class="text-xs font-medium text-foreground">{{ group.name }}</p>
              <div class="pl-3 space-y-1 border-l-2 border-border">
                <p v-for="field in localConfig.templateFields" :key="field.id" class="text-xs text-muted-foreground">
                  <Icon
                    :name="templateFieldTypes.find((t) => t.value === field.type)?.icon || 'lucide:type'"
                    class="h-3 w-3 inline mr-1" />
                  {{ field.name?.replace('#', group.name) || `[${field.type}]` }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <UiDialogFooter class="shrink-0 pt-4 border-t border-border">
        <UiButton variant="outline" @click="handleCancel">Cancel</UiButton>
        <UiButton @click="handleSave">
          <Icon name="lucide:check" class="h-4 w-4 mr-1" />
          Save Configuration
        </UiButton>
      </UiDialogFooter>
    </UiDialogContent>
  </UiDialog>
</template>
