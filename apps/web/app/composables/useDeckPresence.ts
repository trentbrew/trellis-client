export type DeckViewer = {
  id: string
  label: string
  self: boolean
}

export type RemoteCursor = {
  xPct: number
  yPct: number
  label: string
}

/** Lightweight presence stub — local viewer only until realtime presence ships. */
export function useDeckPresence(_deckId: MaybeRef<string>) {
  const viewers = ref<DeckViewer[]>([{ id: 'local', label: 'TB', self: true }])

  return { viewers }
}
