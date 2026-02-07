<script lang="ts" setup>
  const props = defineProps<{
    modelValue: string[]
    readonly?: boolean
  }>()

  const emit = defineEmits<{
    'update:modelValue': [value: string[]]
  }>()

  const tags = computed({
    get: () => props.modelValue,
    set: (v) => emit('update:modelValue', v),
  })

  const tagInput = ref('')

  const addTag = () => {
    const t = tagInput.value.trim()
    if (t && !tags.value.includes(t)) {
      emit('update:modelValue', [...tags.value, t])
    }
    tagInput.value = ''
  }

  const removeTag = (t: string) => {
    emit('update:modelValue', tags.value.filter((x) => x !== t))
  }
</script>

<template>
  <div v-if="tags.length || !readonly" class="p-4 space-y-1.5">
    <p class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Tags</p>
    <div class="flex flex-wrap items-center gap-1.5">
      <span
        v-for="tag in tags"
        :key="tag"
        class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs">
        {{ tag }}
        <button v-if="!readonly" class="hover:text-destructive" @click="removeTag(tag)">
          <Icon name="lucide:x" class="h-2.5 w-2.5" />
        </button>
      </span>
      <div v-if="!readonly" class="inline-flex items-center gap-1">
        <input
          v-model="tagInput"
          type="text"
          placeholder="Add tag..."
          class="bg-transparent text-xs outline-none w-24 placeholder:text-muted-foreground/50"
          @keydown.enter.prevent="addTag" />
      </div>
    </div>
  </div>
</template>
