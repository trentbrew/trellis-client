import { toast } from 'vue-sonner'
import type { EntityType } from '~/types/entity'

export interface DroppedFile {
  file: File
  preview?: string
}

export interface DropResult {
  type: 'file' | 'url' | 'text'
  files?: DroppedFile[]
  url?: string
  text?: string
}

function detectDropType(dataTransfer: DataTransfer): DropResult | null {
  const items = Array.from(dataTransfer.items || [])

  if (items.length === 0) return null

  // Skip internal app drags (e.g. calendar event reschedule).
  if (items.some((item) => item.type.startsWith('application/x-trellis-'))) {
    return null
  }

  const hasFiles = items.some((item) => item.kind === 'file')
  if (hasFiles) {
    const files: DroppedFile[] = []
    for (const item of items) {
      if (item.kind === 'file') {
        const file = item.getAsFile()
        if (file) {
          const preview = file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined
          files.push({ file, preview })
        }
      }
    }
    if (files.length > 0) {
      return { type: 'file', files }
    }
  }

  const textItems = items.filter((item) => item.type === 'text/plain')
  if (textItems.length > 0) {
    const text = dataTransfer.getData('text/plain')
    if (text) {
      if (_looksLikeUrl(text)) {
        return { type: 'url', url: text.trim() }
      }
      return { type: 'text', text }
    }
  }

  const urlItems = items.filter(
    (item) => item.type === 'text/uri-list' || item.type === 'text/x-moz-url' || item.type === 'application/x-moz-url',
  )
  if (urlItems.length > 0) {
    const url = dataTransfer.getData('URL') || dataTransfer.getData('text/uri-list')?.split('\n')[0]
    if (url?.trim()) {
      return { type: 'url', url: url.trim() }
    }
  }

  const html = dataTransfer.getData('text/html')
  if (html) {
    const match = html.match(/https?:\/\/[^\s<>"]+/)
    if (match) {
      return { type: 'url', url: match[0] }
    }
  }

  return null
}

function _looksLikeUrl(text: string): boolean {
  return /^https?:\/\/[^\s<>"]+/.test(text.trim())
}

function _inferEntityType(result: DropResult): EntityType {
  switch (result.type) {
    case 'file':
      return 'file'
    case 'url':
      return 'bookmark'
    default:
      return 'note'
  }
}

function _getFileMimeType(file: File): string {
  return file.type || 'application/octet-stream'
}

function _getFileExtension(file: File): string {
  const name = file.name
  const idx = name.lastIndexOf('.')
  return idx > 0 ? name.slice(idx + 1).toLowerCase() : ''
}

function _generateEntityTitle(result: DropResult, index = 0): string {
  const now = new Date()
  const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

  switch (result.type) {
    case 'file': {
      const file = result.files![index]?.file
      if (file) {
        const name = file.name
        const idx = name.lastIndexOf('.')
        return idx > 0 ? name.slice(0, idx) : name
      }
      return `File ${dateStr}`
    }
    case 'url':
      try {
        const url = new URL(result.url!)
        const host = url.hostname.replace('www.', '')
        return host || 'Bookmark'
      } catch {
        return result.url!.slice(0, 50)
      }
    case 'text': {
      const text = result.text!.trim()
      if (text.length <= 50) return text
      return text.slice(0, 47) + '...'
    }
  }
}

export interface UseGlobalDropZoneOptions {
  enabled?: Ref<boolean> | boolean
  onDrop?: (result: DropResult) => Promise<void>
}

export function useGlobalDropZone(options: UseGlobalDropZoneOptions = {}) {
  const isActive = ref(false)
  const isDragging = ref(false)
  const currentDrop = ref<DropResult | null>(null)

  const dragCounter = { count: 0 }

  function isInternalDrag(dt: DataTransfer | null): boolean {
    if (!dt) return false
    return Array.from(dt.items || []).some((item) => item.type.startsWith('application/x-trellis-'))
  }

  function handleDragEnter(e: DragEvent) {
    if (isInternalDrag(e.dataTransfer)) return
    e.preventDefault()
    e.stopPropagation()
    dragCounter.count++

    const result = e.dataTransfer && detectDropType(e.dataTransfer)
    if (result) {
      isDragging.value = true
      currentDrop.value = result
    }
  }

  function handleDragLeave(e: DragEvent) {
    if (isInternalDrag(e.dataTransfer)) return
    e.preventDefault()
    e.stopPropagation()
    dragCounter.count--

    if (dragCounter.count === 0) {
      isDragging.value = false
      currentDrop.value = null
    }
  }

  function handleDragOver(e: DragEvent) {
    if (isInternalDrag(e.dataTransfer)) return
    e.preventDefault()
    e.stopPropagation()
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'copy'
    }
  }

  async function handleDrop(e: DragEvent) {
    if (isInternalDrag(e.dataTransfer)) return
    e.preventDefault()
    e.stopPropagation()
    dragCounter.count = 0
    isDragging.value = false

    if (!e.dataTransfer) {
      currentDrop.value = null
      return
    }

    const result = detectDropType(e.dataTransfer)
    if (!result) {
      currentDrop.value = null
      return
    }

    isActive.value = true
    currentDrop.value = result

    try {
      if (options.onDrop) {
        await options.onDrop(result)
      }
    } finally {
      setTimeout(() => {
        isActive.value = false
        currentDrop.value = null
      }, 800)
    }
  }

  function setupListeners(target: HTMLElement | Window = window) {
    target.addEventListener('dragenter', handleDragEnter as unknown as EventListener)
    target.addEventListener('dragleave', handleDragLeave as unknown as EventListener)
    target.addEventListener('dragover', handleDragOver as unknown as EventListener)
    target.addEventListener('drop', handleDrop as unknown as EventListener)
  }

  function removeListeners(target: HTMLElement | Window = window) {
    target.removeEventListener('dragenter', handleDragEnter as unknown as EventListener)
    target.removeEventListener('dragleave', handleDragLeave as unknown as EventListener)
    target.removeEventListener('dragover', handleDragOver as unknown as EventListener)
    target.removeEventListener('drop', handleDrop as unknown as EventListener)
  }

  onMounted(() => {
    setupListeners()
  })

  onUnmounted(() => {
    removeListeners()
  })

  return {
    isDragging,
    isActive,
    currentDrop,
  }
}

export interface UseEntityDropZoneOptions {
  onEntityCreated?: (entityId: string, type: EntityType) => void
}

export function useEntityDropZone(options: UseEntityDropZoneOptions = {}) {
  const { create: createEntity, remove: removeEntity } = useTrellisEntities()
  const { uploadFile } = useFileUpload()

  const dropZone = useGlobalDropZone({
    onDrop: async (result) => {
      const entityType = _inferEntityType(result)
      const title = _generateEntityTitle(result)

      try {
        let entityId: string | undefined
        let entityLabel = ''

        switch (result.type) {
          case 'file': {
            const file = result.files![0]?.file
            if (file) {
              // Upload to persistent storage — blob: URLs die after reload,
              // which was the source of the WebKitBlobResource errors.
              const upload = await uploadFile(file)
              entityId = await createEntity({
                type: 'file',
                title,
                mimeType: upload.contentType || _getFileMimeType(file),
                url: upload.url,
                fileName: upload.filename || file.name,
                sizeBytes: upload.size ?? file.size,
              } as any)
              entityLabel = file.name.slice(0, 30)
              break
            }
            return
          }
          case 'url': {
            entityId = await createEntity({
              type: 'bookmark',
              title,
              url: result.url,
            })
            entityLabel = 'bookmark'
            break
          }
          case 'text': {
            entityId = await createEntity({
              type: 'note',
              title,
              content: result.text,
            })
            entityLabel = 'note'
            break
          }
        }

        if (!entityId) return

        toast.success(`Created ${entityLabel}`, {
          description:
            entityType === 'file' ? 'File entity created' : entityType === 'bookmark' ? result.url : title.slice(0, 50),
          action: {
            label: 'Undo',
            onClick: async () => {
              try {
                await removeEntity(entityId!)
              } catch (e) {
                console.error('[useEntityDropZone] Undo failed:', e)
              }
            },
          },
        })

        options.onEntityCreated?.(entityId, entityType)
      } catch (error) {
        console.error('[useEntityDropZone] Failed to create entity:', error)
        toast.error('Failed to create entity', {
          description: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    },
  })

  return dropZone
}
