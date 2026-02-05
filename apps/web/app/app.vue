<script lang="ts" setup>
  import { handleBrowserNavigation } from '~/composables/useAppNavigate'
  import { provideSheetStack } from '~/composables/useSheetStack'

  useHead({
    htmlAttrs: { lang: 'en' },
    link: [{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.ico' }],
  })

  const route = useRoute()
  const commandDialog = useCommandDialog()
  provideSheetStack()

  const previousPath = ref('')
  let isInitialMount = true

  onMounted(() => {
    previousPath.value = route.path
    isInitialMount = false

    // Global keyboard shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      // Command/Ctrl + K for command palette
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        commandDialog.toggle()
      }
      // Escape to close
      if (e.key === 'Escape' && commandDialog.isOpen.value) {
        commandDialog.close()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    // Watch for route changes to handle browser back/forward navigation
    watch(
      () => route.path,
      async (newPath, oldPath) => {
        // Skip on initial mount and if paths are the same
        if (isInitialMount || !oldPath || newPath === oldPath) {
          previousPath.value = newPath
          return
        }

        // Determine direction based on path depth
        const oldDepth = oldPath.split('/').filter(Boolean).length
        const newDepth = newPath.split('/').filter(Boolean).length
        const direction: 'forward' | 'back' = newDepth < oldDepth ? 'back' : 'forward'

        // Handle browser navigation (this will be skipped if custom navigation is active)
        await handleBrowserNavigation(direction)
        previousPath.value = newPath
      },
      { flush: 'post' },
    )

    onBeforeUnmount(() => {
      window.removeEventListener('keydown', handleKeyDown)
    })
  })
</script>

<template>
  <div>
    <NuxtRouteAnnouncer />
    <UiSonner />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>
