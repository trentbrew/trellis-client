<script lang="ts" setup>
  import { handleBrowserNavigation } from '~/composables/useAppNavigate'
  import { provideSheetStack } from '~/composables/useSheetStack'
  import { restoreDialogsFromHash } from '~/composables/useDialogUrl'
  import type { Entity, EntityType } from '~/types/entity'

  useHead({
    htmlAttrs: { lang: 'en' },
    link: [{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.ico' }],
  })

  const route = useRoute()
  const commandDialog = useCommandDialog()
  const { register } = useKeyboardShortcuts()
  provideSheetStack()

  // ── Boot-time dialog restore from URL hash ──────────────────────────────────
  // When the page loads with a hash like #entity:task-abc+entity:person-xyz,
  // we open the originating dialog and push any stacked dialogs.
  const { items: allEntities, loading: entitiesLoading } = useEntities()
  const dialogStack = useDialogStack()
  const _hashRestored = ref(false)

  // We need a global "open origin dialog" function. Since the originating dialog
  // is page-managed (not in DialogStackHost), we expose a global event bus so
  // any page can register itself as the handler.
  const _hashRestoreEntityId = useState<string | null>('dialog:restoreEntityId', () => null)

  watch(
    [entitiesLoading, allEntities],
    ([loading, items]) => {
      if (loading || _hashRestored.value) return
      const hash = route.hash
      if (!hash) return

      _hashRestored.value = true

      restoreDialogsFromHash(
        hash,
        items as Entity[],
        (entityId: string, _item: Entity) => {
          // Signal pages to open their dialog for this entity
          _hashRestoreEntityId.value = entityId
        },
        (entityId: string, entityType: EntityType, item: Entity) => {
          dialogStack.push(entityId, entityType, item)
        },
      )
    },
    { immediate: true },
  )

  const previousPath = ref('')
  let isInitialMount = true

  onMounted(() => {
    previousPath.value = route.path
    isInitialMount = false

    // Register global keyboard shortcuts via the central registry
    const unregisterPalette = register('command-palette', () => commandDialog.toggle())
    const unregisterNavigate = register('go-settings', () => { navigateTo('/settings'); return 'Settings' })
    const unregisterSidebar = register('toggle-sidebar', () => {
      // Sidebar toggle — uses the sidebar provider's keyboard shortcut
      document.querySelector<HTMLButtonElement>('[data-sidebar="trigger"]')?.click()
    })

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
      unregisterPalette()
      unregisterNavigate()
      unregisterSidebar()
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
    <DialogStackHost />
  </div>
</template>
