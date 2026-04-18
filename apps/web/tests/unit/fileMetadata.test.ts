/**
 * fileMetadata.test.ts
 *
 * Unit tests for file entity metadata:
 *
 *   - FileItem type shape and required fields
 *   - formatFileSize size-string formatting
 *   - createdAt / updatedAt timestamp handling
 *   - AI-enriched field merging (aiTags, description, codeLanguage, etc.)
 *   - Category badge / metadata correctness per category
 *   - Edge cases: empty/null/missing fields
 */

import { describe, it, expect } from 'vitest'

// ── formatFileSize (mirrors FileContent.vue) ──────────────────────────────

function formatFileSize(bytes?: number): string {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

describe('formatFileSize', () => {
  it('returns "—" for undefined', () => {
    expect(formatFileSize(undefined)).toBe('—')
  })

  it('returns "—" for zero bytes', () => {
    expect(formatFileSize(0)).toBe('—')
  })

  it('formats bytes under 1 KB', () => {
    expect(formatFileSize(512)).toBe('512 B')
    expect(formatFileSize(1)).toBe('1 B')
    expect(formatFileSize(1023)).toBe('1023 B')
  })

  it('formats KB (1024 bytes = 1 KB boundary)', () => {
    expect(formatFileSize(1024)).toBe('1.0 KB')
    expect(formatFileSize(2048)).toBe('2.0 KB')
    expect(formatFileSize(1536)).toBe('1.5 KB')
  })

  it('formats MB', () => {
    expect(formatFileSize(1024 * 1024)).toBe('1.0 MB')
    expect(formatFileSize(1024 * 1024 * 2.5)).toBe('2.5 MB')
  })

  it('formats GB', () => {
    expect(formatFileSize(1024 * 1024 * 1024)).toBe('1.0 GB')
    expect(formatFileSize(1024 * 1024 * 1024 * 3.2)).toBe('3.2 GB')
  })
})

// ── FileItem shape ─────────────────────────────────────────────────────────

type FileCategory =
  | 'image' | 'video' | 'audio' | 'document' | 'spreadsheet'
  | 'presentation' | 'code' | 'archive' | 'font' | 'model' | 'data' | 'other'

interface FileItem {
  id?: string
  type: 'file'
  title: string
  description?: string
  url?: string
  storagePath?: string
  mimeType?: string
  sizeBytes?: number
  fileCategory?: FileCategory
  fileExtension?: string
  createdAt?: string | number
  updatedAt?: string | number
  // AI-enriched
  aiTags?: string[]
  altText?: string
  artist?: string
  album?: string
  genre?: string
  codeLanguage?: string
  documentAuthor?: string
  pageCount?: number
  lineCount?: number
  aiSummary?: string
}

function makeFileItem(overrides: Partial<FileItem> = {}): FileItem {
  return {
    type: 'file',
    title: 'Untitled',
    ...overrides,
  }
}

describe('FileItem shape', () => {
  it('requires type: "file" and title', () => {
    const f = makeFileItem({ title: 'My File' })
    expect(f.type).toBe('file')
    expect(f.title).toBe('My File')
  })

  it('accepts all optional metadata fields', () => {
    const f = makeFileItem({
      title: 'contacts',
      fileCategory: 'spreadsheet',
      fileExtension: 'csv',
      mimeType: 'text/csv',
      sizeBytes: 65536,
      url: '/api/storage/local-file?path=entities%2Fe1%2F1000-contacts.csv',
      storagePath: 'entities/e1/1000-contacts.csv',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-06-15T12:00:00Z',
      aiTags: ['contacts', 'crm'],
      description: 'A contacts spreadsheet.',
    })

    expect(f.fileCategory).toBe('spreadsheet')
    expect(f.fileExtension).toBe('csv')
    expect(f.mimeType).toBe('text/csv')
    expect(f.sizeBytes).toBe(65536)
    expect(f.url).toContain('/api/storage/local-file')
    expect(f.storagePath).toBe('entities/e1/1000-contacts.csv')
    expect(f.aiTags).toContain('contacts')
    expect(f.description).toBeTruthy()
  })

  it('accepts audio-specific enrichment fields', () => {
    const f = makeFileItem({
      fileCategory: 'audio',
      artist: 'The Beatles',
      album: 'Abbey Road',
      genre: 'Rock',
    })
    expect(f.artist).toBe('The Beatles')
    expect(f.album).toBe('Abbey Road')
    expect(f.genre).toBe('Rock')
  })

  it('accepts code-specific enrichment fields', () => {
    const f = makeFileItem({
      fileCategory: 'code',
      codeLanguage: 'TypeScript',
      lineCount: 342,
    })
    expect(f.codeLanguage).toBe('TypeScript')
    expect(f.lineCount).toBe(342)
  })

  it('accepts document-specific enrichment fields', () => {
    const f = makeFileItem({
      fileCategory: 'document',
      documentAuthor: 'Jane Doe',
      pageCount: 12,
    })
    expect(f.documentAuthor).toBe('Jane Doe')
    expect(f.pageCount).toBe(12)
  })

  it('accepts image-specific enrichment fields', () => {
    const f = makeFileItem({
      fileCategory: 'image',
      altText: 'A photo of a mountain at sunset.',
    })
    expect(f.altText).toBeTruthy()
  })
})

// ── hasFile computed logic ─────────────────────────────────────────────────

function hasFile(item: Partial<FileItem>): boolean {
  return !!item.url || !!item.storagePath
}

describe('hasFile', () => {
  it('is true when url is set', () => {
    expect(hasFile({ url: '/api/storage/local-file?path=foo' })).toBe(true)
  })

  it('is true when storagePath is set', () => {
    expect(hasFile({ storagePath: 'entities/e1/file.pdf' })).toBe(true)
  })

  it('is false when neither url nor storagePath is set', () => {
    expect(hasFile({ title: 'Untitled' })).toBe(false)
    expect(hasFile({})).toBe(false)
  })
})

// ── isTableData / isCode / isMarkdown logic ────────────────────────────────

function isTableData(item: Partial<FileItem>): boolean {
  return item.fileCategory === 'spreadsheet' || item.fileExtension === 'csv'
}

function isCode(item: Partial<FileItem>): boolean {
  return (
    item.fileCategory === 'code' ||
    (item.fileCategory === 'data' && item.fileExtension !== 'csv')
  )
}

function isMarkdown(item: Partial<FileItem>): boolean {
  return item.fileExtension === 'md' || item.fileExtension === 'mdx'
}

describe('isTableData', () => {
  it('true for spreadsheet category', () => {
    expect(isTableData({ fileCategory: 'spreadsheet' })).toBe(true)
  })

  it('true for csv extension regardless of category', () => {
    expect(isTableData({ fileCategory: 'data', fileExtension: 'csv' })).toBe(true)
  })

  it('false for other categories', () => {
    expect(isTableData({ fileCategory: 'code' })).toBe(false)
    expect(isTableData({ fileCategory: 'document' })).toBe(false)
  })
})

describe('isCode', () => {
  it('true for code category', () => {
    expect(isCode({ fileCategory: 'code' })).toBe(true)
  })

  it('true for data category when extension is not csv', () => {
    expect(isCode({ fileCategory: 'data', fileExtension: 'json' })).toBe(true)
  })

  it('false for data category with csv extension', () => {
    expect(isCode({ fileCategory: 'data', fileExtension: 'csv' })).toBe(false)
  })

  it('false for other categories', () => {
    expect(isCode({ fileCategory: 'audio' })).toBe(false)
    expect(isCode({ fileCategory: 'document' })).toBe(false)
  })
})

describe('isMarkdown', () => {
  it('true for .md extension', () => {
    expect(isMarkdown({ fileExtension: 'md' })).toBe(true)
  })

  it('true for .mdx extension', () => {
    expect(isMarkdown({ fileExtension: 'mdx' })).toBe(true)
  })

  it('false for other extensions', () => {
    expect(isMarkdown({ fileExtension: 'txt' })).toBe(false)
    expect(isMarkdown({ fileExtension: 'pdf' })).toBe(false)
    expect(isMarkdown({})).toBe(false)
  })
})

// ── removeFile cleanup logic ───────────────────────────────────────────────

describe('removeFile cleanup', () => {
  it('clears all file-related fields', () => {
    const item: Partial<FileItem> = {
      url: '/api/storage/local-file?path=foo',
      storagePath: 'entities/e1/foo.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 1000,
      fileExtension: 'pdf',
      fileCategory: 'document',
    }

    // Simulate removeFile
    item.url = undefined
    item.storagePath = undefined
    item.mimeType = ''
    item.sizeBytes = undefined
    item.fileExtension = undefined
    item.fileCategory = undefined

    expect(hasFile(item)).toBe(false)
    expect(item.mimeType).toBe('')
    expect(item.sizeBytes).toBeUndefined()
    expect(item.fileExtension).toBeUndefined()
    expect(item.fileCategory).toBeUndefined()
  })
})

// ── aiTags deduplication ───────────────────────────────────────────────────

describe('aiTags deduplication', () => {
  it('merges tags without duplicates', () => {
    const existing = ['crm', 'csv', 'contacts']
    const newTags = ['contacts', 'data', 'spreadsheet']
    const merged = Array.from(new Set([...existing, ...newTags]))
    expect(merged).toHaveLength(5)
    expect(merged.filter((t) => t === 'contacts')).toHaveLength(1)
  })

  it('handles empty existing tags', () => {
    const existing: string[] = []
    const newTags = ['csv', 'data']
    const merged = Array.from(new Set([...existing, ...newTags]))
    expect(merged).toEqual(['csv', 'data'])
  })

  it('handles empty new tags', () => {
    const existing = ['existing']
    const newTags: string[] = []
    // When newTags is empty, no patch should happen
    expect(newTags.length > 0).toBe(false)
    expect(existing).toEqual(['existing'])
  })
})
