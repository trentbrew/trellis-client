/** Built-in card-face property keys that EntityCard knows how to render (P0). */
export const CARD_PROPERTY_KEYS = [
  'type',
  'status',
  'priority',
  'description',
  'date',
  'tags',
  'recurrence',
  'subtitle',
  'contact',
  'fileSize',
] as const

export type CardPropertyKey = (typeof CARD_PROPERTY_KEYS)[number]

export interface CardPropertyOption {
  key: CardPropertyKey
  label: string
  /** Title is always shown on cards — not listed in the popover. */
}

export const CARD_PROPERTY_OPTIONS: CardPropertyOption[] = [
  { key: 'type', label: 'Type' },
  { key: 'status', label: 'Status' },
  { key: 'priority', label: 'Priority' },
  { key: 'description', label: 'Description' },
  { key: 'date', label: 'Date' },
  { key: 'tags', label: 'Tags' },
  { key: 'recurrence', label: 'Recurrence' },
  { key: 'subtitle', label: 'Subtitle' },
  { key: 'contact', label: 'Contact' },
  { key: 'fileSize', label: 'File size' },
]

export const DEFAULT_CARD_VISIBLE: CardPropertyKey[] = [...CARD_PROPERTY_KEYS]

export interface CardPropertyVisibilityState {
  visible: CardPropertyKey[]
  showEmpty: boolean
}

export function normalizeVisibleKeys(keys: string[] | null | undefined): CardPropertyKey[] {
  if (!keys?.length) return [...DEFAULT_CARD_VISIBLE]
  const allowed = new Set<string>(CARD_PROPERTY_KEYS)
  const normalized = keys.filter((k): k is CardPropertyKey => allowed.has(k))
  return normalized.length ? normalized : [...DEFAULT_CARD_VISIBLE]
}

export function loadCardPropertyVisibility(storageKey: string): CardPropertyVisibilityState {
  const fallback: CardPropertyVisibilityState = {
    visible: [...DEFAULT_CARD_VISIBLE],
    showEmpty: false,
  }
  if (!import.meta.client) return fallback
  try {
    const raw = window.localStorage.getItem(`browse:card-props:${storageKey}`)
    if (!raw) return fallback
    const parsed = JSON.parse(raw) as Partial<CardPropertyVisibilityState>
    return {
      visible: normalizeVisibleKeys(parsed.visible),
      showEmpty: !!parsed.showEmpty,
    }
  } catch {
    return fallback
  }
}

export function saveCardPropertyVisibility(storageKey: string, state: CardPropertyVisibilityState) {
  if (!import.meta.client) return
  try {
    window.localStorage.setItem(`browse:card-props:${storageKey}`, JSON.stringify(state))
  } catch {
    // ignore quota / private mode
  }
}

export function toggleCardPropertyKey(visible: CardPropertyKey[], key: CardPropertyKey, on: boolean): CardPropertyKey[] {
  const set = new Set(visible)
  if (on) set.add(key)
  else set.delete(key)
  return CARD_PROPERTY_KEYS.filter((k) => set.has(k))
}

export function moveCardPropertyKey(visible: CardPropertyKey[], key: CardPropertyKey, direction: -1 | 1): CardPropertyKey[] {
  const idx = visible.indexOf(key)
  if (idx < 0) return visible
  const next = idx + direction
  if (next < 0 || next >= visible.length) return visible
  const copy = [...visible]
  const [item] = copy.splice(idx, 1)
  copy.splice(next, 0, item!)
  return copy
}

export function isCardPropertyVisible(
  visible: CardPropertyKey[] | null | undefined,
  key: CardPropertyKey,
): boolean {
  if (visible == null) return true
  return visible.includes(key)
}
