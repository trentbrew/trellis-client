<script setup lang="ts">
import type { PageDefinition, PageBlock, BlockTypeDefinition } from '~/composables/usePageBuilder'

const props = defineProps<{
  open: boolean
  page?: PageDefinition
}>()

const emit = defineEmits<{
  'update:open': [open: boolean]
  save: [page: PageDefinition]
}>()

const { blockTypesByCategory, createBlockFromType, createDefaultPage } = usePageBuilder()

// Local copy of page for editing
const localPage = ref<PageDefinition>(props.page ? { ...props.page, blocks: [...props.page.blocks] } : createDefaultPage())

// Sync when props change
watch(() => props.page, (newPage) => {
  if (newPage) {
    localPage.value = { ...newPage, blocks: [...newPage.blocks] }
  } else {
    localPage.value = createDefaultPage()
  }
}, { deep: true })

// UI state
const showBlockPicker = ref(false)
const activeCategory = ref<string>('content')
const editingBlockIndex = ref<number | null>(null)

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
  localPage.value.blocks.forEach((b, i) => { b.order = i })
  if (editingBlockIndex.value === index) {
    editingBlockIndex.value = null
  }
}

const moveBlockUp = (index: number) => {
  if (index === 0) return
  const blocks = localPage.value.blocks
  const current = blocks[index]
  const previous = blocks[index - 1]
  if (current && previous) {
    blocks[index - 1] = current
    blocks[index] = previous
    blocks.forEach((b, i) => { b.order = i })
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
    blocks.forEach((b, i) => { b.order = i })
  }
}

// Save handler
const handleSave = () => {
  localPage.value.updatedAt = Date.now()
  emit('save', localPage.value)
  emit('update:open', false)
}

const handleCancel = () => {
  emit('update:open', false)
}
</script>

<template>
  <UiDialog :open="open" @update:open="emit('update:open', $event)">
    <UiDialogContent class="max-w-5xl h-[85vh] flex flex-col p-0">
      <!-- Header -->
      <div class="flex items-center justify-between px-6 py-4 border-b shrink-0">
        <div class="flex items-center gap-3">
          <Icon name="lucide:layout" class="w-5 h-5 text-primary" />
          <div>
            <h2 class="text-lg font-semibold">Page Builder</h2>
            <p class="text-sm text-muted-foreground">Design your page with blocks</p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <UiButton variant="outline" @click="handleCancel">Cancel</UiButton>
          <UiButton @click="handleSave">
            <Icon name="lucide:save" class="w-4 h-4 mr-2" />
            Save Page
          </UiButton>
        </div>
      </div>

      <!-- Main Content -->
      <div class="flex-1 flex overflow-hidden">
        <!-- Left Panel: Page Settings & Block List -->
        <div class="w-80 border-r flex flex-col overflow-hidden">
          <!-- Page Settings -->
          <div class="p-4 border-b space-y-3">
            <div class="space-y-1.5">
              <label class="text-xs font-medium text-muted-foreground">Page Title</label>
              <UiInput v-model="localPage.title" placeholder="Page title" />
            </div>
            <div class="space-y-1.5">
              <label class="text-xs font-medium text-muted-foreground">Slug</label>
              <UiInput v-model="localPage.slug" placeholder="page-slug" />
            </div>
            <div class="flex items-center gap-4">
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

          <!-- Block List -->
          <div class="flex-1 overflow-y-auto p-4">
            <div class="flex items-center justify-between mb-3">
              <span class="text-sm font-medium">Blocks</span>
              <UiButton variant="outline" size="sm" @click="showBlockPicker = true">
                <Icon name="lucide:plus" class="w-3.5 h-3.5 mr-1" />
                Add
              </UiButton>
            </div>

            <div v-if="localPage.blocks.length === 0" class="text-center py-8">
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
          </div>
        </div>

        <!-- Right Panel: Preview -->
        <div class="flex-1 overflow-y-auto bg-muted/30 p-6">
          <div
            class="mx-auto bg-background rounded-lg border shadow-sm p-6"
            :class="{
              'max-w-none': localPage.settings.layout === 'full',
              'max-w-4xl': localPage.settings.layout === 'contained',
              'max-w-2xl': localPage.settings.layout === 'narrow',
            }">
            <!-- Page Title Preview -->
            <div v-if="localPage.settings.showTitle" class="mb-6">
              <h1 class="text-2xl font-bold">{{ localPage.title || 'Untitled Page' }}</h1>
            </div>

            <!-- Blocks Preview -->
            <div v-if="localPage.blocks.length === 0" class="text-center py-12 border-2 border-dashed rounded-lg">
              <Icon name="lucide:mouse-pointer-click" class="w-10 h-10 text-muted-foreground mx-auto mb-2" />
              <p class="text-muted-foreground">Add blocks to see preview</p>
            </div>

            <div v-else class="space-y-4">
              <BlockRenderer
                v-for="block in localPage.blocks"
                :key="block.id"
                :block="block"
                :edit-mode="false" />
            </div>
          </div>
        </div>
      </div>

      <!-- Block Picker Dialog -->
      <UiDialog :open="showBlockPicker" @update:open="showBlockPicker = $event">
        <UiDialogContent class="max-w-2xl">
          <UiDialogHeader>
            <UiDialogTitle>Add Block</UiDialogTitle>
            <UiDialogDescription>Choose a block type to add to your page</UiDialogDescription>
          </UiDialogHeader>

          <!-- Category Tabs -->
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

          <!-- Block Type Grid -->
          <div class="grid grid-cols-2 gap-2 max-h-80 overflow-y-auto py-2">
            <BlockTypeCard
              v-for="blockType in currentCategoryBlocks"
              :key="blockType.type"
              :block-type="blockType"
              @select="addBlock" />
          </div>
        </UiDialogContent>
      </UiDialog>
    </UiDialogContent>
  </UiDialog>
</template>
