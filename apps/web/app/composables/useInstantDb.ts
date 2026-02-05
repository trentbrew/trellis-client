export function useInstantDb() {
  const { $instantDb } = useNuxtApp()
  return $instantDb
}
