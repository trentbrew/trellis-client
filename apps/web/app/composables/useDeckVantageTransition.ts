/** Shared deck editor ↔ present crossfade (280ms, reduced-motion safe). */

export function useDeckVantageTransition() {
  const vantage = useState<'editor' | 'present'>('deck-vantage-mode', () => 'editor')

  function applyDom() {
    if (!import.meta.client) return
    document.documentElement.dataset.deckVantage = vantage.value
  }

  watch(vantage, applyDom, { immediate: true })

  onMounted(applyDom)
  onBeforeUnmount(() => {
    if (import.meta.client) delete document.documentElement.dataset.deckVantage
  })

  function enterPresent() {
    vantage.value = 'present'
  }

  function exitPresent() {
    vantage.value = 'editor'
  }

  return { vantage, enterPresent, exitPresent }
}
