import { RealtimeText, type RealtimeRoom } from 'trellis/realtime'
import { textDiff } from './text-editing'

type PageTextEntry = {
  doc: RealtimeText
  last: string
  applying: boolean
  unsub: () => void
}

function setDocContent(entry: PageTextEntry, text: string): void {
  const current = entry.doc.toString()
  if (current === text) {
    entry.last = text
    return
  }
  entry.applying = true
  if (current.length > 0) entry.doc.delete(0, current.length)
  if (text.length > 0) entry.doc.insert(0, text)
  entry.last = entry.doc.toString()
  entry.applying = false
}

function pageTextChannel(pageId: string): string {
  return `page-text:${pageId}`
}

/** Live content draft for a page via RealtimeText (presence gossip). */
export function usePageTextSync(
  room: Ref<RealtimeRoom | null>,
  peerId: string,
  pageId: Ref<string>,
) {
  const entryRef = shallowRef<PageTextEntry | null>(null)
  const remoteText = ref('')

  function ensureDoc(id: string): PageTextEntry | null {
    const r = room.value
    if (!r || !id) return null

    if (entryRef.value && entryRef.value.doc) {
      return entryRef.value
    }

    const doc = new RealtimeText({
      peerId,
      room: r,
      channel: pageTextChannel(id),
    })

    const entry: PageTextEntry = {
      doc,
      last: doc.toString(),
      applying: false,
      unsub: doc.onChange((next) => {
        if (entry.applying) return
        entry.last = next
        remoteText.value = next
      }),
    }
    entryRef.value = entry
    remoteText.value = entry.last
    return entry
  }

  watch(
    () => [room.value, pageId.value] as const,
    ([r, id], _prev, onCleanup) => {
      entryRef.value?.unsub()
      entryRef.value = null
      remoteText.value = ''
      if (!r || !id) return

      ensureDoc(id)

      onCleanup(() => {
        entryRef.value?.unsub()
        entryRef.value = null
      })
    },
    { immediate: true },
  )

  function applyLocalEdit(next: string) {
    const entry = ensureDoc(pageId.value)
    if (!entry || entry.applying) return
    const prev = entry.last
    if (prev === next) return
    const { index, removed, inserted } = textDiff(prev, next)
    if (removed > 0) entry.doc.delete(index, removed)
    if (inserted.length > 0) entry.doc.insert(index, inserted)
    entry.last = entry.doc.toString()
  }

  function seedFromGraph(html: string) {
    const entry = ensureDoc(pageId.value)
    if (!entry) return
    setDocContent(entry, html)
    remoteText.value = entry.last
  }

  return {
    remoteText,
    applyLocalEdit,
    seedFromGraph,
  }
}
