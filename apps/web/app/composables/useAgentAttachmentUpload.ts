import type { AgentAttachment } from '~/types/agent'
import {
  AGENT_ATTACHMENT_MAX_BYTES,
  AGENT_ATTACHMENT_MAX_COUNT,
  mergeAgentAttachments,
  persistDataUrlAttachment,
  uploadResultToAttachment,
} from '~/lib/agent-attachments'
import { useFileUpload } from '~/composables/useFileUpload'

export function useAgentAttachmentUpload() {
  const pending = ref<AgentAttachment[]>([])
  const { uploadFile, isUploading, uploadError } = useFileUpload('agent-chat')
  const { provisionFileEntity } = useAgentFileEntity()

  async function addFiles(files: FileList | File[]) {
    const list = Array.from(files)
    if (!list.length) return

    const remaining = AGENT_ATTACHMENT_MAX_COUNT - pending.value.length
    if (remaining <= 0) {
      uploadError.value = `Maximum ${AGENT_ATTACHMENT_MAX_COUNT} attachments per message`
      return
    }

    for (const file of list.slice(0, remaining)) {
      if (file.size > AGENT_ATTACHMENT_MAX_BYTES) {
        uploadError.value = `${file.name} exceeds the ${Math.round(AGENT_ATTACHMENT_MAX_BYTES / (1024 * 1024))}MB limit`
        continue
      }

      try {
        const result = await uploadFile(file)
        const attachment = uploadResultToAttachment(result)
        pending.value.push(await provisionFileEntity(attachment))
      } catch (error) {
        console.error('[useAgentAttachmentUpload] Upload failed:', file.name, error)
      }
    }
  }

  async function finalizeForSend(attachments: readonly AgentAttachment[]): Promise<AgentAttachment[]> {
    const persisted: AgentAttachment[] = []

    for (const attachment of attachments) {
      try {
        const stored = await persistDataUrlAttachment(attachment, uploadFile)
        persisted.push(stored.entityId ? stored : await provisionFileEntity(stored))
      } catch (error) {
        console.error('[useAgentAttachmentUpload] Failed to finalize attachment:', attachment.filename, error)
        persisted.push(attachment)
      }
    }

    return mergeAgentAttachments(persisted)
  }

  function remove(id: string) {
    pending.value = pending.value.filter((item) => item.id !== id)
  }

  function clear() {
    pending.value = []
    uploadError.value = null
  }

  return {
    pending,
    isUploading,
    uploadError,
    addFiles,
    finalizeForSend,
    remove,
    clear,
  }
}
