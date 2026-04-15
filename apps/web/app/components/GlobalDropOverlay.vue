<script setup lang="ts">
  import type { DropResult } from '~/composables/useGlobalDropZone'

  const props = defineProps<{
    isDragging: boolean
    drop: DropResult | null
  }>()

  const typeConfig = computed(() => {
    if (!props.drop) return null

    switch (props.drop.type) {
      case 'file':
        return {
          icon: 'lucide:file',
          label: 'Create file',
          color: 'text-blue-400',
        }
      case 'url':
        return {
          icon: 'lucide:link',
          label: 'Create bookmark',
          color: 'text-green-400',
        }
      case 'text':
        return {
          icon: 'lucide:file-text',
          label: 'Create note',
          color: 'text-purple-400',
        }
      default:
        return {
          icon: 'lucide:plus',
          label: 'Create entity',
          color: 'text-foreground',
        }
    }
  })

  const previewText = computed(() => {
    if (!props.drop) return ''
    switch (props.drop.type) {
      case 'file': {
        const file = props.drop.files?.[0]?.file
        if (!file) return ''
        const size =
          file.size > 1024 * 1024
            ? `${(file.size / 1024 / 1024).toFixed(1)} MB`
            : file.size > 1024
              ? `${(file.size / 1024).toFixed(0)} KB`
              : `${file.size} B`
        return `${file.name} (${size})`
      }
      case 'url':
        return props.drop.url
      case 'text':
        return props.drop.text?.slice(0, 100)
      default:
        return ''
    }
  })
</script>

<template>
  <Transition
    enter-active-class="transition-all duration-200 ease-out"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition-all duration-150 ease-in"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0">
    <div v-if="isDragging" class="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none">
      <!-- Backdrop -->
      <div class="absolute inset-0 bg-background/80 backdrop-blur-sm" />

      <!-- Drop indicator -->
      <div
        class="relative flex flex-col items-center gap-6 p-12 rounded-2xl border-2 border-dashed border-primary/50 bg-card/95 shadow-2xl shadow-primary/10">
        <div class="flex items-center gap-4">
          <div class="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Icon v-if="typeConfig" :name="typeConfig.icon" :class="['h-8 w-8', typeConfig.color]" />
            <Icon v-else name="lucide:plus" class="h-8 w-8 text-foreground" />
          </div>
          <div class="flex flex-col">
            <span v-if="typeConfig" :class="['text-xl font-semibold', typeConfig.color]">
              {{ typeConfig.label }}
            </span>
            <span v-else class="text-xl font-semibold text-foreground">Drop to create</span>
            <span v-if="previewText" class="mt-1 max-w-sm truncate text-sm text-muted-foreground">
              {{ previewText }}
            </span>
          </div>
        </div>

        <!-- File previews for multiple files -->
        <div v-if="drop?.type === 'file' && (drop.files?.length ?? 0) > 1" class="flex gap-2">
          <div
            v-for="(f, idx) in drop.files?.slice(0, 5)"
            :key="idx"
            class="flex h-12 w-12 items-center justify-center rounded-lg border border-border bg-muted/50">
            <img v-if="f.preview" :src="f.preview" class="h-full w-full rounded-lg object-cover" alt="" />
            <Icon v-else name="lucide:file" class="h-6 w-6 text-muted-foreground" />
          </div>
          <div
            v-if="(drop.files?.length ?? 0) > 5"
            class="flex h-12 w-12 items-center justify-center rounded-lg border border-border bg-muted/50">
            <span class="text-sm text-muted-foreground">+{{ (drop.files?.length ?? 0) - 5 }}</span>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>
