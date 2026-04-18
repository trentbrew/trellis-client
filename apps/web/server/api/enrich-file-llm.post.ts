/**
 * POST /api/enrich-file-llm
 *
 * Uses Gemini 2.0 Flash (via GEMINI_API_KEY) to generate semantic metadata
 * for a file entity based on its category, name, and optional content preview.
 *
 * Body:
 *   {
 *     filename: string          // original filename or title
 *     fileCategory: FileCategory
 *     fileExtension?: string
 *     mimeType?: string
 *     sizeBytes?: number
 *     contentPreview?: string   // first ~2000 chars of text content for code/docs/csv
 *   }
 *
 * Response:
 *   {
 *     name?: string             // cleaned up display name
 *     description?: string      // 1-3 sentence AI-generated description
 *     aiTags?: string[]
 *     // category-specific fields:
 *     [key: string]: any
 *   }
 */

import { GoogleGenerativeAI } from '@google/generative-ai'

type FileCategory =
  | 'image' | 'video' | 'audio' | 'document' | 'spreadsheet'
  | 'presentation' | 'code' | 'archive' | 'font' | 'model' | 'data' | 'other'

/** Per-category field schemas returned by the model */
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

const SYSTEM_PROMPT = `You are a file metadata assistant. Given a filename and category, generate concise, factual metadata for that file. Return ONLY valid JSON — no markdown, no code fences. Use empty string for unknown fields. Never fabricate, guess, or hallucinate.`

function buildPrompt(body: {
  filename: string
  fileCategory: FileCategory
  fileExtension?: string
  mimeType?: string
  sizeBytes?: number
  contentPreview?: string
}): string {
  const fields = CATEGORY_FIELDS[body.fileCategory] || ['description']
  const schemaStr = fields.map((f) => `"${f}":""`).join(', ')

  const ctx: string[] = []
  ctx.push(`Filename: "${body.filename}"`)
  ctx.push(`Category: ${body.fileCategory}`)
  if (body.fileExtension) ctx.push(`Extension: .${body.fileExtension}`)
  if (body.mimeType) ctx.push(`MIME type: ${body.mimeType}`)
  if (body.sizeBytes) ctx.push(`Size: ${(body.sizeBytes / 1024).toFixed(1)} KB`)
  if (body.contentPreview) {
    ctx.push(`\nContent preview (first ~2000 chars):\n"""\n${body.contentPreview.slice(0, 2000)}\n"""`)
  }

  return `${ctx.join('\n')}

Generate metadata. Return ONLY this JSON (fill in all known fields):
{${schemaStr}, "name":"<cleaned display name without extension>", "aiTags":["tag1","tag2","tag3"]}

Rules:
- name: clean display name inferred from filename (no extension, no underscores/dashes unless meaningful)
- description: 1–3 factual sentences. For code files, describe what the code does. For data files, describe what the data represents.
- aiTags: 3–6 lowercase topical tags relevant to the file's content/purpose.
- If you cannot determine a field from the filename alone, return an empty string.
- Never fabricate content you cannot reasonably infer.`
}

function parseResponse(raw: string, allowedFields: string[]): Record<string, any> {
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

  // Always include these universal fields
  for (const key of [...allowedFields, 'name', 'aiTags']) {
    const val = parsed[key]
    if (key === 'aiTags') {
      if (Array.isArray(val) && val.length) {
        result.aiTags = val.filter((t: any) => typeof t === 'string' && t.trim()).map((t: string) => t.trim().toLowerCase())
      }
    } else if (typeof val === 'string' && val.trim().length > 0) {
      result[key] = val.trim()
    }
  }

  return result
}

export default defineEventHandler(async (event) => {
  const body = (await readBody(event)) as {
    filename?: string
    fileCategory?: FileCategory
    fileExtension?: string
    mimeType?: string
    sizeBytes?: number
    contentPreview?: string
  }

  if (!body?.filename) {
    throw createError({ statusCode: 400, message: '"filename" is required' })
  }

  const category: FileCategory = (body.fileCategory as FileCategory) || 'other'
  const allowedFields = CATEGORY_FIELDS[category] || ['description']

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw createError({ statusCode: 500, message: 'GEMINI_API_KEY not configured' })
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      systemInstruction: SYSTEM_PROMPT,
    })

    const prompt = buildPrompt({
      filename: body.filename.trim().slice(0, 200),
      fileCategory: category,
      fileExtension: body.fileExtension,
      mimeType: body.mimeType,
      sizeBytes: body.sizeBytes,
      contentPreview: body.contentPreview,
    })

    const result = await model.generateContent(prompt)
    const raw = result.response.text()

    return parseResponse(raw, allowedFields)
  } catch (err: any) {
    throw createError({
      statusCode: 502,
      message: `File enrichment failed: ${err?.message || String(err)}`,
    })
  }
})
