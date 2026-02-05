<script setup lang="ts">
  const isOpen = defineModel<boolean>('open', { default: false })

  const props = withDefaults(
    defineProps<{
      title?: string
      description?: string
      placeholder?: string
      initialValue?: string
      confirmLabel?: string
    }>(),
    {
      title: 'Add property',
      description: 'Enter a property name.',
      placeholder: 'Property name',
      initialValue: '',
      confirmLabel: 'Add',
    },
  )

  const emit = defineEmits<{
    confirm: [value: string]
  }>()

  const value = ref(props.initialValue)

  watch(
    () => isOpen.value,
    (open) => {
      if (!open) return
      value.value = props.initialValue
    },
  )

  const canSubmit = computed(() => String(value.value || '').trim().length > 0)

  const submit = () => {
    const v = String(value.value || '').trim()
    if (!v) return
    emit('confirm', v)
    isOpen.value = false
  }
</script>

<template>
  <UiDialog v-model:open="isOpen">
    <UiDialogContent class="sm:max-w-md">
      <UiDialogHeader>
        <UiDialogTitle>{{ props.title }}</UiDialogTitle>
        <UiDialogDescription>{{ props.description }}</UiDialogDescription>
      </UiDialogHeader>

      <div class="space-y-2 py-2">
        <UiInput v-model="value" :placeholder="props.placeholder" autocomplete="off" @keydown.enter.prevent="submit" />
      </div>

      <UiDialogFooter>
        <UiButton variant="outline" @click="isOpen = false">Cancel</UiButton>
        <UiButton :disabled="!canSubmit" @click="submit">{{ props.confirmLabel }}</UiButton>
      </UiDialogFooter>
    </UiDialogContent>
  </UiDialog>
</template>
