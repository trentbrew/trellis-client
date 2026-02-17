<script setup lang="ts">
  interface Props {
    modelValue?: string | null
    label?: string
    hint?: string
  }

  const props = withDefaults(defineProps<Props>(), {
    modelValue: null,
    label: 'Logo Mark',
    hint: 'Square image. SVG, PNG, or WebP. Max 2MB.',
  })

  const emit = defineEmits<{
    'update:modelValue': [value: string | null]
  }>()

  const { uploadImage, isUploading, uploadError } = useImageUpload('brand-logo')
  const fileInput = ref<HTMLInputElement | null>(null)
  const isDragging = ref(false)

  async function handleFile(file: File) {
    if (!file.type.startsWith('image/')) return
    try {
      const result = await uploadImage(file)
      emit('update:modelValue', result.url)
    } catch {
      // uploadError is already set by the composable
    }
  }

  function onFileChange(e: Event) {
    const input = e.target as HTMLInputElement
    const file = input.files?.[0]
    if (file) handleFile(file)
    input.value = ''
  }

  function onDrop(e: DragEvent) {
    isDragging.value = false
    const file = e.dataTransfer?.files?.[0]
    if (file) handleFile(file)
  }

  function remove() {
    emit('update:modelValue', null)
  }
</script>

<template>
  <div class="space-y-2">
    <label class="text-sm font-medium">{{ props.label }}</label>

    <!-- Preview / Upload area -->
    <div
      class="relative flex items-center justify-center rounded-lg border-2 border-dashed transition-colors cursor-pointer"
      :class="[
        isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50',
        props.modelValue ? 'p-3' : 'p-6',
      ]"
      @click="fileInput?.click()"
      @dragover.prevent="isDragging = true"
      @dragleave="isDragging = false"
      @drop.prevent="onDrop">

      <!-- Has logo -->
      <div v-if="props.modelValue" class="flex items-center gap-4">
        <div class="relative group">
          <img
            :src="props.modelValue"
            alt="Brand logo"
            class="h-16 w-16 rounded-lg object-contain bg-muted/30 p-1"
          />
          <button
            type="button"
            class="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
            @click.stop="remove">
            <Icon name="lucide:x" class="h-3 w-3" />
          </button>
        </div>
        <div class="text-xs text-muted-foreground">
          <p>Click or drag to replace</p>
        </div>
      </div>

      <!-- Empty state -->
      <div v-else class="flex flex-col items-center gap-2 text-center">
        <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-muted/50">
          <Icon v-if="isUploading" name="lucide:loader-2" class="h-5 w-5 text-muted-foreground animate-spin" />
          <Icon v-else name="lucide:image-plus" class="h-5 w-5 text-muted-foreground" />
        </div>
        <div>
          <p class="text-sm font-medium text-muted-foreground">
            {{ isUploading ? 'Uploading...' : 'Click or drag to upload' }}
          </p>
          <p class="text-xs text-muted-foreground/70">{{ props.hint }}</p>
        </div>
      </div>
    </div>

    <!-- Error -->
    <p v-if="uploadError" class="text-xs text-destructive flex items-center gap-1">
      <Icon name="lucide:alert-circle" class="h-3 w-3" />
      {{ uploadError }}
    </p>

    <!-- Hidden file input -->
    <input
      ref="fileInput"
      type="file"
      accept="image/svg+xml,image/png,image/webp,image/jpeg"
      class="hidden"
      @change="onFileChange"
    />
  </div>
</template>
