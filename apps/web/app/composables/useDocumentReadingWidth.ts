import { docColumnClass } from '~/lib/document-chrome'

const STORAGE_KEY = 'trellis:document-reading-full-width'

/**
 * Toggle between narrow (720px) and full-width reading columns for notes/pages.
 * Persisted in localStorage.
 */
export function useDocumentReadingWidth() {
  const isFullWidth = useState<boolean>('documentReading:fullWidth', () => false)

  if (import.meta.client) {
    onMounted(() => {
      isFullWidth.value = localStorage.getItem(STORAGE_KEY) === 'true'
    })
  }

  const columnClass = computed(() => docColumnClass(isFullWidth.value))

  function setFullWidth(value: boolean) {
    isFullWidth.value = value
    if (import.meta.client) {
      localStorage.setItem(STORAGE_KEY, String(value))
    }
  }

  function toggleFullWidth() {
    setFullWidth(!isFullWidth.value)
  }

  return {
    isFullWidth,
    columnClass,
    setFullWidth,
    toggleFullWidth,
  }
}
