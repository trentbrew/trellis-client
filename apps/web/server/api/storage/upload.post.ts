/**
 * POST /api/storage/upload
 *
 * Server-side proxy for uploading files to InstantDB Storage.
 * Uses the Admin SDK so the client never needs raw storage credentials.
 *
 * Accepts multipart/form-data with:
 *   - file: The file to upload (required)
 *   - path: Storage path, e.g. "entities/{entityId}/{filename}" (required)
 *
 * Returns: { url: string; path: string }
 */

export default defineEventHandler(async (event) => {
  const formData = await readMultipartFormData(event)

  if (!formData || formData.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'No file provided' })
  }

  const filePart = formData.find((p) => p.name === 'file')
  const pathPart = formData.find((p) => p.name === 'path')

  if (!filePart || !filePart.data) {
    throw createError({ statusCode: 400, statusMessage: 'Missing "file" field' })
  }

  if (!pathPart || !pathPart.data) {
    throw createError({ statusCode: 400, statusMessage: 'Missing "path" field' })
  }

  const storagePath = pathPart.data.toString('utf-8')
  const contentType = filePart.type || 'application/octet-stream'
  const filename = filePart.filename || 'upload'

  // Validate path format
  if (!storagePath || storagePath.includes('..') || storagePath.startsWith('/')) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid storage path' })
  }

  try {
    const db = useInstantAdmin()

    // Upload to InstantDB Storage via Admin SDK
    // The admin SDK accepts Buffer | Uint8Array | Readable | ReadableStream
    const fileBytes = new Uint8Array(filePart.data)

    await db.storage.uploadFile(storagePath, fileBytes, { contentType })

    // Query the uploaded file to get the download URL
    const downloadUrl = await db.storage.getDownloadUrl(storagePath)

    return {
      url: downloadUrl || '',
      path: storagePath,
      filename,
      contentType,
      size: fileBytes.length,
    }
  } catch (err: any) {
    console.error('[storage/upload] Upload failed:', err?.message || err)
    throw createError({
      statusCode: 500,
      statusMessage: `Upload failed: ${err?.message || 'Unknown error'}`,
    })
  }
})
