import { ref, watch, computed, type Ref } from 'vue'

const MIN_COLS = 1
const MAX_COLS = 6
const DEFAULT_COLS = 4

function clampCols(n: number) {
  return Math.min(MAX_COLS, Math.max(MIN_COLS, Math.round(n)))
}

function loadCols(storageKey: string, fallback = DEFAULT_COLS) {
  if (!import.meta.client) return fallback
  try {
    const raw = window.localStorage.getItem(storageKey)
    if (!raw) return fallback
    const n = Number.parseInt(raw, 10)
    return Number.isFinite(n) ? clampCols(n) : fallback
  } catch {
    return fallback
  }
}

function saveCols(storageKey: string, cols: number) {
  if (!import.meta.client) return
  try {
    window.localStorage.setItem(storageKey, String(cols))
  } catch {
    // ignore quota / private mode
  }
}

/**
 * Persisted grid column count for browse pages.
 * Keyed per entity type (or `all`) so bookmarks can differ from tasks.
 */
export function useBrowseGridColumns(storageKey: Ref<string>) {
  const columns = ref(DEFAULT_COLS)

  watch(
    storageKey,
    (key) => {
      columns.value = loadCols(`browse:grid-cols:${key}`)
    },
    { immediate: true },
  )

  watch(columns, (n) => {
    saveCols(`browse:grid-cols:${storageKey.value}`, n)
  })

  const gridStyle = computed(() => ({
    gridTemplateColumns: `repeat(${columns.value}, minmax(0, 1fr))`,
  }))

  function increment() {
    columns.value = clampCols(columns.value + 1)
  }

  function decrement() {
    columns.value = clampCols(columns.value - 1)
  }

  return {
    columns,
    gridStyle,
    increment,
    decrement,
    minCols: MIN_COLS,
    maxCols: MAX_COLS,
  }
}
