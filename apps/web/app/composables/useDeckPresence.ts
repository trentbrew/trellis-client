import { initialsForName } from '~/lib/presence/identity'
import { useZonePresence } from '~/composables/useZonePresence'

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

/** Zone-keyed presence for decks (ADR-002 D3) — same room as shell/header. */
export function useDeckPresence(_deckId: MaybeRef<string>) {
  const { peers, enabled } = useZonePresence()

  const viewers = computed<DeckViewer[]>(() => {
    if (!enabled.value) {
      return [{ id: 'local', label: 'TB', self: true }]
    }
    return peers.value.map((p) => ({
      id: p.id,
      label: p.initials || initialsForName(p.name),
      self: p.self,
    }))
  })

  return { viewers }
}
