/**
 * POST /api/transcribe-audio
 *
 * Transcribes uploaded audio via Gemini 2.0 Flash (inline audio part).
 *
 * Accepts multipart/form-data:
 *   - file: audio bytes (webm, wav, mp3, etc.)
 *   - durationSeconds: optional hint
 *
 * Response: { transcript: string, durationSeconds?: number, model: string }
 */

import { GoogleGenerativeAI } from '@google/generative-ai'
import { createError, defineEventHandler, readMultipartFormData } from 'h3'

const MODEL = 'gemini-2.0-flash'
const SYSTEM_PROMPT =
  'Transcribe the audio verbatim. Preserve paragraph breaks where the speaker pauses. Return only the transcript text with no preamble, labels, or markdown.'

const ALLOWED_MIME_PREFIXES = ['audio/', 'video/webm']

function isAllowedMime(mime: string): boolean {
  return ALLOWED_MIME_PREFIXES.some((p) => mime.startsWith(p))
}

export default defineEventHandler(async (event) => {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw createError({
      statusCode: 503,
      message: 'GEMINI_API_KEY not configured',
    })
  }

  const formData = await readMultipartFormData(event)
  if (!formData?.length) {
    throw createError({ statusCode: 400, message: 'No audio file provided' })
  }

  const filePart = formData.find((p) => p.name === 'file')
  const durationPart = formData.find((p) => p.name === 'durationSeconds')

  if (!filePart?.data?.length) {
    throw createError({ statusCode: 400, message: 'Missing "file" field' })
  }

  const mimeType = filePart.type || 'audio/webm'
  if (!isAllowedMime(mimeType)) {
    throw createError({ statusCode: 400, message: `Unsupported audio type: ${mimeType}` })
  }

  const durationSeconds = durationPart?.data
    ? Number.parseInt(durationPart.data.toString('utf-8'), 10)
    : undefined

  const base64 = Buffer.from(filePart.data).toString('base64')

  try {
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({
      model: MODEL,
      systemInstruction: SYSTEM_PROMPT,
    })

    const result = await model.generateContent([
      { inlineData: { mimeType, data: base64 } },
      { text: 'Transcribe this audio.' },
    ])

    const transcript = result.response.text().trim()
    if (!transcript) {
      throw createError({ statusCode: 422, message: 'Transcription returned empty text' })
    }

    return {
      transcript,
      durationSeconds: Number.isFinite(durationSeconds) ? durationSeconds : undefined,
      model: MODEL,
    }
  } catch (err: unknown) {
    if ((err as { statusCode?: number })?.statusCode) throw err
    throw createError({
      statusCode: 502,
      message: `Transcription failed: ${(err as Error)?.message || String(err)}`,
    })
  }
})
