/**
 * useFileUpload — generic file upload composable.
 *
 * - **Local mode**: POSTs to `/api/storage/local-upload` → writes to ~/.nodebook/files/
 *   Returns a stable `/api/storage/local-file?path=...` URL that survives page refreshes.
 *
 * - **Cloud mode**: POSTs to `/api/storage/upload` → InstantDB Storage.
 *   Returns the InstantDB CDN URL.
 */

export interface UploadResult {
  url: string
  path: string
  filename: string
  contentType: string
  size: number
}

export function useFileUpload(entityId?: string) {
  const adapter = useDataAdapter()
  const isUploading = ref(false)
  const uploadError = ref<string | null>(null)

  function buildPath(filename: string): string {
    const timestamp = Date.now()
    const sanitized = filename.replace(/[^a-zA-Z0-9._-]/g, '_')
    const scope = entityId || 'unscoped'
    return `entities/${scope}/${timestamp}-${sanitized}`
  }

  async function uploadFile(file: File): Promise<UploadResult> {
    isUploading.value = true
    uploadError.value = null

    try {
      const storagePath = buildPath(file.name)
      const formData = new FormData()
      formData.append('file', file, file.name)
      formData.append('path', storagePath)

      if (adapter.mode === 'local') {
        // Store on local filesystem — returns a /api/storage/local-file URL
        const result = await $fetch<UploadResult>('/api/storage/local-upload', {
          method: 'POST',
          body: formData,
        })
        return result
      }

      // Cloud mode → InstantDB Storage
      const result = await $fetch<UploadResult>('/api/storage/upload', {
        method: 'POST',
        body: formData,
      })
      return result
    } catch (err: any) {
      const message = err?.data?.message || err?.message || 'Upload failed'
      uploadError.value = message
      throw new Error(message)
    } finally {
      isUploading.value = false
    }
  }

  return { uploadFile, isUploading, uploadError }
}
