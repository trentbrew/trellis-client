/**
 * POST /api/storage/local-upload
 *
 * Saves an uploaded file to the local ~/.nodebook/files/ directory for
 * offline/local-mode usage. Returns a /api/storage/local-file URL that the
 * client can use to read the file back.
 *
 * Accepts multipart/form-data with:
 *   - file: The file bytes (required)
 *   - path: Relative sub-path within ~/.nodebook/files (required)
 *
 * Returns: { url, localPath, filename, contentType, size }
 */

import { createError, defineEventHandler, readMultipartFormData } from 'h3'
import { writeFile, mkdir } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { homedir } from 'node:os'

export const NODEBOOK_DIR = join(homedir(), '.nodebook')
export const NODEBOOK_FILES_DIR = join(NODEBOOK_DIR, 'files')

export default defineEventHandler(async (event) => {
  const formData = await readMultipartFormData(event)

  if (!formData || formData.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'No file provided' })
  }

  const filePart = formData.find((p) => p.name === 'file')
  const pathPart = formData.find((p) => p.name === 'path')

  if (!filePart?.data) {
    throw createError({ statusCode: 400, statusMessage: 'Missing "file" field' })
  }

  if (!pathPart?.data) {
    throw createError({ statusCode: 400, statusMessage: 'Missing "path" field' })
  }

  const relativePath = pathPart.data.toString('utf-8')

  // Security: deny path traversal attempts
  if (relativePath.includes('..') || relativePath.startsWith('/')) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid path' })
  }

  const absolutePath = join(NODEBOOK_FILES_DIR, relativePath)
  const dir = dirname(absolutePath)

  try {
    await mkdir(dir, { recursive: true })
    await writeFile(absolutePath, filePart.data)

    const contentType = filePart.type || 'application/octet-stream'
    const filename = filePart.filename || relativePath.split('/').pop() || 'file'
    // Encode the relative path so forward-slashes survive URL transmission
    const encodedPath = encodeURIComponent(relativePath)

    return {
      url: `/api/storage/local-file?path=${encodedPath}`,
      localPath: absolutePath,
      filename,
      contentType,
      size: filePart.data.length,
    }
  } catch (err: any) {
    console.error('[local-upload] Failed to write file:', err?.message || err)
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to save file: ${err?.message || 'Unknown error'}`,
    })
  }
})
