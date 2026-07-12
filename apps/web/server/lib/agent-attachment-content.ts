import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { ChatCompletionContentPart, ChatCompletionMessageParam } from 'openai/resources/chat/completions'
import { NODEBOOK_FILES_DIR } from '../api/storage/local-upload.post'

export interface AgentAttachmentInput {
  url: string
  path?: string
  filename: string
  contentType: string
  size: number
  kind: 'image' | 'file'
}

const TEXT_MIME_PREFIXES = ['text/', 'application/json', 'application/xml', 'application/javascript']
const TEXT_EXTENSIONS = new Set([
  '.txt', '.md', '.markdown', '.json', '.csv', '.xml', '.html', '.htm',
  '.js', '.ts', '.tsx', '.jsx', '.vue', '.yaml', '.yml', '.css',
])

export const AGENT_TEXT_ATTACHMENT_MAX_CHARS = 24_000

export function isTextLikeAttachment(contentType: string, filename: string): boolean {
  if (TEXT_MIME_PREFIXES.some((prefix) => contentType.startsWith(prefix))) return true
  const ext = filename.includes('.') ? `.${filename.split('.').pop()!.toLowerCase()}` : ''
  return TEXT_EXTENSIONS.has(ext)
}

export function parseLocalStoragePath(url: string): string | null {
  if (!url.includes('/api/storage/local-file')) return null
  try {
    const parsed = new URL(url, 'http://localhost')
    const path = parsed.searchParams.get('path')
    return path ? decodeURIComponent(path) : null
  } catch {
    return null
  }
}

async function readLocalAttachmentBytes(attachment: AgentAttachmentInput): Promise<Buffer> {
  const relative = attachment.path || parseLocalStoragePath(attachment.url)
  if (!relative) throw new Error(`Cannot resolve local path for ${attachment.filename}`)
  if (relative.includes('..') || relative.startsWith('/')) {
    throw new Error(`Invalid attachment path for ${attachment.filename}`)
  }
  return readFile(join(NODEBOOK_FILES_DIR, relative))
}

async function resolveImageUrlForModel(attachment: AgentAttachmentInput): Promise<string> {
  if (attachment.url.startsWith('data:')) return attachment.url

  const relative = attachment.path || parseLocalStoragePath(attachment.url)
  if (!relative) return attachment.url

  const bytes = await readLocalAttachmentBytes(attachment)
  const mime = attachment.contentType || 'image/png'
  return `data:${mime};base64,${bytes.toString('base64')}`
}

async function readTextAttachmentBody(attachment: AgentAttachmentInput): Promise<string> {
  if (attachment.url.startsWith('data:')) {
    const comma = attachment.url.indexOf(',')
    if (comma === -1) return ''
    const meta = attachment.url.slice(0, comma)
    const data = attachment.url.slice(comma + 1)
    const body = meta.includes(';base64')
      ? Buffer.from(data, 'base64').toString('utf8')
      : decodeURIComponent(data)
    return body.slice(0, AGENT_TEXT_ATTACHMENT_MAX_CHARS)
  }

  const bytes = await readLocalAttachmentBytes(attachment)
  return bytes.toString('utf8').slice(0, AGENT_TEXT_ATTACHMENT_MAX_CHARS)
}

export async function buildUserMessageContent(
  text: string,
  attachments?: AgentAttachmentInput[],
): Promise<string | ChatCompletionContentPart[]> {
  const trimmed = text.trim()
  if (!attachments?.length) return trimmed

  const textSections: string[] = []
  if (trimmed) textSections.push(trimmed)

  const imageParts: ChatCompletionContentPart[] = []

  for (const attachment of attachments) {
    const isImage = attachment.kind === 'image' || attachment.contentType.startsWith('image/')
    if (isImage) {
      imageParts.push({
        type: 'image_url',
        image_url: { url: await resolveImageUrlForModel(attachment) },
      })
      continue
    }

    if (isTextLikeAttachment(attachment.contentType, attachment.filename)) {
      try {
        const body = await readTextAttachmentBody(attachment)
        textSections.push(`--- ${attachment.filename} ---\n${body}`)
      } catch {
        textSections.push(`[Attached file: ${attachment.filename} — could not read text content]`)
      }
      continue
    }

    textSections.push(
      `[Attached file: ${attachment.filename} (${attachment.contentType || 'unknown'}, ${attachment.size} bytes)]`,
    )
  }

  const parts: ChatCompletionContentPart[] = []
  const combinedText = textSections.join('\n\n').trim()
  if (combinedText) parts.push({ type: 'text', text: combinedText })
  parts.push(...imageParts)

  if (parts.length === 0) return ''
  if (parts.length === 1 && parts[0]?.type === 'text') return parts[0].text
  return parts
}

export async function appendLatestUserMessage(
  messages: ChatCompletionMessageParam[],
  text: string,
  attachments?: AgentAttachmentInput[],
) {
  const content = await buildUserMessageContent(text, attachments)
  if (typeof content === 'string') {
    if (content.trim()) messages.push({ role: 'user', content })
    return
  }
  if (content.length > 0) messages.push({ role: 'user', content })
}
