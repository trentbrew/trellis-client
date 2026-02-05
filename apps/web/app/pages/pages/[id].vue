<script lang="ts" setup>
  const route = useRoute()
  const { isInEditMode } = useAdminUI()

  const pageId = computed(() => route.params.id as string)

  // Page metadata (would come from database/config in real implementation)
  const pageTitle = ref('Untitled')
  const pageDescription = ref('')

  // Edit title inline
  const titleInput = ref<HTMLInputElement | null>(null)
  const isEditingTitle = ref(false)
  const isEditingDescription = ref(false)
  const descriptionInput = ref<HTMLInputElement | null>(null)

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

  const startEditingDescription = () => {
    if (isInEditMode.value) {
      isEditingDescription.value = true
      nextTick(() => descriptionInput.value?.focus())
    }
  }

  const finishEditingDescription = () => {
    isEditingDescription.value = false
  }
</script>

<template>
  <!-- Minimal page layout - variant will be auto-set by template/preset later -->
  <LayoutPage variant="prose" hide-header>
    <div class="max-w-3xl mx-auto py-12 px-4">
      <!-- Inline editable title -->
      <div class="mb-8">
        <div v-if="isEditingTitle" class="flex items-center gap-2">
          <input
            ref="titleInput"
            v-model="pageTitle"
            class="text-4xl font-bold bg-transparent border-none outline-none w-full focus:ring-0 placeholder:text-muted-foreground/50"
            placeholder="Untitled"
            @blur="finishEditingTitle"
            @keydown.enter="finishEditingTitle"
            @keydown.escape="finishEditingTitle" />
        </div>
        <h1
          v-else
          class="text-4xl font-bold cursor-text transition-colors"
          :class="{ 'hover:bg-muted/50 rounded-lg px-3 py-1 -mx-3 -my-1': isInEditMode }"
          @click="startEditingTitle">
          {{ pageTitle || 'Untitled' }}
        </h1>

        <!-- Inline description -->
        <div v-if="isEditingDescription" class="mt-3">
          <input
            ref="descriptionInput"
            v-model="pageDescription"
            class="text-muted-foreground bg-transparent border-none outline-none w-full focus:ring-0 placeholder:text-muted-foreground/50"
            placeholder="Add a description..."
            @blur="finishEditingDescription"
            @keydown.enter="finishEditingDescription"
            @keydown.escape="finishEditingDescription" />
        </div>
        <p
          v-else-if="isInEditMode || pageDescription"
          class="text-muted-foreground mt-3 cursor-text transition-colors"
          :class="{ 'hover:bg-muted/50 rounded-lg px-3 py-1 -mx-3 -my-1': isInEditMode }"
          @click="startEditingDescription">
          {{ pageDescription || 'Add a description...' }}
        </p>
      </div>

      <!-- Page content area -->
      <div class="min-h-[50vh]">
        <div
          v-if="isInEditMode"
          class="text-muted-foreground border-2 border-dashed border-muted rounded-xl p-12 text-center hover:border-muted-foreground/30 transition-colors cursor-text">
          <Icon name="lucide:type" class="h-10 w-10 mx-auto mb-4 opacity-40" />
          <p class="font-medium">Click to start typing...</p>
          <p class="text-sm mt-2 opacity-70">This is a blank page. Add blocks to build your content.</p>
        </div>
        <div v-else class="text-muted-foreground text-center py-20">
          <Icon name="lucide:file-text" class="h-16 w-16 mx-auto mb-6 opacity-20" />
          <p class="text-lg">This page is empty</p>
        </div>
      </div>

      <!-- Page metadata footer (edit mode only) -->
      <div v-if="isInEditMode" class="mt-16 pt-6 border-t border-border/50 text-xs text-muted-foreground/70">
        <div class="flex items-center gap-3">
          <span class="font-mono">{{ pageId }}</span>
          <span>•</span>
          <span>Created just now</span>
        </div>
      </div>
    </div>
  </LayoutPage>
</template>
