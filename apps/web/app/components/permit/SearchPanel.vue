<script setup lang="ts">
  interface SearchResult {
    page: number
    text: string
    index: number
  }

  interface Props {
    totalPages: number
    isSearching?: boolean
  }

  withDefaults(defineProps<Props>(), {
    isSearching: false,
  })

  const emit = defineEmits<{
    search: [query: string]
    goToResult: [result: SearchResult]
    close: []
  }>()

  const searchQuery = ref('')
  const results = ref<SearchResult[]>([])
  const currentResultIndex = ref(0)

  const inputRef = ref<HTMLInputElement>()

  const _currentResult = computed(() => results.value[currentResultIndex.value] || null)

  function handleSearch() {
    if (searchQuery.value.trim()) {
      emit('search', searchQuery.value.trim())
      // Mock results for demo - in real implementation, this would come from PDF.js
      generateMockResults()
    }
  }

  function generateMockResults() {
    const query = searchQuery.value.toLowerCase()
    const mockResults: SearchResult[] = []

    // Simulate finding results across pages
    const sampleTexts = [
      { page: 3, text: 'The owner or operator shall continue to operate under all applicable requirements' },
      { page: 3, text: 'emission limits and standards, testing, monitoring, record keeping' },
      { page: 4, text: 'Particulate matter emissions shall be limited to the rate specified' },
      { page: 4, text: 'opacity greater than 20%, each' },
    ]

    sampleTexts.forEach((sample, idx) => {
      if (sample.text.toLowerCase().includes(query)) {
        mockResults.push({
          page: sample.page,
          text: sample.text,
          index: idx,
        })
      }
    })

    results.value = mockResults
    currentResultIndex.value = 0

    if (mockResults.length > 0 && mockResults[0]) {
      emit('goToResult', mockResults[0])
    }
  }

  function nextResult() {
    if (results.value.length === 0) return
    currentResultIndex.value = (currentResultIndex.value + 1) % results.value.length
    const result = results.value[currentResultIndex.value]
    if (result) emit('goToResult', result)
  }

  function prevResult() {
    if (results.value.length === 0) return
    currentResultIndex.value = (currentResultIndex.value - 1 + results.value.length) % results.value.length
    const result = results.value[currentResultIndex.value]
    if (result) emit('goToResult', result)
  }

  function clearSearch() {
    searchQuery.value = ''
    results.value = []
    currentResultIndex.value = 0
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      if (e.shiftKey) {
        prevResult()
      } else if (results.value.length > 0) {
        nextResult()
      } else {
        handleSearch()
      }
    } else if (e.key === 'Escape') {
      emit('close')
    }
  }

  onMounted(() => {
    inputRef.value?.focus()
  })

  defineExpose({
    focus: () => inputRef.value?.focus(),
    clear: clearSearch,
  })
</script>

<template>
  <div class="flex items-center gap-2 rounded-lg border border-border bg-card p-2 shadow-lg">
    <div class="relative flex-1">
      <Icon name="lucide:search" class="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <input
        ref="inputRef"
        v-model="searchQuery"
        type="text"
        placeholder="Search in document..."
        class="h-8 w-full rounded-md border-0 bg-transparent pl-8 pr-2 text-sm focus:outline-none focus:ring-0"
        @keydown="handleKeydown"
        @input="results.length > 0 && handleSearch()" />
    </div>

    <div v-if="results.length > 0" class="flex items-center gap-1 text-xs text-muted-foreground">
      <span>{{ currentResultIndex + 1 }}/{{ results.length }}</span>
    </div>

    <div class="flex items-center gap-0.5">
      <UiButton
        variant="ghost"
        size="icon"
        class="size-7"
        :disabled="results.length === 0"
        title="Previous (Shift+Enter)"
        @click="prevResult">
        <Icon name="lucide:chevron-up" class="size-3.5" />
      </UiButton>
      <UiButton
        variant="ghost"
        size="icon"
        class="size-7"
        :disabled="results.length === 0"
        title="Next (Enter)"
        @click="nextResult">
        <Icon name="lucide:chevron-down" class="size-3.5" />
      </UiButton>
    </div>

    <UiButton variant="ghost" size="icon" class="size-7" title="Close (Esc)" @click="emit('close')">
      <Icon name="lucide:x" class="size-3.5" />
    </UiButton>
  </div>
</template>
