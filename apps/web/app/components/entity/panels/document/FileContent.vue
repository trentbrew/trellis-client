<script lang="ts" setup>
const props = defineProps<{
  modelValue: any
  mode: 'view' | 'create' | 'edit'
}>()

const emit = defineEmits<{
  'update:modelValue': [value: any]
}>()

import * as XLSX from 'xlsx'
import CodeEditor from '~/components/editors/CodeEditor/CodeEditor.vue'
import { markdownToHtml } from '~/utils/markdown'
import { useFileUpload } from '~/composables/useFileUpload'
import { useFileEnrichment } from '~/composables/useFileEnrichment'

const item = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const isViewMode = computed(() => props.mode === 'view')
const isDragging = ref(false)

// ── File helpers ───────────────────────────────────────────────────────
const formatFileSize = (bytes?: number): string => {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

import { classifyFile, getFileExtension, getFileCategoryMeta, type FileCategory } from '~/utils/fileClassification'

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

// ── File document content fetching ─────────────────────────────────────
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

// ── Drag & Drop ────────────────────────────────────────────────────────
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

  // Optimistic: show a blob preview immediately so the dialog doesn't feel slow
  const blobUrl = URL.createObjectURL(file)
  item.value.mimeType = mime
  item.value.sizeBytes = file.size
  item.value.url = blobUrl
  item.value.fileExtension = ext
  item.value.fileCategory = category
  if (!item.value.title) {
    item.value.title = file.name.replace(/\.[^/.]+$/, '')
  }

  // Then persist to disk (local) or cloud and replace blob with stable URL
  isUploading.value = true
  try {
    const entityId = item.value.id as string | undefined
    const { uploadFile } = useFileUpload(entityId)
    const result = await uploadFile(file)
    URL.revokeObjectURL(blobUrl)
    item.value.url = result.url
    item.value.storagePath = result.path

    // Auto-enrich: trigger Gemini after upload, fire-and-forget
    if (entityId) {
      isEnriching.value = true
      enrichFile(entityId, item.value).finally(() => {
        isEnriching.value = false
      })
    }
  } catch (err: any) {
    console.error('[FileContent] Upload failed:', err?.message || err)
    // Keep the blob URL so the user can still preview;
    // it will be lost on refresh — toast would be appropriate here
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
</script>

<template>
  <div class="flex-1 flex flex-col min-h-0 p-4 space-y-3 h-full">
    <!-- File drop zone (create/edit without file) -->
    <div v-if="!isViewMode && !hasFile"
      class="relative rounded-lg border-2 border-dashed transition-colors cursor-pointer h-full flex justify-center items-center"
      :class="isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/30'"
      @dragover="onDragOver" @dragleave="onDragLeave" @drop="onDrop" @click="triggerFileInput">
      <div class="flex flex-col items-center justify-center py-12 px-4 text-center">
        <div class="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
          <Icon v-if="isUploading" name="lucide:loader-2" class="h-6 w-6 text-primary animate-spin" />
          <Icon v-else name="lucide:upload-cloud" class="h-6 w-6 text-primary" />
        </div>
        <p class="text-sm font-medium">{{ isUploading ? 'Uploading…' : 'Drop a file here' }}</p>
        <p class="text-xs text-muted-foreground mt-1">{{ isUploading ? 'Please wait' : 'or click to browse' }}</p>
        <p v-if="!isUploading" class="text-[10px] text-muted-foreground/60 mt-2">Any file type supported</p>
      </div>
      <input ref="fileInputRef" type="file" class="hidden" @change="onFileInputChange" />
    </div>

    <!-- File preview (when file is attached) -->
    <div v-else-if="hasFile" class="flex-1 flex flex-col min-h-0 space-y-3">
      <!-- Full-bleed preview area -->
      <div v-if="isEmbeddable && item.url"
        class="flex-1 min-h-0 rounded-lg overflow-hidden border border-border bg-muted/20 relative">
        <img v-if="isImage" :src="item.url" :alt="item.title" class="w-full h-full object-contain" />
        <iframe v-else-if="isPdf" :src="item.url" class="w-full h-full border-0" />
        <video v-else-if="isVideo" :src="item.url" controls class="w-full h-full" />
        <div v-else-if="isAudio" class="absolute inset-0 flex items-center justify-center p-8">
          <audio :src="item.url" controls class="w-full" />
        </div>
      </div>

      <!-- Extended document preview (Code, Table, Markdown) -->
      <template v-else-if="isDocumentPreview && item.url">
        <div v-if="loadingContent" class="flex-1 min-h-0 flex items-center justify-center rounded-lg border border-border bg-muted/10">
          <Icon name="lucide:loader-2" class="h-6 w-6 animate-spin text-muted-foreground opacity-50" />
        </div>
        <div v-else-if="contentError" class="flex-1 min-h-0 flex flex-col items-center justify-center p-6 text-center rounded-lg border border-red-500/20 bg-red-500/5 text-red-500">
          <Icon name="lucide:alert-circle" class="h-8 w-8 mb-2 opacity-80" />
          <p class="text-sm font-medium">{{ contentError }}</p>
        </div>

        <div v-else-if="isMarkdown && markdownHtml" class="flex-1 min-h-0 overflow-y-auto rounded-lg border border-border bg-background p-4 md:p-6 lg:p-8">
          <div class="prose prose-sm dark:prose-invert max-w-none break-words" v-html="markdownHtml" />
        </div>

        <div v-else-if="isCode && fileRawContent" class="flex-1 min-h-0 rounded-lg border border-border overflow-hidden bg-[#0b0b0f]">
          <CodeEditor :model-value="fileRawContent" :language="item.fileExtension || 'text'" :readonly="true" :minimap="false" word-wrap="off" class="h-full w-full" />
        </div>

        <div v-else-if="isTableData && fileTableData" class="flex-1 min-h-0 flex flex-col rounded-lg border border-border overflow-hidden bg-card">
          <div class="flex-1 overflow-auto">
            <UiTable class="w-full">
              <UiTableHeader class="sticky top-0 z-10 bg-muted">
                <UiTableRow class="hover:bg-transparent border-b border-border">
                  <UiTableHead v-for="(col, i) in fileTableData.headers" :key="i" class="whitespace-nowrap font-medium h-9 text-xs px-3">
                    {{ col || `Column ${i + 1}` }}
                  </UiTableHead>
                </UiTableRow>
              </UiTableHeader>
              <UiTableBody>
                <UiTableRow v-for="(row, r) in fileTableData.rows.slice(0, 200)" :key="r" class="border-b border-border/50 hover:bg-muted/40 transition-colors">
                  <UiTableCell v-for="(_, c) in fileTableData.headers" :key="c" class="max-w-[300px] truncate py-1.5 px-3 text-xs text-muted-foreground">
                    {{ row[c] ?? '' }}
                  </UiTableCell>
                </UiTableRow>
              </UiTableBody>
            </UiTable>
          </div>
          <div class="px-3 py-1.5 border-t border-border bg-muted/40 text-[10px] text-muted-foreground flex justify-between shrink-0">
            <span>Showing first {{ Math.min(200, fileTableData.rows.length) }} rows</span>
            <span>{{ fileTableData.rows.length }} rows · {{ fileTableData.headers.length }} cols</span>
          </div>
        </div>
      </template>

      <!-- File info card -->
      <div class="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/10">
        <div :class="['w-10 h-10 rounded-lg flex items-center justify-center shrink-0', `bg-${fileMeta.color}-500/10`]">
          <Icon :name="fileMeta.icon" :class="['h-5 w-5', `text-${fileMeta.color}-500`]" />
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium truncate">{{ item.title || 'Untitled file' }}</p>
          <div class="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
            <span class="px-1.5 py-0.5 rounded bg-muted font-mono uppercase">{{ item.fileExtension || fileMeta.label }}</span>
            <span v-if="item.sizeBytes">{{ formatFileSize(item.sizeBytes) }}</span>
            <span v-if="isEnriching" class="flex items-center gap-1 text-amber-500">
              <Icon name="lucide:sparkles" class="h-2.5 w-2.5 animate-pulse" />
              Enriching…
            </span>
          </div>
        </div>
        <div v-if="!isViewMode" class="flex items-center gap-1 shrink-0">
          <div v-if="isUploading" class="flex items-center gap-1.5 px-2 text-[10px] text-muted-foreground">
            <Icon name="lucide:loader-2" class="h-3 w-3 animate-spin" />
            <span>Saving…</span>
          </div>
          <UiButton variant="ghost" size="icon" class="h-7 w-7" :disabled="isUploading" @click="triggerFileInput">
            <Icon name="lucide:replace" class="h-3.5 w-3.5" />
          </UiButton>
          <UiButton variant="ghost" size="icon" class="h-7 w-7 text-destructive hover:text-destructive"
            :disabled="isUploading"
            @click="removeFile">
            <Icon name="lucide:trash-2" class="h-3.5 w-3.5" />
          </UiButton>
        </div>
        <a v-else-if="item.url" :href="item.url" target="_blank" rel="noopener noreferrer" class="shrink-0">
          <UiButton variant="ghost" size="icon" class="h-7 w-7">
            <Icon name="lucide:download" class="h-3.5 w-3.5" />
          </UiButton>
        </a>
      </div>

      <!-- File Metadata Properties -->
      <div class="rounded-lg border border-border bg-muted/5 overflow-hidden">
        <div class="px-3 pt-2.5 pb-1 flex items-center gap-1.5 border-b border-border">
          <Icon name="lucide:info" class="h-3 w-3 text-muted-foreground" />
          <span class="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Properties</span>
        </div>
        <dl class="divide-y divide-border/50">
          <!-- Path -->
          <div v-if="item.storagePath" class="grid grid-cols-[120px_1fr] gap-2 px-3 py-1.5 items-start">
            <dt class="text-[10px] text-muted-foreground/70">Path</dt>
            <dd class="text-[10px] font-mono truncate text-muted-foreground" :title="item.storagePath">{{ item.storagePath }}</dd>
          </div>
          <!-- File type (MIME) -->
          <div v-if="item.mimeType" class="grid grid-cols-[120px_1fr] gap-2 px-3 py-1.5 items-center">
            <dt class="text-[10px] text-muted-foreground/70">File type</dt>
            <dd class="text-[10px] text-muted-foreground font-mono">{{ item.mimeType }}</dd>
          </div>
          <!-- Category -->
          <div v-if="item.fileCategory" class="grid grid-cols-[120px_1fr] gap-2 px-3 py-1.5 items-center">
            <dt class="text-[10px] text-muted-foreground/70">Category</dt>
            <dd>
              <span :class="['inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-medium', `bg-${fileMeta.color}-500/10 text-${fileMeta.color}-600 dark:text-${fileMeta.color}-400`]">
                <Icon :name="fileMeta.icon" class="h-2.5 w-2.5" />
                {{ fileMeta.label }}
              </span>
            </dd>
          </div>
          <!-- Size -->
          <div v-if="item.sizeBytes" class="grid grid-cols-[120px_1fr] gap-2 px-3 py-1.5 items-center">
            <dt class="text-[10px] text-muted-foreground/70">Size</dt>
            <dd class="text-[10px] text-muted-foreground">{{ formatFileSize(item.sizeBytes) }}</dd>
          </div>

          <!-- AI-enriched fields -->
          <div v-if="item.description" class="grid grid-cols-[120px_1fr] gap-2 px-3 py-1.5 items-start">
            <dt class="text-[10px] text-muted-foreground/70">Description</dt>
            <dd class="text-[10px] text-muted-foreground leading-relaxed">{{ item.description }}</dd>
          </div>
          <div v-if="item.documentAuthor" class="grid grid-cols-[120px_1fr] gap-2 px-3 py-1.5 items-center">
            <dt class="text-[10px] text-muted-foreground/70">Author</dt>
            <dd class="text-[10px] text-muted-foreground">{{ item.documentAuthor }}</dd>
          </div>
          <div v-if="item.codeLanguage" class="grid grid-cols-[120px_1fr] gap-2 px-3 py-1.5 items-center">
            <dt class="text-[10px] text-muted-foreground/70">Language</dt>
            <dd class="text-[10px] text-muted-foreground">{{ item.codeLanguage }}</dd>
          </div>
          <div v-if="item.artist" class="grid grid-cols-[120px_1fr] gap-2 px-3 py-1.5 items-center">
            <dt class="text-[10px] text-muted-foreground/70">Artist</dt>
            <dd class="text-[10px] text-muted-foreground">{{ item.artist }}</dd>
          </div>
          <div v-if="item.album" class="grid grid-cols-[120px_1fr] gap-2 px-3 py-1.5 items-center">
            <dt class="text-[10px] text-muted-foreground/70">Album</dt>
            <dd class="text-[10px] text-muted-foreground">{{ item.album }}</dd>
          </div>
          <div v-if="item.genre" class="grid grid-cols-[120px_1fr] gap-2 px-3 py-1.5 items-center">
            <dt class="text-[10px] text-muted-foreground/70">Genre</dt>
            <dd class="text-[10px] text-muted-foreground">{{ item.genre }}</dd>
          </div>
          <div v-if="item.pageCount" class="grid grid-cols-[120px_1fr] gap-2 px-3 py-1.5 items-center">
            <dt class="text-[10px] text-muted-foreground/70">Pages</dt>
            <dd class="text-[10px] text-muted-foreground">{{ item.pageCount }}</dd>
          </div>
          <div v-if="item.lineCount" class="grid grid-cols-[120px_1fr] gap-2 px-3 py-1.5 items-center">
            <dt class="text-[10px] text-muted-foreground/70">Lines</dt>
            <dd class="text-[10px] text-muted-foreground">{{ item.lineCount }}</dd>
          </div>

          <!-- Created / Updated -->
          <div v-if="item.createdAt" class="grid grid-cols-[120px_1fr] gap-2 px-3 py-1.5 items-center">
            <dt class="text-[10px] text-muted-foreground/70">Created</dt>
            <dd class="text-[10px] text-muted-foreground">{{ formatRelativeTime(item.createdAt) }}</dd>
          </div>
          <div v-if="item.updatedAt" class="grid grid-cols-[120px_1fr] gap-2 px-3 py-1.5 items-center">
            <dt class="text-[10px] text-muted-foreground/70">Last edited</dt>
            <dd class="text-[10px] text-muted-foreground">{{ formatRelativeTime(item.updatedAt) }}</dd>
          </div>

          <!-- AI tags -->
          <div v-if="item.aiTags?.length" class="grid grid-cols-[120px_1fr] gap-2 px-3 py-2 items-start">
            <dt class="text-[10px] text-muted-foreground/70 mt-0.5">AI tags</dt>
            <dd class="flex flex-wrap gap-1">
              <span v-for="tag in item.aiTags" :key="tag"
                class="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium">
                {{ tag }}
              </span>
            </dd>
          </div>
        </dl>
      </div>

      <!-- Hidden file input for replace -->
      <input ref="fileInputRef" type="file" class="hidden" @change="onFileInputChange" />
    </div>

    <!-- Empty state (view mode, no file) -->
    <div v-else class="flex flex-col items-center justify-center py-12 text-center">
      <Icon name="lucide:file-x" class="h-8 w-8 text-muted-foreground/40 mb-2" />
      <p class="text-xs text-muted-foreground">No file attached</p>
    </div>
  </div>
</template>
