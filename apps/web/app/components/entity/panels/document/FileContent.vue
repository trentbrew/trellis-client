<script lang="ts" setup>
import * as XLSX from 'xlsx'
import CodeEditor from '~/components/editors/CodeEditor/CodeEditor.vue'
import { markdownToHtml } from '~/utils/markdown'
import { useFileUpload } from '~/composables/useFileUpload'
import { useFileEnrichment } from '~/composables/useFileEnrichment'

import { classifyFile, getFileExtension, getFileCategoryMeta, type FileCategory } from '~/utils/fileClassification'

const props = defineProps<{
  modelValue: any
  mode: 'view' | 'create' | 'edit'
}>()

const emit = defineEmits<{
  'update:modelValue': [value: any]
}>()

const item = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const isViewMode = computed(() => props.mode === 'view')
const isDragging = ref(false)

const formatFileSize = (bytes?: number): string => {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

const fileMeta = computed(() => {
  const cat = (item.value.fileCategory as FileCategory) || 'other'
  return getFileCategoryMeta(cat)
})

const fileInputRef = ref<HTMLInputElement | null>(null)
const hasFile = computed(() => !!item.value?.url || !!item.value?.storagePath)
const isUploading = ref(false)
const isEnriching = ref(false)

const { enrich: enrichFile } = useFileEnrichment()
const isImage = computed(() => item.value?.mimeType?.startsWith('image/'))
const isPdf = computed(() => item.value?.mimeType === 'application/pdf')
const isVideo = computed(() => item.value?.mimeType?.startsWith('video/'))
const isAudio = computed(() => item.value?.mimeType?.startsWith('audio/'))
const isEmbeddable = computed(() => isImage.value || isPdf.value || isVideo.value || isAudio.value)

const isCode = computed(() => item.value?.fileCategory === 'code' || item.value?.fileCategory === 'data' && item.value?.fileExtension !== 'csv')
const isMarkdown = computed(() => item.value?.fileExtension === 'md' || item.value?.fileExtension === 'mdx')
const isTableData = computed(() => item.value?.fileCategory === 'spreadsheet' || item.value?.fileExtension === 'csv')

const isDocumentPreview = computed(() => !isEmbeddable.value && (isCode.value || isMarkdown.value || isTableData.value))

const fileRawContent = ref<string | null>(null)
const fileTableData = ref<{ headers: string[], rows: any[][] } | null>(null)
const loadingContent = ref(false)
const contentError = ref<string | null>(null)

watch(() => item.value?.url, async (url) => {
  if (!url) {
    fileRawContent.value = null
    fileTableData.value = null
    contentError.value = null
    return
  }

  if (!isDocumentPreview.value) return

  loadingContent.value = true
  contentError.value = null

  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error('Failed to load file content')

    if (isTableData.value) {
      const arrayBuffer = await res.arrayBuffer()
      const wb = XLSX.read(arrayBuffer, { type: 'array' })
      const wsname = wb.SheetNames[0]
      const ws = wb.Sheets[wsname as string]
      const json = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1 })

      const headers = json[0] || []
      const rows = json.slice(1)
      fileTableData.value = { headers: headers.map(String), rows }
    } else {
      const text = await res.text()
      fileRawContent.value = text
    }
  } catch (err: any) {
    contentError.value = err.message || 'Failed to load file content'
  } finally {
    loadingContent.value = false
  }
}, { immediate: true })

const markdownHtml = computed(() => {
  if (!isMarkdown.value || !fileRawContent.value) return ''
  return markdownToHtml(fileRawContent.value)
})

const onDragOver = (e: DragEvent) => {
  e.preventDefault()
  isDragging.value = true
}

const onDragLeave = () => {
  isDragging.value = false
}

const onDrop = (e: DragEvent) => {
  e.preventDefault()
  isDragging.value = false
  const files = e.dataTransfer?.files
  if (files?.length) handleFileSelect(files[0]!)
}

const onFileInputChange = (e: Event) => {
  const input = e.target as HTMLInputElement
  if (input.files?.length) handleFileSelect(input.files[0]!)
  input.value = ''
}

const handleFileSelect = async (file: File) => {
  const mime = file.type || 'application/octet-stream'
  const ext = getFileExtension(file.name)
  const category = classifyFile(mime, file.name)

  const blobUrl = URL.createObjectURL(file)
  item.value.mimeType = mime
  item.value.sizeBytes = file.size
  item.value.url = blobUrl
  item.value.fileExtension = ext
  item.value.fileCategory = category
  if (!item.value.title) {
    item.value.title = file.name.replace(/\.[^/.]+$/, '')
  }

  isUploading.value = true
  try {
    const entityId = item.value.id as string | undefined
    const { uploadFile } = useFileUpload(entityId)
    const result = await uploadFile(file)
    URL.revokeObjectURL(blobUrl)
    item.value.url = result.url
    item.value.storagePath = result.path

    if (entityId) {
      isEnriching.value = true
      enrichFile(entityId, item.value).finally(() => {
        isEnriching.value = false
      })
    }
  } catch (err: any) {
    console.error('[FileContent] Upload failed:', err?.message || err)
  } finally {
    isUploading.value = false
  }
}

const triggerFileInput = () => {
  fileInputRef.value?.click()
}

const removeFile = () => {
  if (item.value.url?.startsWith('blob:')) URL.revokeObjectURL(item.value.url)
  item.value.url = undefined
  item.value.storagePath = undefined
  item.value.mimeType = ''
  item.value.sizeBytes = undefined
  item.value.fileExtension = undefined
  item.value.fileCategory = undefined
}

const openExternal = () => {
  if (item.value?.url) window.open(item.value.url, '_blank', 'noopener,noreferrer')
}
</script>

<template>
  <div class="flex-1 flex flex-col min-h-0 h-full">
    <!-- File drop zone (create/edit without file) -->
    <div
      v-if="!isViewMode && !hasFile"
      class="relative flex-1 min-h-0 cursor-pointer"
      :class="isDragging ? 'bg-primary/5' : 'hover:bg-muted/20'"
      @dragover="onDragOver"
      @dragleave="onDragLeave"
      @drop="onDrop"
      @click="triggerFileInput">
      <div class="flex h-full flex-col items-center justify-center px-8 text-center">
        <div class="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Icon v-if="isUploading" name="lucide:loader-2" class="h-6 w-6 animate-spin text-primary" />
          <Icon v-else name="lucide:upload-cloud" class="h-6 w-6 text-primary" />
        </div>
        <p class="text-sm font-medium">{{ isUploading ? 'Uploading…' : 'Drop a file here' }}</p>
        <p class="mt-1 text-xs text-muted-foreground">{{ isUploading ? 'Please wait' : 'or click to browse' }}</p>
        <p v-if="!isUploading" class="mt-2 text-[10px] text-muted-foreground/60">Any file type supported</p>
      </div>
      <input ref="fileInputRef" type="file" class="hidden" @change="onFileInputChange" />
    </div>

    <!-- Preview-first layout when file is attached -->
    <div v-else-if="hasFile" class="flex min-h-0 flex-1 flex-col">
      <div class="flex shrink-0 items-center gap-2 border-b border-border bg-muted/30 px-4 py-2">
        <div :class="['flex h-6 w-6 shrink-0 items-center justify-center rounded', `bg-${fileMeta.color}-500/10`]">
          <Icon :name="fileMeta.icon" :class="['h-3.5 w-3.5', `text-${fileMeta.color}-500`]" />
        </div>
        <span class="min-w-0 flex-1 truncate font-mono text-xs text-muted-foreground">
          {{ item.fileExtension ? item.fileExtension.toUpperCase() : fileMeta.label }}
          <template v-if="item.sizeBytes"> · {{ formatFileSize(item.sizeBytes) }}</template>
          <template v-if="item.mimeType"> · {{ item.mimeType }}</template>
        </span>
        <span v-if="isEnriching" class="flex shrink-0 items-center gap-1 text-[10px] text-amber-500">
          <Icon name="lucide:sparkles" class="h-2.5 w-2.5 animate-pulse" />
          Enriching…
        </span>
        <div v-if="isUploading" class="flex shrink-0 items-center gap-1.5 text-[10px] text-muted-foreground">
          <Icon name="lucide:loader-2" class="h-3 w-3 animate-spin" />
          <span>Saving…</span>
        </div>
        <button
          v-if="item.url"
          type="button"
          class="flex shrink-0 items-center gap-1 text-xs text-primary hover:underline"
          @click="openExternal">
          <Icon name="lucide:external-link" class="h-3 w-3" />
          Open
        </button>
        <template v-if="!isViewMode">
          <UiButton variant="ghost" size="icon" class="h-7 w-7 shrink-0" :disabled="isUploading" @click="triggerFileInput">
            <Icon name="lucide:replace" class="h-3.5 w-3.5" />
          </UiButton>
          <UiButton
            variant="ghost"
            size="icon"
            class="h-7 w-7 shrink-0 text-destructive hover:text-destructive"
            :disabled="isUploading"
            @click="removeFile">
            <Icon name="lucide:trash-2" class="h-3.5 w-3.5" />
          </UiButton>
        </template>
        <a v-else-if="item.url" :href="item.url" target="_blank" rel="noopener noreferrer" class="shrink-0">
          <UiButton variant="ghost" size="icon" class="h-7 w-7">
            <Icon name="lucide:download" class="h-3.5 w-3.5" />
          </UiButton>
        </a>
      </div>

      <!-- Full-bleed embeddable preview -->
      <div v-if="isEmbeddable && item.url" class="relative min-h-0 flex-1 bg-muted/10">
        <img v-if="isImage" :src="item.url" :alt="item.title" class="absolute inset-0 h-full w-full object-contain" />
        <iframe
          v-else-if="isPdf"
          :src="item.url"
          class="absolute inset-0 h-full w-full border-0"
          :title="item.title || 'File preview'" />
        <video v-else-if="isVideo" :src="item.url" controls class="absolute inset-0 h-full w-full" />
        <div v-else-if="isAudio" class="absolute inset-0 flex items-center justify-center p-8">
          <audio :src="item.url" controls class="w-full max-w-lg" />
        </div>
      </div>

      <!-- Code / markdown / spreadsheet preview -->
      <template v-else-if="isDocumentPreview && item.url">
        <div v-if="loadingContent" class="flex min-h-0 flex-1 items-center justify-center bg-muted/10">
          <Icon name="lucide:loader-2" class="h-6 w-6 animate-spin text-muted-foreground opacity-50" />
        </div>
        <div
          v-else-if="contentError"
          class="flex min-h-0 flex-1 flex-col items-center justify-center bg-red-500/5 p-6 text-center text-red-500">
          <Icon name="lucide:alert-circle" class="mb-2 h-8 w-8 opacity-80" />
          <p class="text-sm font-medium">{{ contentError }}</p>
        </div>
        <div v-else-if="isMarkdown && markdownHtml" class="min-h-0 flex-1 overflow-y-auto bg-background p-4 md:p-6 lg:p-8">
          <div class="prose prose-sm dark:prose-invert max-w-none break-words" v-html="markdownHtml" />
        </div>
        <div v-else-if="isCode && fileRawContent" class="min-h-0 flex-1 overflow-hidden bg-[#0b0b0f]">
          <CodeEditor
            :model-value="fileRawContent"
            :language="item.fileExtension || 'text'"
            :readonly="true"
            :minimap="false"
            word-wrap="off"
            class="h-full w-full" />
        </div>
        <div v-else-if="isTableData && fileTableData" class="flex min-h-0 flex-1 flex-col overflow-hidden bg-card">
          <div class="min-h-0 flex-1 overflow-auto">
            <UiTable class="w-full">
              <UiTableHeader class="sticky top-0 z-10 bg-muted">
                <UiTableRow class="border-b border-border hover:bg-transparent">
                  <UiTableHead
                    v-for="(col, i) in fileTableData.headers"
                    :key="i"
                    class="h-9 whitespace-nowrap px-3 text-xs font-medium">
                    {{ col || `Column ${i + 1}` }}
                  </UiTableHead>
                </UiTableRow>
              </UiTableHeader>
              <UiTableBody>
                <UiTableRow
                  v-for="(row, r) in fileTableData.rows.slice(0, 200)"
                  :key="r"
                  class="border-b border-border/50 transition-colors hover:bg-muted/40">
                  <UiTableCell
                    v-for="(_, c) in fileTableData.headers"
                    :key="c"
                    class="max-w-[300px] truncate px-3 py-1.5 text-xs text-muted-foreground">
                    {{ row[c] ?? '' }}
                  </UiTableCell>
                </UiTableRow>
              </UiTableBody>
            </UiTable>
          </div>
          <div class="flex shrink-0 justify-between border-t border-border bg-muted/40 px-3 py-1.5 text-[10px] text-muted-foreground">
            <span>Showing first {{ Math.min(200, fileTableData.rows.length) }} rows</span>
            <span>{{ fileTableData.rows.length }} rows · {{ fileTableData.headers.length }} cols</span>
          </div>
        </div>
      </template>

      <!-- Generic file — no inline preview -->
      <div v-else class="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 bg-muted/10 p-8 text-center">
        <div :class="['flex h-16 w-16 items-center justify-center rounded-2xl', `bg-${fileMeta.color}-500/10`]">
          <Icon :name="fileMeta.icon" :class="['h-8 w-8', `text-${fileMeta.color}-500`]" />
        </div>
        <div class="max-w-md space-y-1.5">
          <p class="text-sm font-medium">{{ item.title || 'Untitled file' }}</p>
          <p v-if="item.description" class="text-xs leading-relaxed text-muted-foreground">{{ item.description }}</p>
        </div>
        <button
          v-if="item.url"
          type="button"
          class="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          @click="openExternal">
          <Icon name="lucide:external-link" class="h-3 w-3" />
          Open file
        </button>
      </div>

      <input ref="fileInputRef" type="file" class="hidden" @change="onFileInputChange" />
    </div>

    <!-- Empty state (view mode, no file) -->
    <div v-else class="flex flex-1 flex-col items-center justify-center py-12 text-center">
      <Icon name="lucide:file-x" class="mb-2 h-8 w-8 text-muted-foreground/40" />
      <p class="text-xs text-muted-foreground">No file attached</p>
    </div>
  </div>
</template>
