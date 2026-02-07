<script lang="ts" setup>
  import type { Attachment } from '~/types/calendarItem'

  const props = defineProps<{
    modelValue: Attachment[]
    readonly?: boolean
  }>()

  const emit = defineEmits<{
    'update:modelValue': [value: Attachment[]]
  }>()

  const attachments = computed({
    get: () => props.modelValue,
    set: (v) => emit('update:modelValue', v),
  })

  const getAttachmentIcon = (type: Attachment['type']) => {
    const m: Record<Attachment['type'], string> = {
      pdf: 'lucide:file-text',
      spreadsheet: 'lucide:file-spreadsheet',
      image: 'lucide:image',
      document: 'lucide:file',
      other: 'lucide:file',
    }
    return m[type] || 'lucide:file'
  }

  const getAttachmentColor = (type: Attachment['type']) => {
    const m: Record<Attachment['type'], string> = {
      pdf: 'text-rose-600 bg-rose-500/10',
      spreadsheet: 'text-green-600 bg-green-500/10',
      image: 'text-violet-600 bg-violet-500/10',
      document: 'text-blue-600 bg-blue-500/10',
      other: 'text-gray-600 bg-gray-500/10',
    }
    return m[type] || 'text-gray-600 bg-gray-500/10'
  }
</script>

<template>
  <div v-if="attachments.length || !readonly" class="p-4 space-y-1.5">
    <div class="flex items-center justify-between">
      <p class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Attachments</p>
      <button v-if="!readonly" class="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
        <Icon name="lucide:plus" class="h-3 w-3" /> Add
      </button>
    </div>
    <div v-if="attachments.length" class="space-y-1">
      <div
        v-for="att in attachments"
        :key="att.id"
        class="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted/50 transition-colors">
        <div :class="['w-7 h-7 rounded flex items-center justify-center', getAttachmentColor(att.type)]">
          <Icon :name="getAttachmentIcon(att.type)" class="h-3.5 w-3.5" />
        </div>
        <span class="flex-1 text-xs truncate">{{ att.name }}</span>
      </div>
    </div>
    <p v-else class="text-xs text-muted-foreground italic">No attachments</p>
  </div>
</template>
