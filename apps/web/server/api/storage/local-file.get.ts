/**
 * GET /api/storage/local-file?path=entities/entity-id/1234-photo.png
 *
 * Serves a file from the local ~/.nodebook/files/ directory.
 * Used as the URL returned by local-upload.post.ts.
 */

import { createError, defineEventHandler, getQuery, setResponseHeader } from 'h3'
import { readFile, stat } from 'node:fs/promises'
import { join, extname } from 'node:path'
import { homedir } from 'node:os'

const NODEBOOK_FILES_DIR = join(homedir(), '.nodebook', 'files')

/** Best-effort MIME type from extension. Enough for preview purposes. */
function mimeFromExt(ext: string): string {
  const map: Record<string, string> = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.avif': 'image/avif',
    '.pdf': 'application/pdf',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.mov': 'video/quicktime',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.ogg': 'audio/ogg',
    '.flac': 'audio/flac',
    '.txt': 'text/plain',
    '.md': 'text/markdown',
    '.csv': 'text/csv',
    '.json': 'application/json',
    '.xml': 'application/xml',
    '.js': 'text/javascript',
    '.ts': 'text/typescript',
    '.html': 'text/html',
    '.css': 'text/css',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.xls': 'application/vnd.ms-excel',
    '.zip': 'application/zip',
  }
  return map[ext.toLowerCase()] ?? 'application/octet-stream'
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const rawPath = query.path

  if (!rawPath || typeof rawPath !== 'string') {
    throw createError({ statusCode: 400, statusMessage: 'Missing "path" query param' })
  }

  // Decode and sanitize — deny path traversal
  const decoded = decodeURIComponent(rawPath)
  if (decoded.includes('..') || decoded.startsWith('/')) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid path' })
  }

  const absolutePath = join(NODEBOOK_FILES_DIR, decoded)

  try {
    // Confirm the file exists before reading
    await stat(absolutePath)
  } catch {
    throw createError({ statusCode: 404, statusMessage: 'File not found' })
  }

  try {
    const data = await readFile(absolutePath)
    const mime = mimeFromExt(extname(absolutePath))

    setResponseHeader(event, 'Content-Type', mime)
    setResponseHeader(event, 'Content-Length', String(data.length))
    // 1 hour browser cache for local files
    setResponseHeader(event, 'Cache-Control', 'public, max-age=3600')

    return data
  } catch (err: any) {
    console.error('[local-file] Failed to read file:', err?.message || err)
    throw createError({ statusCode: 500, statusMessage: 'Failed to read file' })
  }
})
