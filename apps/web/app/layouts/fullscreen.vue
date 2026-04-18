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

    <!-- Global omnibox lives inside AppHeader via <AppOmnibox />. -->

    <div class="flex flex-1 overflow-hidden">
      <IconRail v-if="showIconRail" />

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
