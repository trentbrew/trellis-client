<script setup lang="ts">
  import type { PageDefinition, PageBlock, BlockTypeDefinition } from '~/composables/usePageBuilder'

  const { blockTypesByCategory, createBlockFromType, createDefaultPage } = usePageBuilder()

  // Local page for editing
  const localPage = ref<PageDefinition>(createDefaultPage())

  // UI state
  const showBlockPicker = ref(false)
  const activeCategory = ref<string>('content')

  const categories = [
    { id: 'content', label: 'Content', icon: 'lucide:type' },
    { id: 'data', label: 'Data', icon: 'lucide:database' },
    { id: 'embed', label: 'Embed', icon: 'lucide:frame' },
    { id: 'layout', label: 'Layout', icon: 'lucide:layout' },
    { id: 'widget', label: 'Widgets', icon: 'lucide:puzzle' },
  ]

  const currentCategoryBlocks = computed(() => {
    return blockTypesByCategory.value[activeCategory.value] || []
  })

  // Block operations
  const addBlock = (typeDef: BlockTypeDefinition) => {
    const newBlock = createBlockFromType(typeDef)
    newBlock.order = localPage.value.blocks.length
    localPage.value.blocks.push(newBlock)
    showBlockPicker.value = false
  }

  const updateBlock = (index: number, block: PageBlock) => {
    localPage.value.blocks[index] = block
  }

  const deleteBlock = (index: number) => {
    localPage.value.blocks.splice(index, 1)
    localPage.value.blocks.forEach((b, i) => {
      b.order = i
    })
  }

  const moveBlockUp = (index: number) => {
    if (index === 0) return
    const blocks = localPage.value.blocks
    const current = blocks[index]
    const previous = blocks[index - 1]
    if (current && previous) {
      blocks[index - 1] = current
      blocks[index] = previous
      blocks.forEach((b, i) => {
        b.order = i
      })
    }
  }

  const moveBlockDown = (index: number) => {
    const blocks = localPage.value.blocks
    if (index === blocks.length - 1) return
    const current = blocks[index]
    const next = blocks[index + 1]
    if (current && next) {
      blocks[index] = next
      blocks[index + 1] = current
      blocks.forEach((b, i) => {
        b.order = i
      })
    }
  }

  const nuxtApp = useNuxtApp()

  const handleSave = () => {
    localPage.value.updatedAt = Date.now()
    ;(nuxtApp as any).$toast?.success(`Page "${localPage.value.title}" saved!`)
  }
</script>

<template>
  <Page variant="settings" subtitle="Settings" title="Pages" description="Create and manage custom pages in your workspace.">
    <div class="space-y-6">
      <!-- Page Settings -->
      <UiCard>
        <UiCardHeader>
          <UiCardTitle>Page Builder</UiCardTitle>
          <UiCardDescription>Design your page with blocks.</UiCardDescription>
        </UiCardHeader>
        <UiCardContent>
          <div class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <div class="space-y-1.5">
                <UiLabel>Page Title</UiLabel>
                <UiInput v-model="localPage.title" placeholder="Page title" />
              </div>
              <div class="space-y-1.5">
                <UiLabel>Slug</UiLabel>
                <UiInput v-model="localPage.slug" placeholder="page-slug" />
              </div>
            </div>
            <div class="flex items-center gap-6">
              <label class="flex items-center gap-2 text-sm">
                <UiSwitch v-model:checked="localPage.settings.showTitle" />
                Show title
              </label>
              <label class="flex items-center gap-2 text-sm">
                <UiSwitch v-model:checked="localPage.settings.showBreadcrumb" />
                Breadcrumb
              </label>
            </div>
          </div>
        </UiCardContent>
      </UiCard>

      <!-- Blocks -->
      <UiCard>
        <UiCardHeader>
          <div class="flex items-center justify-between">
            <div>
              <UiCardTitle>Blocks</UiCardTitle>
              <UiCardDescription>Add and arrange content blocks.</UiCardDescription>
            </div>
            <UiButton variant="outline" size="sm" @click="showBlockPicker = true">
              <Icon name="lucide:plus" class="w-3.5 h-3.5 mr-1" />
              Add Block
            </UiButton>
          </div>
        </UiCardHeader>
        <UiCardContent>
          <div v-if="localPage.blocks.length === 0" class="text-center py-12 border-2 border-dashed rounded-lg">
            <Icon name="lucide:layout-template" class="w-10 h-10 text-muted-foreground mx-auto mb-2" />
            <p class="text-sm text-muted-foreground">No blocks yet</p>
            <UiButton variant="outline" size="sm" class="mt-3" @click="showBlockPicker = true">
              Add your first block
            </UiButton>
          </div>

          <div v-else class="space-y-2">
            <BlockEditor
              v-for="(block, index) in localPage.blocks"
              :key="block.id"
              :block="block"
              :index="index"
              :is-first="index === 0"
              :is-last="index === localPage.blocks.length - 1"
              @update="updateBlock(index, $event)"
              @delete="deleteBlock(index)"
              @move-up="moveBlockUp(index)"
              @move-down="moveBlockDown(index)" />
          </div>
        </UiCardContent>
      </UiCard>

      <!-- Preview -->
      <UiCard v-if="localPage.blocks.length > 0">
        <UiCardHeader>
          <UiCardTitle>Preview</UiCardTitle>
        </UiCardHeader>
        <UiCardContent>
          <div class="bg-muted/30 rounded-lg p-6">
            <div v-if="localPage.settings.showTitle" class="mb-6">
              <h1 class="text-2xl font-bold">{{ localPage.title || 'Untitled Page' }}</h1>
            </div>
            <div class="space-y-4">
              <BlockRenderer
                v-for="block in localPage.blocks"
                :key="block.id"
                :block="block"
                :edit-mode="false" />
            </div>
          </div>
        </UiCardContent>
      </UiCard>

      <!-- Save -->
      <div class="flex justify-end">
        <UiButton @click="handleSave">
          <Icon name="lucide:save" class="w-4 h-4 mr-2" />
          Save Page
        </UiButton>
      </div>
    </div>

    <!-- Block Picker Dialog -->
    <UiDialog v-model:open="showBlockPicker">
      <UiDialogContent class="max-w-2xl">
        <UiDialogHeader>
          <UiDialogTitle>Add Block</UiDialogTitle>
          <UiDialogDescription>Choose a block type to add to your page</UiDialogDescription>
        </UiDialogHeader>

        <div class="flex gap-1 border-b pb-2">
          <button
            v-for="cat in categories"
            :key="cat.id"
            class="px-3 py-1.5 text-sm rounded-md transition-colors"
            :class="activeCategory === cat.id ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'"
            @click="activeCategory = cat.id">
            <Icon :name="cat.icon" class="w-4 h-4 mr-1.5 inline-block" />
            {{ cat.label }}
          </button>
        </div>

        <div class="grid grid-cols-2 gap-2 max-h-80 overflow-y-auto py-2">
          <BlockTypeCard
            v-for="blockType in currentCategoryBlocks"
            :key="blockType.type"
            :block-type="blockType"
            @select="addBlock" />
        </div>
      </UiDialogContent>
    </UiDialog>
  </Page>
</template>
