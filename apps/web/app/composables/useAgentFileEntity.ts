import type { AgentAttachment } from '~/types/agent'
import { classifyFile, getFileExtension } from '~/utils/fileClassification'

export function useAgentFileEntity() {
  const { create } = useTrellisEntities()

  async function provisionFileEntity(attachment: AgentAttachment): Promise<AgentAttachment> {
    if (attachment.entityId) return attachment

    const entityId = await create({
      type: 'file',
      title: attachment.filename,
      mimeType: attachment.contentType,
      url: attachment.url,
      fileName: attachment.filename,
      sizeBytes: attachment.size || undefined,
      pinned: false,
      fileCategory: classifyFile(attachment.contentType, attachment.filename),
      fileExtension: getFileExtension(attachment.filename) || undefined,
      storagePath: attachment.path,
    } as any)

    return { ...attachment, entityId }
  }

  async function provisionFileEntities(attachments: readonly AgentAttachment[]): Promise<AgentAttachment[]> {
    const results: AgentAttachment[] = []
    for (const attachment of attachments) {
      try {
        results.push(await provisionFileEntity(attachment))
      } catch (error) {
        console.error('[useAgentFileEntity] Failed to create file entity:', attachment.filename, error)
        results.push(attachment)
      }
    }
    return results
  }

  return { provisionFileEntity, provisionFileEntities }
}
