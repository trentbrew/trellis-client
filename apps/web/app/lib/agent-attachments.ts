import type { AgentAttachment } from '~/types/agent'
import type { UploadResult } from '~/types/upload'

export const AGENT_ATTACHMENT_MAX_COUNT = 8
export const AGENT_ATTACHMENT_MAX_BYTES = 20 * 1024 * 1024

export const AGENT_FILE_ACCEPT =
  'image/*,.pdf,.txt,.md,.markdown,.json,.csv,.xml,.html,.htm,.js,.ts,.tsx,.jsx,.vue,.yaml,.yml'

export function classifyAttachmentKind(contentType: string, filename: string): AgentAttachment['kind'] {
  if (contentType.startsWith('image/')) return 'image'
  const lower = filename.toLowerCase()
  if (/\.(png|jpe?g|gif|webp|svg|avif|bmp|heic)$/.test(lower)) return 'image'
  return 'file'
}

export function storagePathFromUploadUrl(url: string): string | undefined {
  if (!url.includes('/api/storage/local-file')) return undefined
  try {
    const parsed = new URL(url, 'http://localhost')
    const path = parsed.searchParams.get('path')
    return path ? decodeURIComponent(path) : undefined
  } catch {
    return undefined
  }
}

export function uploadResultToAttachment(result: UploadResult, kind?: AgentAttachment['kind']): AgentAttachment {
  const filename = result.filename || 'file'
  const contentType = result.contentType || 'application/octet-stream'
  return {
    id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    url: result.url,
    path: result.path || storagePathFromUploadUrl(result.url),
    filename,
    contentType,
    size: result.size ?? 0,
    kind: kind ?? classifyAttachmentKind(contentType, filename),
  }
}

/** Plain text for the model + history from editor HTML. */
export function plainTextFromAgentHtml(html: string): string {
  if (!html) return ''
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

const INLINE_UPLOADING_ALT = /^__uploading__/

function contentTypeFromDataUrl(url: string): string {
  if (!url.startsWith('data:')) return 'image/png'
  const semi = url.indexOf(';')
  if (semi === -1) return 'image/png'
  return url.slice(5, semi) || 'image/png'
}

/** Images embedded in the rich-text editor (image+ / paste) → attachment records. */
export function extractInlineImageAttachments(html: string): AgentAttachment[] {
  if (!html || !/<img/i.test(html)) return []

  const attachments: AgentAttachment[] = []
  const imgRegex = /<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi
  let match: RegExpExecArray | null

  while ((match = imgRegex.exec(html)) !== null) {
    const url = match[1]?.trim()
    if (!url || url.includes('data:image/svg+xml')) continue

    const tag = match[0]
    const altMatch = tag.match(/\balt=["']([^"']*)["']/i)
    const alt = altMatch?.[1]?.trim() ?? ''
    if (INLINE_UPLOADING_ALT.test(alt)) continue

    attachments.push({
      id: `att-inline-${attachments.length}-${Date.now()}`,
      url,
      filename: alt && !INLINE_UPLOADING_ALT.test(alt) ? alt : `image-${attachments.length + 1}.webp`,
      contentType: contentTypeFromDataUrl(url),
      size: 0,
      kind: 'image',
    })
  }

  return attachments
}

export function formatAttachmentBytes(size: number): string {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

export function dataUrlToFile(dataUrl: string, filename: string, contentType?: string): File {
  const [header, data] = dataUrl.split(',')
  if (!data) throw new Error('Invalid data URL')

  const mime = contentType || header?.match(/data:([^;]+)/)?.[1] || 'application/octet-stream'
  const binary = atob(data)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)

  return new File([bytes], filename, { type: mime })
}

export function isDataUrl(url: string): boolean {
  return url.startsWith('data:')
}

/** Upload data URLs to persistent storage before send / entity creation. */
export async function persistDataUrlAttachment(
  attachment: AgentAttachment,
  uploadFile: (file: File) => Promise<UploadResult>,
): Promise<AgentAttachment> {
  if (!isDataUrl(attachment.url)) return attachment

  const file = dataUrlToFile(attachment.url, attachment.filename, attachment.contentType)
  const result = await uploadFile(file)
  const persisted = uploadResultToAttachment(result, attachment.kind)

  return {
    ...persisted,
    id: attachment.id,
    entityId: attachment.entityId,
  }
}

export function mergeAgentAttachments(...lists: readonly (readonly AgentAttachment[])[]): AgentAttachment[] {
  const seen = new Set<string>()
  const merged: AgentAttachment[] = []

  for (const list of lists) {
    for (const attachment of list) {
      if (seen.has(attachment.url)) continue
      seen.add(attachment.url)
      merged.push(attachment)
      if (merged.length >= AGENT_ATTACHMENT_MAX_COUNT) return merged
    }
  }

  return merged
}

export function formatAgentMessageForHistory(content: string, attachments?: readonly AgentAttachment[]): string {
  const text = content.trim()
  if (!attachments?.length) return text
  const names = attachments.map((a) => a.filename).join(', ')
  if (!text) return `[Attachments: ${names}]`
  return `${text}\n\n[Attachments: ${names}]`
}
