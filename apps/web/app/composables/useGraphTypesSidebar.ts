import { getEntityTypeConfig } from '~/config/entityRegistry'
import type { EntityType } from '~/types/entity'

const COLOR_HEX: Record<string, string> = {
  slate: '#64748b',
  gray: '#6b7280',
  zinc: '#71717a',
  neutral: '#737373',
  stone: '#78716c',
  red: '#ef4444',
  orange: '#f97316',
  amber: '#f59e0b',
  yellow: '#eab308',
  lime: '#84cc16',
  green: '#22c55e',
  emerald: '#10b981',
  teal: '#14b8a6',
  cyan: '#06b6d4',
  sky: '#0ea5e9',
  blue: '#3b82f6',
  indigo: '#6366f1',
  violet: '#8b5cf6',
  purple: '#a855f7',
  fuchsia: '#d946ef',
  pink: '#ec4899',
  rose: '#f43f5e',
  muted: '#94a3b8',
}

export function colorTokenToHex(token: string | undefined): string {
  if (!token) return COLOR_HEX.muted!
  if (token.startsWith('#') || token.startsWith('var(') || token.startsWith('hsl')) return token
  return COLOR_HEX[token] ?? COLOR_HEX.muted!
}

export interface GraphTypeEntry {
  type: string
  count: number
  color: string
  icon: string
  label: string
}

interface GraphTypesState {
  active: boolean
  entries: GraphTypeEntry[]
  visibility: Record<string, boolean>
}

const _state = ref<GraphTypesState>({
  active: false,
  entries: [],
  visibility: {},
})

export function useGraphTypesSidebar() {
  const state = _state

  function activate() {
    state.value = { ...state.value, active: true }
  }

  function deactivate() {
    state.value = { active: false, entries: [], visibility: {} }
  }

  function setEntries(entries: GraphTypeEntry[]) {
    const nextVis = { ...state.value.visibility }
    let changed = false
    for (const e of entries) {
      if (!(e.type in nextVis)) {
        nextVis[e.type] = true
        changed = true
      }
    }
    state.value = {
      ...state.value,
      entries,
      visibility: changed ? nextVis : state.value.visibility,
    }
  }

  function isVisible(type: string): boolean {
    const v = state.value.visibility[type]
    return v === undefined ? true : v
  }

  function toggle(type: string) {
    state.value = {
      ...state.value,
      visibility: { ...state.value.visibility, [type]: !isVisible(type) },
    }
  }

  function toggleAll() {
    const target = !state.value.entries.every((e) => isVisible(e.type))
    const next: Record<string, boolean> = {}
    for (const e of state.value.entries) next[e.type] = target
    state.value = { ...state.value, visibility: next }
  }

  function resolveConfig(type: string): { icon: string; color: string; label: string } {
    try {
      const cfg = getEntityTypeConfig(type as EntityType)
      if (cfg) return { icon: cfg.icon, color: cfg.color, label: cfg.label }
    } catch {}
    return { icon: 'lucide:circle', color: 'muted', label: type }
  }

  return {
    state: readonly(state),
    activate,
    deactivate,
    setEntries,
    isVisible,
    toggle,
    toggleAll,
    resolveConfig,
  }
}
