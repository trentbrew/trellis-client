<script lang="ts" setup>
  const { user: _railUser } = useInstantAuth()
  const showIconRail = computed(() => !!_railUser.value)
  const appNavigate = useAppNavigate()
  const pageEl = ref<HTMLElement | null>(null)

  // Register the page element for transitions
  onMounted(() => {
    if (pageEl.value) {
      appNavigate.registerPageElement(pageEl.value)
    }
  })

  onBeforeUnmount(() => {
    appNavigate.registerPageElement(null)
  })
</script>

<template>
  <!-- Root: base layer with rail but conditional sidebar -->
  <div class="bg-background text-foreground flex h-dvh flex-col">
    <AppHeader />

    <!-- Sky menubar + Omnibox overlay live in AppHeader via AppMenubar. Resident cluster in IconRail. -->

    <div class="flex flex-1 overflow-hidden">
      <div v-if="showIconRail" class="pl-2.5 py-2.5 shrink-0 flex self-stretch">
        <IconRail position="left" />
      </div>

      <!-- Conditional sidebar slot - pages can choose to render sidebar or not -->
      <slot name="sidebar">
        <AppSidebar />
      </slot>

      <main
        ref="pageEl"
        class="page-transition-wrapper bg-transparent flex-1 overflow-y-auto p-0"
        aria-label="Main content">
        <slot />
      </main>
    </div>
  </div>
</template>
