<script lang="ts" setup>
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

  // ── File helpers ───────────────────────────────────────────────────────
  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return '—'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
  }

  const getMimeIcon = (mime: string): string => {
    if (!mime) return 'lucide:file'
    if (mime.startsWith('image/')) return 'lucide:image'
    if (mime.startsWith('video/')) return 'lucide:film'
    if (mime.startsWith('audio/')) return 'lucide:music'
    if (mime.includes('pdf')) return 'lucide:file-text'
    if (mime.includes('spreadsheet') || mime.includes('csv') || mime.includes('excel')) return 'lucide:file-spreadsheet'
    if (mime.includes('zip') || mime.includes('tar') || mime.includes('gzip')) return 'lucide:archive'
    if (mime.includes('json') || mime.includes('xml') || mime.includes('javascript') || mime.includes('typescript')) return 'lucide:file-code'
    if (mime.includes('text/') || mime.includes('document') || mime.includes('word')) return 'lucide:file-text'
    return 'lucide:file'
  }

  const getMimeLabel = (mime: string): string => {
    if (!mime) return 'Unknown'
    const parts = mime.split('/')
    return parts[1]?.toUpperCase() || parts[0]?.toUpperCase() || 'File'
  }

  const fileInputRef = ref<HTMLInputElement | null>(null)
  const hasFile = computed(() => !!item.value?.url || !!item.value?.storagePath || !!item.value?.mimeType)
  const isImage = computed(() => item.value?.mimeType?.startsWith('image/'))
  const isPdf = computed(() => item.value?.mimeType === 'application/pdf')
  const isVideo = computed(() => item.value?.mimeType?.startsWith('video/'))
  const isAudio = computed(() => item.value?.mimeType?.startsWith('audio/'))
  const isEmbeddable = computed(() => isImage.value || isPdf.value || isVideo.value || isAudio.value)

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

  const handleFileSelect = (file: File) => {
    const url = URL.createObjectURL(file)
    item.value.mimeType = file.type || 'application/octet-stream'
    item.value.sizeBytes = file.size
    item.value.url = url
    if (!item.value.title) {
      item.value.title = file.name.replace(/\.[^/.]+$/, '')
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
  }
</script>

<template>
  <div class="flex-1 flex flex-col min-h-0 p-4 space-y-3">
    <!-- File drop zone (create/edit without file) -->
    <div
      v-if="!isViewMode && !hasFile"
      class="relative rounded-lg border-2 border-dashed transition-colors cursor-pointer"
      :class="isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/30'"
      @dragover="onDragOver"
      @dragleave="onDragLeave"
      @drop="onDrop"
      @click="triggerFileInput">
      <div class="flex flex-col items-center justify-center py-12 px-4 text-center">
        <div class="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
          <Icon name="lucide:upload-cloud" class="h-6 w-6 text-primary" />
        </div>
        <p class="text-sm font-medium">Drop a file here</p>
        <p class="text-xs text-muted-foreground mt-1">or click to browse</p>
        <p class="text-[10px] text-muted-foreground/60 mt-2">Any file type supported</p>
      </div>
      <input
        ref="fileInputRef"
        type="file"
        class="hidden"
        @change="onFileInputChange" />
    </div>

    <!-- File preview (when file is attached) -->
    <div v-else-if="hasFile" class="flex-1 flex flex-col min-h-0 space-y-3">
      <!-- Full-bleed preview area -->
      <div v-if="isEmbeddable && item.url" class="flex-1 min-h-0 rounded-lg overflow-hidden border border-border bg-muted/20 relative">
        <img v-if="isImage" :src="item.url" :alt="item.title" class="w-full h-full object-contain" />
        <iframe v-else-if="isPdf" :src="item.url" class="w-full h-full border-0" />
        <video v-else-if="isVideo" :src="item.url" controls class="w-full h-full" />
        <div v-else-if="isAudio" class="absolute inset-0 flex items-center justify-center p-8">
          <audio :src="item.url" controls class="w-full" />
        </div>
      </div>

      <!-- File info card -->
      <div class="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/10">
        <div class="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Icon :name="getMimeIcon(item.mimeType)" class="h-5 w-5 text-primary" />
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium truncate">{{ item.title || 'Untitled file' }}</p>
          <div class="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
            <span class="px-1.5 py-0.5 rounded bg-muted font-mono">{{ getMimeLabel(item.mimeType) }}</span>
            <span v-if="item.sizeBytes">{{ formatFileSize(item.sizeBytes) }}</span>
          </div>
        </div>
        <div v-if="!isViewMode" class="flex items-center gap-1 shrink-0">
          <UiButton variant="ghost" size="icon" class="h-7 w-7" @click="triggerFileInput">
            <Icon name="lucide:replace" class="h-3.5 w-3.5" />
          </UiButton>
          <UiButton variant="ghost" size="icon" class="h-7 w-7 text-destructive hover:text-destructive" @click="removeFile">
            <Icon name="lucide:trash-2" class="h-3.5 w-3.5" />
          </UiButton>
        </div>
        <a
          v-else-if="item.url"
          :href="item.url"
          target="_blank"
          rel="noopener noreferrer"
          class="shrink-0">
          <UiButton variant="ghost" size="icon" class="h-7 w-7">
            <Icon name="lucide:download" class="h-3.5 w-3.5" />
          </UiButton>
        </a>
      </div>

      <!-- Hidden file input for replace -->
      <input
        ref="fileInputRef"
        type="file"
        class="hidden"
        @change="onFileInputChange" />
    </div>

    <!-- Empty state (view mode, no file) -->
    <div v-else class="flex flex-col items-center justify-center py-12 text-center">
      <Icon name="lucide:file-x" class="h-8 w-8 text-muted-foreground/40 mb-2" />
      <p class="text-xs text-muted-foreground">No file attached</p>
    </div>
  </div>
</template>
