type User = {
  id: string
  email?: string | null
  name?: string | null
  avatar?: string | null
}

export function useInstantAuth() {
  const db = useInstantDb()

  const user = useState<User | null>('instant:user', () => null)
  const isLoading = useState<boolean>('instant:isLoading', () => true)
  const error = useState<string | null>('instant:error', () => null)
  const hasSubscribed = useState<boolean>('instant:subscribed', () => false)

  if (import.meta.client && !hasSubscribed.value) {
    hasSubscribed.value = true

    db.subscribeAuth((auth: any) => {
      isLoading.value = false

      if ('error' in auth && auth.error) {
        user.value = null
        error.value = auth.error.message
        return
      }

      user.value = auth.user ?? null
      error.value = null
    })
  }

  const signOut = async () => {
    // Local-only: no remote session to clear
    await db.auth.signOut().catch(() => {})
  }

  return {
    user,
    isLoading,
    error,
    signOut,
  }
}
