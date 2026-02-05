<script lang="ts" setup>
import type { Tag } from '~/types/database'

const props = defineProps<{
  modelValue: string[]
  placeholder?: string
  allowCreate?: boolean
  maxTags?: number
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string[]]
}>()

const { tags, createTag, getTagsByIds, searchTags } = useTags()

const searchQuery = ref('')
const isOpen = ref(false)
const inputRef = ref<HTMLInputElement | null>(null)

// Selected tags (full objects)
const selectedTags = computed(() => getTagsByIds(props.modelValue))

// Filtered tags for dropdown
const filteredTags = computed(() => {
  if (!searchQuery.value.trim()) {
    return tags.value.filter((t) => !props.modelValue.includes(t.id))
  }
  return searchTags(searchQuery.value).filter((t) => !props.modelValue.includes(t.id))
})

// Check if we can add more tags
const canAddMore = computed(() => {
  if (!props.maxTags) return true
  return props.modelValue.length < props.maxTags
})

// Toggle tag selection
const toggleTag = (tag: Tag) => {
  if (props.modelValue.includes(tag.id)) {
    emit(
      'update:modelValue',
      props.modelValue.filter((id) => id !== tag.id),
    )
  } else if (canAddMore.value) {
    emit('update:modelValue', [...props.modelValue, tag.id])
  }
  searchQuery.value = ''
}

// Remove tag
const removeTag = (tagId: string) => {
  emit(
    'update:modelValue',
    props.modelValue.filter((id) => id !== tagId),
  )
}

// Create new tag from search query
const handleCreateTag = () => {
  if (!props.allowCreate || !searchQuery.value.trim() || !canAddMore.value) return

  const newTag = createTag({ name: searchQuery.value.trim() })
  emit('update:modelValue', [...props.modelValue, newTag.id])
  searchQuery.value = ''
}

// Handle keyboard navigation
const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Enter' && searchQuery.value.trim()) {
    e.preventDefault()
    if (filteredTags.value.length > 0 && filteredTags.value[0]) {
      toggleTag(filteredTags.value[0])
    } else if (props.allowCreate) {
      handleCreateTag()
    }
  } else if (e.key === 'Backspace' && !searchQuery.value && props.modelValue.length > 0) {
    const lastTagId = props.modelValue[props.modelValue.length - 1]
    if (lastTagId) {
      removeTag(lastTagId)
    }
  } else if (e.key === 'Escape') {
    isOpen.value = false
    inputRef.value?.blur()
  }
}

// Get contrasting text color for tag background
const getTextColor = (bgColor?: string) => {
  if (!bgColor) return 'text-white'
  const darkColors = ['bg-blue-500', 'bg-purple-500', 'bg-indigo-500', 'bg-red-500']
  return darkColors.includes(bgColor) ? 'text-white' : 'text-gray-900'
}
</script>

<template>
  <UiPopover v-model:open="isOpen">
    <UiPopoverTrigger as-child>
      <div
        class="flex flex-wrap items-center gap-1.5 min-h-[38px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 cursor-text"
        @click="inputRef?.focus()">
        <!-- Selected tags -->
        <span
          v-for="tag in selectedTags"
          :key="tag.id"
          :class="[tag.color || 'bg-muted', getTextColor(tag.color)]"
          class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium">
          <Icon v-if="tag.icon" :name="tag.icon" class="h-3 w-3" />
          {{ tag.name }}
          <button
            type="button"
            class="ml-0.5 rounded-full hover:bg-black/10 p-0.5"
            @click.stop="removeTag(tag.id)">
            <Icon name="lucide:x" class="h-3 w-3" />
          </button>
        </span>

        <!-- Search input -->
        <input
          ref="inputRef"
          v-model="searchQuery"
          type="text"
          :placeholder="selectedTags.length === 0 ? (placeholder || 'Add tags...') : ''"
          :disabled="!canAddMore"
          class="flex-1 min-w-[80px] bg-transparent outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
          @focus="isOpen = true"
          @keydown="handleKeydown" />
      </div>
    </UiPopoverTrigger>

    <UiPopoverContent class="w-[300px] p-0" align="start">
      <div class="max-h-[200px] overflow-y-auto p-1">
        <!-- Existing tags -->
        <template v-if="filteredTags.length > 0">
          <button
            v-for="tag in filteredTags"
            :key="tag.id"
            type="button"
            class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
            @click="toggleTag(tag)">
            <span
              :class="[tag.color || 'bg-muted']"
              class="flex h-5 w-5 items-center justify-center rounded-full">
              <Icon v-if="tag.icon" :name="tag.icon" class="h-3 w-3 text-white" />
            </span>
            <span class="flex-1 text-left">{{ tag.name }}</span>
          </button>
        </template>

        <!-- Create new tag option -->
        <template v-else-if="searchQuery.trim() && allowCreate">
          <button
            type="button"
            class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
            @click="handleCreateTag">
            <Icon name="lucide:plus" class="h-4 w-4 text-muted-foreground" />
            <span>Create "{{ searchQuery }}"</span>
          </button>
        </template>

        <!-- Empty state -->
        <template v-else>
          <div class="px-2 py-4 text-center text-sm text-muted-foreground">
            <p v-if="searchQuery">No matching tags</p>
            <p v-else>No tags available</p>
          </div>
        </template>
      </div>
    </UiPopoverContent>
  </UiPopover>
</template>
