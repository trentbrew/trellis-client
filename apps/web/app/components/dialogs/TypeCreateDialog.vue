<script setup lang="ts">
  import { SYSTEM_TYPES } from '~/lib/systemTypes'

  const props = defineProps<{
    open: boolean
    defaultExtends?: string
  }>()

  const emit = defineEmits<{
    'update:open': [value: boolean]
  }>()

  const typeName = ref('')
  const typeDescription = ref('')
  const typeIcon = ref('lucide:boxes')
  const extendsType = ref('')
  const isSubmitting = ref(false)

  const { customTypes } = useInstantData()
  const systemTypes = computed(() => SYSTEM_TYPES)

  const extendsOptions = computed(() => {
    const custom = (customTypes.value || []).map((t) => ({
      value: t.id,
      label: t.name,
      icon: t.icon || 'lucide:blocks',
      group: 'Custom',
    }))

    const system = systemTypes.value.map((t) => ({
      value: t.id,
      label: t.name,
      icon: t.icon || 'lucide:box',
      group: 'System',
    }))

    return [...system, ...custom]
  })

  const extendsTypeSelectValue = computed({
    get: () => extendsType.value || '__none__',
    set: (val: string) => {
      extendsType.value = val === '__none__' ? '' : val
    },
  })

  const router = useRouter()
  const { createCustomType } = useInstantData()

  const handleSubmit = async () => {
    if (!typeName.value.trim()) return

    isSubmitting.value = true
    try {
      const id = await createCustomType({
        name: typeName.value.trim(),
        description: typeDescription.value.trim() || undefined,
        icon: typeIcon.value,
        extends: extendsType.value || undefined,
      })

      // Reset form
      typeName.value = ''
      typeDescription.value = ''
      typeIcon.value = 'lucide:boxes'
      extendsType.value = ''

      // Close modal
      emit('update:open', false)

      await router.push(`/types/${id}`)
    } finally {
      isSubmitting.value = false
    }
  }

  const handleOpen = (state: boolean) => {
    emit('update:open', state)
    if (!state) {
      typeName.value = ''
      typeDescription.value = ''
      typeIcon.value = 'lucide:boxes'
      extendsType.value = ''
      return
    }

    extendsType.value = props.defaultExtends || ''
  }

  watch(
    () => props.open,
    (open) => {
      if (!open) return
      extendsType.value = props.defaultExtends || ''
    },
  )
</script>

<template>
  <UiDialog :open="props.open" @update:open="handleOpen">
    <UiDialogContent class="sm:max-w-md">
      <UiDialogHeader>
        <UiDialogTitle>Create New Type</UiDialogTitle>
        <UiDialogDescription>Define a new custom type that extends the system ontology.</UiDialogDescription>
      </UiDialogHeader>

      <div class="space-y-4">
        <div class="space-y-2">
          <UiLabel for="type-name">Type Name</UiLabel>
          <UiInput
            id="type-name"
            v-model="typeName"
            placeholder="e.g., Person, Organization, Event"
            :disabled="isSubmitting" />
        </div>

        <div class="space-y-2">
          <UiLabel for="type-description">Description</UiLabel>
          <UiTextarea
            id="type-description"
            v-model="typeDescription"
            placeholder="Brief description of this type"
            :disabled="isSubmitting"
            :rows="3" />
        </div>

        <div class="space-y-2">
          <UiLabel for="extends-type">Extends Type (Optional)</UiLabel>
          <UiSelect v-model="extendsTypeSelectValue" :disabled="isSubmitting">
            <UiSelectTrigger id="extends-type">
              <UiSelectValue placeholder="Select a base type" />
            </UiSelectTrigger>
            <UiSelectContent>
              <UiSelectItem value="__none__">None (Custom Type)</UiSelectItem>
              <UiSelectItem v-for="opt in extendsOptions" :key="opt.value" :value="opt.value">
                <div class="flex items-center gap-2">
                  <Icon :name="opt.icon" class="h-4 w-4" />
                  <span class="truncate">{{ opt.label }}</span>
                  <span class="text-muted-foreground ml-auto text-xs">{{ opt.group }}</span>
                </div>
              </UiSelectItem>
            </UiSelectContent>
          </UiSelect>
        </div>
      </div>

      <UiDialogFooter>
        <UiButton :disabled="isSubmitting" variant="outline" @click="handleOpen(false)">Cancel</UiButton>
        <UiButton :disabled="!typeName.trim() || isSubmitting" @click="handleSubmit">
          {{ isSubmitting ? 'Creating...' : 'Create Type' }}
        </UiButton>
      </UiDialogFooter>
    </UiDialogContent>
  </UiDialog>
</template>
