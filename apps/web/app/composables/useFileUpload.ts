/**
 * useFileUpload — generic file upload composable (local filesystem).
 */

import type { UploadResult } from '~/types/upload'

export function useFileUpload(entityId?: string) {
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

      const result = await $fetch<UploadResult>('/api/storage/local-upload', {
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
