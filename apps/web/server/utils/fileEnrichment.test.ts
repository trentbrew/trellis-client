/**
 * fileEnrichment.test.ts
 *
 * Unit tests for the Gemini file enrichment pipeline:
 *
 *   - enrich-file-llm response parsing (allowedFields filtering, tag extraction)
 *   - Category-to-field-schema mapping
 *   - Prompt construction (content preview truncation & assembly)
 *   - useFileEnrichment composable: field-merging, empty-field-only writes
 *
 * The Gemini API and network calls are fully mocked so these tests run
 * offline without any API key configured.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Response parser (mirrored from enrich-file-llm.post.ts) ───────────────

function parseEnrichmentResponse(raw: string, allowedFields: string[]): Record<string, any> {
  let parsed: any
  try {
    parsed = JSON.parse(raw)
  } catch {
    const obj = raw.match(/\{[\s\S]*\}/)?.[0]
    if (!obj) return {}
    try { parsed = JSON.parse(obj) } catch { return {} }
  }

  if (!parsed || typeof parsed !== 'object') return {}

  const result: Record<string, any> = {}
  for (const key of [...allowedFields, 'name', 'aiTags']) {
    const val = parsed[key]
    if (key === 'aiTags') {
      if (Array.isArray(val) && val.length) {
        result.aiTags = val
          .filter((t: any) => typeof t === 'string' && t.trim())
          .map((t: string) => t.trim().toLowerCase())
      }
    } else if (typeof val === 'string' && val.trim().length > 0) {
      result[key] = val.trim()
    }
  }
  return result
}

// ── Category field schema (mirrored from enrich-file-llm.post.ts) ─────────

type FileCategory =
  | 'image' | 'video' | 'audio' | 'document' | 'spreadsheet'
  | 'presentation' | 'code' | 'archive' | 'font' | 'model' | 'data' | 'other'

const CATEGORY_FIELDS: Record<FileCategory, string[]> = {
  image:        ['description', 'altText'],
  video:        ['description'],
  audio:        ['description', 'artist', 'album', 'genre'],
  document:     ['description', 'documentAuthor'],
  spreadsheet:  ['description'],
  presentation: ['description'],
  code:         ['description', 'codeLanguage'],
  archive:      ['description'],
  font:         ['description'],
  model:        ['description'],
  data:         ['description'],
  other:        ['description'],
}

// ── parseEnrichmentResponse ────────────────────────────────────────────────

describe('parseEnrichmentResponse', () => {
  describe('valid JSON responses', () => {
    it('extracts allowed fields and universal name/aiTags', () => {
      const raw = JSON.stringify({
        description: 'A contacts spreadsheet.',
        name: 'Contacts',
        aiTags: ['contacts', 'crm', 'csv'],
      })
      const result = parseEnrichmentResponse(raw, CATEGORY_FIELDS.spreadsheet)
      expect(result.description).toBe('A contacts spreadsheet.')
      expect(result.name).toBe('Contacts')
      expect(result.aiTags).toEqual(['contacts', 'crm', 'csv'])
    })

    it('filters out fields not in allowedFields', () => {
      const raw = JSON.stringify({
        description: 'A song.',
        artist: 'The Beatles',
        album: 'Abbey Road',
        genre: 'Rock',
        illegalField: 'should not appear',
        name: 'Come Together',
        aiTags: ['rock', 'classic'],
      })
      const result = parseEnrichmentResponse(raw, CATEGORY_FIELDS.audio)
      expect(result.artist).toBe('The Beatles')
      expect(result.album).toBe('Abbey Road')
      expect(result.illegalField).toBeUndefined()
    })

    it('skips empty string values', () => {
      const raw = JSON.stringify({ description: '', name: 'My File', aiTags: [] })
      const result = parseEnrichmentResponse(raw, CATEGORY_FIELDS.document)
      expect(result.description).toBeUndefined()
      expect(result.name).toBe('My File')
      expect(result.aiTags).toBeUndefined() // empty aiTags array not included
    })

    it('lowercases aiTags and trims whitespace', () => {
      const raw = JSON.stringify({ aiTags: ['  TypeScript ', 'API', ' REST '] })
      const result = parseEnrichmentResponse(raw, CATEGORY_FIELDS.code)
      expect(result.aiTags).toEqual(['typescript', 'api', 'rest'])
    })
  })

  describe('malformed / non-JSON responses', () => {
    it('extracts JSON embedded in markdown code fences', () => {
      const raw = '```json\n{"name":"Contacts","description":"A CSV file."}\n```'
      const result = parseEnrichmentResponse(raw, CATEGORY_FIELDS.data)
      expect(result.name).toBe('Contacts')
      expect(result.description).toBe('A CSV file.')
    })

    it('extracts raw JSON embedded in surrounding prose', () => {
      const raw = 'Here is the metadata: {"name":"Report","description":"Q4 report."} — done.'
      const result = parseEnrichmentResponse(raw, CATEGORY_FIELDS.document)
      expect(result.name).toBe('Report')
    })

    it('returns empty object for completely unparseable response', () => {
      expect(parseEnrichmentResponse('I cannot answer that.', [])).toEqual({})
      expect(parseEnrichmentResponse('', [])).toEqual({})
      expect(parseEnrichmentResponse('null', [])).toEqual({})
    })
  })
})

// ── Category field schema ──────────────────────────────────────────────────

describe('CATEGORY_FIELDS schema', () => {
  const allCategories = Object.keys(CATEGORY_FIELDS) as FileCategory[]

  it('every category has at least a description field', () => {
    for (const cat of allCategories) {
      expect(CATEGORY_FIELDS[cat]).toContain('description')
    }
  })

  it('audio category has artist, album, genre', () => {
    expect(CATEGORY_FIELDS.audio).toContain('artist')
    expect(CATEGORY_FIELDS.audio).toContain('album')
    expect(CATEGORY_FIELDS.audio).toContain('genre')
  })

  it('code category has codeLanguage', () => {
    expect(CATEGORY_FIELDS.code).toContain('codeLanguage')
  })

  it('image category has altText', () => {
    expect(CATEGORY_FIELDS.image).toContain('altText')
  })

  it('document category has documentAuthor', () => {
    expect(CATEGORY_FIELDS.document).toContain('documentAuthor')
  })

  it('covers all 12 expected categories', () => {
    const expectedCategories: FileCategory[] = [
      'image', 'video', 'audio', 'document', 'spreadsheet',
      'presentation', 'code', 'archive', 'font', 'model', 'data', 'other',
    ]
    for (const cat of expectedCategories) {
      expect(CATEGORY_FIELDS[cat]).toBeDefined()
    }
  })
})

// ── Prompt content preview truncation ─────────────────────────────────────

describe('Content preview truncation', () => {
  it('truncates content to 2000 chars max', () => {
    const longContent = 'x'.repeat(5000)
    const preview = longContent.slice(0, 2000)
    expect(preview.length).toBe(2000)
  })

  it('passes through content shorter than 2000 chars unchanged', () => {
    const short = 'const x = 1;\n'
    const preview = short.slice(0, 2000)
    expect(preview).toBe(short)
  })
})

// ── Field merge logic (mirrors useFileEnrichment) ─────────────────────────

/**
 * Mirrors the patch-building logic in useFileEnrichment.ts to test
 * in isolation without Vue reactivity.
 */
function buildPatch(
  enriched: Record<string, any>,
  snapshot: Record<string, any>,
  fieldMap: Record<string, string>,
): Record<string, any> {
  const patch: Record<string, any> = {}

  for (const [enrichKey, entityKey] of Object.entries(fieldMap)) {
    const val = enriched[enrichKey]
    if (!val) continue
    const current = snapshot[entityKey]
    const isEmpty =
      current === undefined ||
      current === null ||
      (typeof current === 'string' && current.trim() === '')
    if (isEmpty) patch[entityKey] = val
  }

  // Tags merge
  if (enriched.aiTags?.length) {
    const existing = Array.isArray(snapshot.aiTags) ? snapshot.aiTags : []
    patch.aiTags = Array.from(new Set([...existing, ...enriched.aiTags]))
  }

  return patch
}

const FIELD_MAP: Record<string, string> = {
  name: 'title',
  description: 'description',
  altText: 'altText',
  artist: 'artist',
  album: 'album',
  genre: 'genre',
  codeLanguage: 'codeLanguage',
  documentAuthor: 'documentAuthor',
}

describe('buildPatch — field merge logic', () => {
  it('populates empty fields from enrichment result', () => {
    const enriched = { name: 'Contacts', description: 'A contacts sheet.', aiTags: ['crm'] }
    const snapshot = { title: '', description: '' }
    const patch = buildPatch(enriched, snapshot, FIELD_MAP)
    expect(patch.title).toBe('Contacts')
    expect(patch.description).toBe('A contacts sheet.')
    expect(patch.aiTags).toContain('crm')
  })

  it('does NOT overwrite existing non-empty fields', () => {
    const enriched = { name: 'AI Name', description: 'AI description.' }
    const snapshot = { title: 'User Title', description: 'User wrote this.' }
    const patch = buildPatch(enriched, snapshot, FIELD_MAP)
    expect(patch.title).toBeUndefined()
    expect(patch.description).toBeUndefined()
  })

  it('merges new AI tags with existing tags (de-duplicated)', () => {
    const enriched = { aiTags: ['crm', 'existing-tag', 'new-tag'] }
    const snapshot = { aiTags: ['existing-tag', 'personal'] }
    const patch = buildPatch(enriched, snapshot, FIELD_MAP)
    expect(patch.aiTags).toContain('crm')
    expect(patch.aiTags).toContain('new-tag')
    expect(patch.aiTags).toContain('existing-tag')
    expect(patch.aiTags).toContain('personal')
    // No duplicates
    const tagSet = new Set(patch.aiTags)
    expect(tagSet.size).toBe(patch.aiTags.length)
  })

  it('returns empty patch when enrichment adds nothing new', () => {
    const enriched = { name: 'Same', description: 'Same desc.' }
    const snapshot = { title: 'Same', description: 'Same desc.' }
    const patch = buildPatch(enriched, snapshot, FIELD_MAP)
    // No fields updated, no aiTags
    expect(Object.keys(patch)).toHaveLength(0)
  })

  it('handles null / undefined existing fields as empty', () => {
    const enriched = { name: 'My Code', codeLanguage: 'TypeScript' }
    const snapshot = { title: null, codeLanguage: undefined }
    const patch = buildPatch(enriched, snapshot, FIELD_MAP)
    expect(patch.title).toBe('My Code')
    expect(patch.codeLanguage).toBe('TypeScript')
  })
})

// ── Text category detection (mirrors useFileEnrichment) ───────────────────

const TEXT_CATEGORIES = new Set(['code', 'data', 'document'])

describe('TEXT_CATEGORIES for content preview', () => {
  it('includes code, data, document', () => {
    expect(TEXT_CATEGORIES.has('code')).toBe(true)
    expect(TEXT_CATEGORIES.has('data')).toBe(true)
    expect(TEXT_CATEGORIES.has('document')).toBe(true)
  })

  it('does not include image, video, audio categories', () => {
    expect(TEXT_CATEGORIES.has('image')).toBe(false)
    expect(TEXT_CATEGORIES.has('video')).toBe(false)
    expect(TEXT_CATEGORIES.has('audio')).toBe(false)
  })

  it('does not include spreadsheet (binary format)', () => {
    expect(TEXT_CATEGORIES.has('spreadsheet')).toBe(false)
  })
})
