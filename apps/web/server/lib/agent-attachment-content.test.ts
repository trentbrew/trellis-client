import { describe, expect, it } from 'vitest'
import {
  buildUserMessageContent,
  isTextLikeAttachment,
  parseLocalStoragePath,
} from './agent-attachment-content'

describe('parseLocalStoragePath', () => {
  it('extracts encoded storage path from local-file URLs', () => {
    expect(parseLocalStoragePath('/api/storage/local-file?path=entities%2Fagent%2Fnote.md'))
      .toBe('entities/agent/note.md')
  })
})

describe('isTextLikeAttachment', () => {
  it('detects markdown and json', () => {
    expect(isTextLikeAttachment('application/octet-stream', 'plan.md')).toBe(true)
    expect(isTextLikeAttachment('application/json', 'data.json')).toBe(true)
    expect(isTextLikeAttachment('application/pdf', 'doc.pdf')).toBe(false)
  })
})

describe('buildUserMessageContent', () => {
  it('returns plain text when no attachments', async () => {
    await expect(buildUserMessageContent('hello')).resolves.toBe('hello')
  })

  it('builds multimodal content for data-url images', async () => {
    const content = await buildUserMessageContent('what is this?', [{
      url: 'data:image/png;base64,abc',
      filename: 'shot.png',
      contentType: 'image/png',
      size: 3,
      kind: 'image',
    }])

    expect(content).toEqual([
      { type: 'text', text: 'what is this?' },
      { type: 'image_url', image_url: { url: 'data:image/png;base64,abc' } },
    ])
  })

  it('inlines text file metadata for non-image attachments', async () => {
    const content = await buildUserMessageContent('', [{
      url: 'data:text/plain,hello%20world',
      filename: 'note.txt',
      contentType: 'text/plain',
      size: 11,
      kind: 'file',
    }])

    expect(content).toBe('--- note.txt ---\nhello world')
  })
})
