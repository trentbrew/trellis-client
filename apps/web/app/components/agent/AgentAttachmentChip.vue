<script setup lang="ts">
  import type { AgentAttachment } from '~/types/agent'
  import { formatAttachmentBytes } from '~/lib/agent-attachments'

  const props = defineProps<{
    attachment: AgentAttachment
    variant?: 'input' | 'message'
    removable?: boolean
  }>()

  const emit = defineEmits<{
    remove: []
  }>()

  const { items: entityItems } = useEntities()
  const dialogStack = useDialogStack()

  const isMessage = computed(() => props.variant === 'message')

  const chipClass = computed(() =>
    isMessage.value
      ? 'border-primary-foreground/15 bg-primary-foreground/10 text-primary-foreground'
      : 'border-border/70 bg-background/80 text-foreground',
  )

  const metaClass = computed(() =>
    isMessage.value ? 'text-primary-foreground/70' : 'text-muted-foreground',
  )

  const fileIcon = computed(() => {
    if (props.attachment.contentType === 'application/pdf') return 'lucide:file-text'
    if (props.attachment.contentType.startsWith('text/')) return 'lucide:file-code-2'
    return 'lucide:file'
  })

  function openAttachment(event: MouseEvent) {
    if (props.removable) return

    const entityId = props.attachment.entityId
    if (entityId) {
      event.preventDefault()
      const entity = entityItems.value.find((item) => item.id === entityId)
      if (entity) {
        dialogStack.push(entityId, 'file', entity)
        return
      }
    }

    if (!props.attachment.url.startsWith('data:')) return
    event.preventDefault()
  }
</script>

<template>
  <component
    :is="removable ? 'div' : 'a'"
    :href="removable || attachment.entityId ? undefined : attachment.url"
    :target="removable || attachment.entityId ? undefined : '_blank'"
    :rel="removable || attachment.entityId ? undefined : 'noopener noreferrer'"
    class="group relative flex min-w-0 max-w-[220px] cursor-default items-center gap-2 rounded-lg border px-2 py-1.5 pr-7 text-xs transition-colors"
    :class="[
      chipClass,
      !removable && (attachment.entityId || !attachment.url.startsWith('data:')) && 'cursor-pointer hover:opacity-90',
    ]"
    @click="openAttachment">
    <div
      class="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md"
      :class="isMessage ? 'bg-primary-foreground/10' : 'bg-muted'">
      <img
        v-if="attachment.kind === 'image'"
        :src="attachment.url"
        :alt="attachment.filename"
        class="h-full w-full object-cover" />
      <Icon v-else :name="fileIcon" class="h-4 w-4" :class="metaClass" />
    </div>

    <div class="min-w-0 flex-1">
      <div class="truncate font-medium">{{ attachment.filename }}</div>
      <div class="text-[10px]" :class="metaClass">
        {{ attachment.size > 0 ? formatAttachmentBytes(attachment.size) : attachment.kind === 'image' ? 'Image' : 'File' }}
      </div>
    </div>

    <button
      v-if="removable"
      type="button"
      class="absolute right-1 top-1 rounded p-0.5 opacity-70 transition-opacity hover:bg-muted hover:opacity-100"
      :class="metaClass"
      :aria-label="`Remove ${attachment.filename}`"
      @click.stop="emit('remove')">
      <Icon name="lucide:x" class="h-3 w-3" />
    </button>
  </component>
</template>
