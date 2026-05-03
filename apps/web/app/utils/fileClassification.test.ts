/**
 * fileClassification.test.ts
 *
 * Unit tests for the file classification utility:
 *   - getFileExtension
 *   - classifyFile
 *   - getFileCategoryMeta
 *   - FILE_CATEGORY_META completeness
 */

import { describe, it, expect } from 'vitest'
import {
  getFileExtension,
  classifyFile,
  getFileCategoryMeta,
  FILE_CATEGORY_META,
  type FileCategory,
} from '~/utils/fileClassification'

// ── getFileExtension ───────────────────────────────────────────────────────

describe('getFileExtension', () => {
  it('returns lowercase extension without dot', () => {
    expect(getFileExtension('photo.JPG')).toBe('jpg')
    expect(getFileExtension('report.PDF')).toBe('pdf')
    expect(getFileExtension('style.CSS')).toBe('css')
  })

  it('returns empty string for filenames with no extension', () => {
    expect(getFileExtension('Makefile')).toBe('')
    expect(getFileExtension('')).toBe('')
  })

  it('handles hidden files (dot-first) with no extension', () => {
    expect(getFileExtension('.gitignore')).toBe('')
    expect(getFileExtension('.env')).toBe('')
  })

  it('handles multi-dot filenames — returns last segment', () => {
    expect(getFileExtension('archive.tar.gz')).toBe('gz')
    expect(getFileExtension('my.component.test.ts')).toBe('ts')
  })

  it('handles filenames with only an extension', () => {
    expect(getFileExtension('.ts')).toBe('') // hidden-file rule: dot is first char
  })
})

// ── classifyFile — MIME prefix matching ───────────────────────────────────

describe('classifyFile — MIME prefix matching', () => {
  it.each([
    ['image/png', 'image'],
    ['image/jpeg', 'image'],
    ['image/svg+xml', 'image'],
    ['image/webp', 'image'],
    ['video/mp4', 'video'],
    ['video/webm', 'video'],
    ['audio/mpeg', 'audio'],
    ['audio/ogg', 'audio'],
    ['font/woff2', 'font'],
    ['model/gltf+json', 'model'],
  ] as [string, FileCategory][])('classifies "%s" as %s', (mime, expected) => {
    expect(classifyFile(mime)).toBe(expected)
  })
})

// ── classifyFile — MIME substring matching ────────────────────────────────

describe('classifyFile — MIME substring matching', () => {
  it.each([
    ['application/pdf', 'document'],
    ['application/msword', 'document'],
    ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'document'],
    ['application/epub+zip', 'document'],
    ['application/vnd.ms-excel', 'spreadsheet'],
    ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'spreadsheet'],
    ['application/vnd.ms-powerpoint', 'presentation'],
    ['application/vnd.openxmlformats-officedocument.presentationml.presentation', 'presentation'],
    ['text/javascript', 'code'],
    ['application/typescript', 'code'],
    ['application/json', 'data'],
    ['application/xml', 'data'],
    ['text/csv', 'data'],
    ['application/zip', 'archive'],
    ['application/x-tar', 'archive'],
    ['application/gzip', 'archive'],
  ] as [string, FileCategory][])('classifies "%s" as %s', (mime, expected) => {
    expect(classifyFile(mime)).toBe(expected)
  })
})

// ── classifyFile — extension fallback ─────────────────────────────────────

describe('classifyFile — extension fallback for generic MIME types', () => {
  it.each([
    ['application/octet-stream', 'photo.png', 'image'],
    ['application/octet-stream', 'video.mp4', 'video'],
    ['application/octet-stream', 'component.vue', 'code'],
    ['application/octet-stream', 'data.csv', 'data'],
    ['application/octet-stream', 'archive.zip', 'archive'],
    ['application/octet-stream', 'font.woff2', 'font'],
    ['application/octet-stream', 'model.glb', 'model'],
    ['text/plain', 'README.md', 'document'],
    ['text/plain', 'main.py', 'code'],
  ] as [string, string, FileCategory][])('classifies "%s" + "%s" as %s', (mime, filename, expected) => {
    expect(classifyFile(mime, filename)).toBe(expected)
  })
})

// ── classifyFile — text/* fallback ────────────────────────────────────────

describe('classifyFile — text/* generic fallback', () => {
  it('returns "document" for unrecognized text/* types', () => {
    expect(classifyFile('text/x-unknown-format')).toBe('document')
  })
})

// ── classifyFile — unknown fallback ───────────────────────────────────────

describe('classifyFile — unknown fallback', () => {
  it('returns "other" for completely unknown MIME and no filename', () => {
    // Use a MIME that contains no substrings that map to a category
    // (avoid 'x-c' which matches the 'code' category)
    expect(classifyFile('application/vnd.unknown-format')).toBe('other')
    expect(classifyFile('application/octet-stream-foobar')).toBe('other')
  })

  it('returns "other" for empty MIME and no filename', () => {
    expect(classifyFile('')).toBe('other')
  })

  it('returns "other" for undefined inputs', () => {
    expect(classifyFile()).toBe('other')
  })
})

// ── classifyFile — case insensitivity ──────────────────────────────────────

describe('classifyFile — case insensitivity', () => {
  it('handles uppercase MIME types', () => {
    expect(classifyFile('IMAGE/PNG')).toBe('image')
    expect(classifyFile('APPLICATION/PDF')).toBe('document')
  })

  it('handles uppercase filenames for extension fallback', () => {
    expect(classifyFile('application/octet-stream', 'photo.PNG')).toBe('image')
  })
})

// ── FILE_CATEGORY_META completeness ───────────────────────────────────────

describe('FILE_CATEGORY_META', () => {
  const categories: FileCategory[] = [
    'image', 'video', 'audio', 'document', 'spreadsheet',
    'presentation', 'code', 'archive', 'font', 'model', 'data', 'other',
  ]

  it.each(categories)('has complete metadata entry for "%s"', (cat) => {
    const meta = FILE_CATEGORY_META[cat]
    expect(meta).toBeDefined()
    expect(meta.label).toBeTruthy()
    expect(meta.icon).toMatch(/^lucide:/)
    expect(meta.color).toBeTruthy()
  })
})

// ── getFileCategoryMeta ────────────────────────────────────────────────────

describe('getFileCategoryMeta', () => {
  it('returns the correct meta for a known category', () => {
    const meta = getFileCategoryMeta('image')
    expect(meta.label).toBe('Image')
    expect(meta.icon).toBe('lucide:image')
    expect(meta.color).toBe('purple')
  })

  it('falls back to "other" for unknown categories', () => {
    // @ts-expect-error — intentionally passing invalid value to test fallback
    const meta = getFileCategoryMeta('nonexistent-category')
    expect(meta).toBe(FILE_CATEGORY_META.other)
  })
})

// ── Integration: classify + meta pipeline ─────────────────────────────────

describe('classify + meta pipeline', () => {
  it('correctly classifies a PDF and retrieves its meta', () => {
    const cat = classifyFile('application/pdf', 'report.pdf')
    expect(cat).toBe('document')
    const meta = getFileCategoryMeta(cat)
    expect(meta.label).toBe('Document')
    expect(meta.color).toBe('red')
  })

  it('correctly classifies a TypeScript file and retrieves its meta', () => {
    const cat = classifyFile('text/plain', 'utils.ts')
    expect(cat).toBe('code')
    const meta = getFileCategoryMeta(cat)
    expect(meta.label).toBe('Code')
  })

  it('correctly classifies a XLSX spreadsheet and retrieves its meta', () => {
    const cat = classifyFile(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'data.xlsx',
    )
    expect(cat).toBe('spreadsheet')
    const meta = getFileCategoryMeta(cat)
    expect(meta.label).toBe('Spreadsheet')
    expect(meta.color).toBe('green')
  })
})
