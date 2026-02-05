<script lang="ts" setup>
  const route = useRoute()
  const { isInEditMode } = useAdminUI()
  
  const pageId = computed(() => route.params.id as string)
  
  // Page metadata (would come from database/config in real implementation)
  const pageTitle = ref('Untitled')
  const pageDescription = ref('')
  const pageIcon = ref('lucide:file-text')
  
  // Edit title inline
  const titleInput = ref<HTMLInputElement | null>(null)
  const isEditingTitle = ref(false)
  
  const startEditingTitle = () => {
    if (isInEditMode.value) {
      isEditingTitle.value = true
      nextTick(() => titleInput.value?.focus())
    }
  }
  
  const finishEditingTitle = () => {
    isEditingTitle.value = false
    if (!pageTitle.value.trim()) {
      pageTitle.value = 'Untitled'
    }
  }
</script>

<template>
  <LayoutPage :title="pageTitle" :description="pageDescription" :icon="pageIcon">
    <div class="max-w-3xl mx-auto py-8 px-4">
      <!-- Inline editable title -->
      <div class="mb-8">
        <div v-if="isEditingTitle" class="flex items-center gap-2">
          <input
            ref="titleInput"
            v-model="pageTitle"
            class="text-4xl font-bold bg-transparent border-none outline-none w-full focus:ring-0"
            placeholder="Untitled"
            @blur="finishEditingTitle"
            @keydown.enter="finishEditingTitle"
            @keydown.escape="finishEditingTitle" />
        </div>
        <h1
          v-else
          class="text-4xl font-bold cursor-text"
          :class="{ 'hover:bg-muted/50 rounded px-2 -mx-2': isInEditMode }"
          @click="startEditingTitle">
          {{ pageTitle || 'Untitled' }}
        </h1>
        
        <!-- Inline description -->
        <p
          v-if="isInEditMode || pageDescription"
          class="text-muted-foreground mt-2"
          :class="{ 'cursor-text hover:bg-muted/50 rounded px-2 -mx-2': isInEditMode }">
          {{ pageDescription || (isInEditMode ? 'Add a description...' : '') }}
        </p>
      </div>
      
      <!-- Page content area -->
      <div class="min-h-[50vh]">
        <div v-if="isInEditMode" class="text-muted-foreground border-2 border-dashed border-muted rounded-lg p-8 text-center">
          <Icon name="lucide:type" class="h-8 w-8 mx-auto mb-3 opacity-50" />
          <p>Click to start typing...</p>
          <p class="text-sm mt-1">This is a blank page. Add blocks to build your content.</p>
        </div>
        <div v-else class="text-muted-foreground text-center py-16">
          <Icon name="lucide:file-text" class="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p>This page is empty</p>
        </div>
      </div>
      
      <!-- Page metadata footer (edit mode only) -->
      <div v-if="isInEditMode" class="mt-12 pt-6 border-t text-xs text-muted-foreground">
        <div class="flex items-center gap-4">
          <span>Page ID: {{ pageId }}</span>
          <span>•</span>
          <span>Created just now</span>
        </div>
      </div>
    </div>
  </LayoutPage>
</template>
