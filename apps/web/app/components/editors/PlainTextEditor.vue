<script setup lang="ts">
  interface Props {
    modelValue: string
    placeholder?: string
    editable?: boolean
  }

  interface Emits {
    (e: 'update:modelValue' | 'change', value: string): void
  }

  const props = withDefaults(defineProps<Props>(), {
    placeholder: 'Start writing...',
    editable: true,
  })

  const emit = defineEmits<Emits>()

  const textareaRef = ref<HTMLTextAreaElement | null>(null)
  const localValue = ref(props.modelValue)

  const scrollToTop = () => {
    if (!textareaRef.value) return
    textareaRef.value.scrollTop = 0
  }

  defineExpose({ scrollToTop })

  watch(
    () => props.modelValue,
    (newValue) => {
      if (newValue !== localValue.value) {
        localValue.value = newValue
      }
    },
  )

  const handleInput = (event: Event) => {
    const target = event.target as HTMLTextAreaElement
    localValue.value = target.value
    emit('update:modelValue', target.value)
    emit('change', target.value)
  }

  onMounted(() => {
    if (textareaRef.value) {
      textareaRef.value.focus()
    }
  })
</script>

<template>
  <div class="h-full w-full">
    <textarea
      ref="textareaRef"
      v-model="localValue"
      :placeholder="placeholder"
      :disabled="!editable"
      class="w-full h-full resize-none bg-transparent px-6 py-4 focus:outline-none font-mono text-sm leading-relaxed"
      @input="handleInput"
    />
  </div>
</template>
