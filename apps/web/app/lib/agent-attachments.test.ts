import { describe, expect, it } from 'vitest'
import {
  classifyAttachmentKind,
  dataUrlToFile,
  extractInlineImageAttachments,
  formatAgentMessageForHistory,
  formatAttachmentBytes,
  isDataUrl,
  mergeAgentAttachments,
  plainTextFromAgentHtml,
  storagePathFromUploadUrl,
} from './agent-attachments'

describe('agent-attachments', () => {
  it('classifies images by mime type', () => {
    expect(classifyAttachmentKind('image/png', 'doc.pdf')).toBe('image')
    expect(classifyAttachmentKind('application/pdf', 'doc.pdf')).toBe('file')
  })

  it('extracts plain text from editor HTML', () => {
    expect(plainTextFromAgentHtml('<p>Hello <strong>world</strong></p>')).toBe('Hello world')
  })

  it('formats history with attachment names', () => {
    expect(formatAgentMessageForHistory('summarize this', [{
      id: '1',
      url: '/api/storage/local-file?path=note.md',
      filename: 'note.md',
      contentType: 'text/markdown',
      size: 12,
      kind: 'file',
    }])).toBe('summarize this\n\n[Attachments: note.md]')
  })

  it('parses storage path from upload URL', () => {
    expect(storagePathFromUploadUrl('/api/storage/local-file?path=agent-chat%2Ffile.md'))
      .toBe('agent-chat/file.md')
  })

  it('extracts inline editor images into attachments', () => {
    const html = '<p>look</p><img src="data:image/webp;base64,abc" alt="screenshot.webp" />'
    const attachments = extractInlineImageAttachments(html)
    expect(attachments).toHaveLength(1)
    expect(attachments[0]).toMatchObject({
      url: 'data:image/webp;base64,abc',
      filename: 'screenshot.webp',
      kind: 'image',
    })
  })

  it('merges pending and inline attachments without duplicates', () => {
    const shared = {
      id: '1',
      url: 'data:image/png;base64,x',
      filename: 'a.png',
      contentType: 'image/png',
      size: 1,
      kind: 'image' as const,
    }
    expect(mergeAgentAttachments([shared], [shared])).toHaveLength(1)
  })

  it('formats attachment byte sizes', () => {
    expect(formatAttachmentBytes(512)).toBe('512 B')
    expect(formatAttachmentBytes(2048)).toBe('2.0 KB')
    expect(formatAttachmentBytes(5 * 1024 * 1024)).toBe('5.0 MB')
  })

  it('converts data URLs to files', () => {
    const file = dataUrlToFile('data:text/plain;base64,aGVsbG8=', 'hello.txt', 'text/plain')
    expect(file.name).toBe('hello.txt')
    expect(file.type).toBe('text/plain')
    expect(isDataUrl('data:image/png;base64,abc')).toBe(true)
    expect(isDataUrl('/api/storage/local-file?path=x')).toBe(false)
  })
})
