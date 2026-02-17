/**
 * POST /api/storage/proxy-upload
 *
 * Server-side proxy that fetches an image from an external URL and uploads it
 * to InstantDB Storage. This bypasses CORS restrictions that would prevent
 * the browser from fetching arbitrary external images.
 *
 * Accepts JSON body:
 *   - url:      The external image URL to fetch (required)
 *   - path:     Storage path, e.g. "entities/{entityId}/{filename}" (required)
 *
 * Returns: { url: string; path: string; filename: string; contentType: string; size: number }
 */

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB
const ALLOWED_CONTENT_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'image/avif',
  'image/bmp',
  'image/tiff',
])

export default defineEventHandler(async (event) => {
  const body = await readBody<{ url?: string; path?: string }>(event)

  if (!body?.url || typeof body.url !== 'string') {
    throw createError({ statusCode: 400, statusMessage: 'Missing "url" field' })
  }
  if (!body?.path || typeof body.path !== 'string') {
    throw createError({ statusCode: 400, statusMessage: 'Missing "path" field' })
  }

  const { url, path: storagePath } = body

  // Validate URL
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    throw createError({ statusCode: 400, statusMessage: 'Invalid URL' })
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw createError({ statusCode: 400, statusMessage: 'URL must use http or https' })
  }

  // Validate storage path
  if (storagePath.includes('..') || storagePath.startsWith('/')) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid storage path' })
  }

  try {
    // Fetch the external image
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Trellis/1.0 (image-proxy)' },
      signal: AbortSignal.timeout(15_000),
    })

    if (!response.ok) {
      throw createError({
        statusCode: 502,
        statusMessage: `External fetch failed: ${response.status} ${response.statusText}`,
      })
    }

    // Validate content type
    const contentType = response.headers.get('content-type')?.split(';')[0]?.trim() || 'application/octet-stream'
    if (!ALLOWED_CONTENT_TYPES.has(contentType)) {
      throw createError({
        statusCode: 415,
        statusMessage: `Unsupported content type: ${contentType}`,
      })
    }

    // Read body as ArrayBuffer, enforce size limit
    const arrayBuffer = await response.arrayBuffer()
    if (arrayBuffer.byteLength > MAX_FILE_SIZE) {
      throw createError({
        statusCode: 413,
        statusMessage: `Image too large: ${(arrayBuffer.byteLength / 1024 / 1024).toFixed(1)}MB exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`,
      })
    }

    const fileBytes = new Uint8Array(arrayBuffer)
    const filename = parsed.pathname.split('/').pop() || 'image'

    // Upload to InstantDB Storage
    const db = useInstantAdmin()
    await db.storage.uploadFile(storagePath, fileBytes, { contentType })
    const downloadUrl = await db.storage.getDownloadUrl(storagePath)

    return {
      url: downloadUrl || '',
      path: storagePath,
      filename,
      contentType,
      size: fileBytes.length,
    }
  } catch (err: any) {
    // Re-throw if already a createError
    if (err.statusCode) throw err

    console.error('[storage/proxy-upload] Failed:', err?.message || err)
    throw createError({
      statusCode: 502,
      statusMessage: `Proxy upload failed: ${err?.message || 'Unknown error'}`,
    })
  }
})
