import imageCompression from 'browser-image-compression'

export interface UploadResult {
  url: string
  path: string
  filename: string
  contentType: string
  size: number
}

/**
 * Composable for uploading images to storage (local filesystem or base64 fallback).
 */
export function useImageUpload(entityId?: string) {
  const isUploading = ref(false)
  const uploadError = ref<string | null>(null)

  const compressionOptions = {
    maxSizeMB: 2,
    maxWidthOrHeight: 2048,
    useWebWorker: true,
    fileType: 'image/webp' as const,
  }

  /**
   * Compress an image file before upload.
   */
  async function compressImage(file: File): Promise<File> {
    try {
      // Skip compression for small files (< 500KB) and SVGs
      if (file.size < 500 * 1024 || file.type === 'image/svg+xml') {
        return file
      }
      return await imageCompression(file, compressionOptions)
    } catch (err) {
      console.warn('[useImageUpload] Compression failed, using original:', err)
      return file
    }
  }

  /**
   * Generate a scoped storage path for the image.
   */
  function buildStoragePath(filename: string): string {
    const timestamp = Date.now()
    const sanitized = filename.replace(/[^a-zA-Z0-9._-]/g, '_')
    const scope = entityId || 'unscoped'
    return `entities/${scope}/${timestamp}-${sanitized}`
  }

  /**
   * Upload an image file. Returns the URL and metadata.
   */
  async function uploadImage(file: File): Promise<UploadResult> {
    isUploading.value = true
    uploadError.value = null

    try {
      const compressed = await compressImage(file)
      return await toBase64(compressed)
    } catch (err: any) {
      const message = err?.message || err?.data?.message || 'Upload failed'
      uploadError.value = message
      throw new Error(message)
    } finally {
      isUploading.value = false
    }
  }

  return {
    uploadImage,
    compressImage,
    isUploading,
    uploadError,
  }
}

/**
 * Convert a File to a base64 data URL result (for local mode).
 */
function toBase64(file: File): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      resolve({
        url: reader.result as string,
        path: `local/${file.name}`,
        filename: file.name,
        contentType: file.type,
        size: file.size,
      })
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}
