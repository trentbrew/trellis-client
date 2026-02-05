import { useState } from '#imports'

export const useCommandDialog = () => {
  // Use a global state key for the command dialog
  const isOpen = useState<boolean>('commandDialogOpen', () => false)

  const open = () => {
    isOpen.value = true
  }

  const close = () => {
    isOpen.value = false
  }

  const toggle = () => {
    isOpen.value = !isOpen.value
  }

  return {
    isOpen,
    open,
    close,
    toggle,
  }
}
