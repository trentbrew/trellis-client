// Shared state for collection save status
const isSaving = ref(false)
const lastSaved = ref<Date | null>(null)

export const useCollectionSaveState = () => {
  const setSaving = (saving: boolean) => {
    isSaving.value = saving
  }

  const setLastSaved = (date: Date | null) => {
    lastSaved.value = date
  }

  return {
    isSaving: readonly(isSaving),
    lastSaved: readonly(lastSaved),
    setSaving,
    setLastSaved,
  }
}
