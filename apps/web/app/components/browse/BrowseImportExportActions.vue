<script setup lang="ts">
  import type { Entity } from '~/types/entity'
  import { exportEntities, type ExportFormat } from '~/lib/entity-export'
  import BrowseEntityImportDialog from '~/components/browse/BrowseEntityImportDialog.vue'

  const props = defineProps<{
    items: Entity[]
    selectedItems?: Entity[]
    filenameSlug: string
  }>()

  const importOpen = ref(false)

  const exportSource = computed(() =>
    props.selectedItems?.length ? props.selectedItems : props.items,
  )

  const canExport = computed(() => exportSource.value.length > 0)

  function handleExport(format: ExportFormat) {
    exportEntities(exportSource.value, format, { filenameSlug: props.filenameSlug })
  }
</script>

<template>
  <div class="flex items-center gap-2 shrink-0">
    <UiButton
      variant="outline"
      size="sm"
      class="h-8 gap-1.5 bg-card/0 backdrop-blur-lg text-xs border-primary text-primary"
      @click="importOpen = true">
      <Icon name="lucide:upload" class="h-3.5 w-3.5" />
      <span class="hidden sm:inline">Import</span>
    </UiButton>

    <UiDropdownMenu>
      <UiDropdownMenuTrigger as-child>
        <UiButton
          variant="outline"
          size="sm"
          class="h-8 gap-1.5 bg-card/0 backdrop-blur-lg text-xs border-primary text-primary"
          :disabled="!canExport">
          <Icon name="lucide:download" class="h-3.5 w-3.5" />
          <span class="hidden sm:inline">Export</span>
        </UiButton>
      </UiDropdownMenuTrigger>
      <UiDropdownMenuContent align="end" :side-offset="4" class="w-44">
        <UiDropdownMenuItem @click="handleExport('csv')">
          <Icon name="lucide:file-spreadsheet" class="mr-2 h-4 w-4" />
          CSV (.csv)
        </UiDropdownMenuItem>
        <UiDropdownMenuItem @click="handleExport('json')">
          <Icon name="lucide:braces" class="mr-2 h-4 w-4" />
          JSON (.json)
        </UiDropdownMenuItem>
        <UiDropdownMenuItem @click="handleExport('jsonld')">
          <Icon name="lucide:link" class="mr-2 h-4 w-4" />
          JSON-LD (.jsonld)
        </UiDropdownMenuItem>
        <UiDropdownMenuItem @click="handleExport('xlsx')">
          <Icon name="lucide:table" class="mr-2 h-4 w-4" />
          Excel (.xlsx)
        </UiDropdownMenuItem>
      </UiDropdownMenuContent>
    </UiDropdownMenu>

    <BrowseEntityImportDialog v-model:open="importOpen" />
  </div>
</template>
