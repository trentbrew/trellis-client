<script lang="ts" setup>
  const { canGoBack, canGoForward, backHint, forwardHint, goBack, goForward } = useProjectionNavigation()
  const { register } = useKeyboardShortcuts()

  const unregisterBack = register('nav-back', () => {
    if (!canGoBack.value) return
    void goBack()
    return backHint.value ? `Back: ${backHint.value}` : 'Back'
  })

  const unregisterForward = register('nav-forward', () => {
    if (!canGoForward.value) return
    void goForward()
    return forwardHint.value ? `Forward: ${forwardHint.value}` : 'Forward'
  })

  onBeforeUnmount(() => {
    unregisterBack()
    unregisterForward()
  })

  const navBtnClass =
    'inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground disabled:pointer-events-none disabled:opacity-30 outline-none focus-visible:ring-1 focus-visible:ring-ring'
</script>

<template>
  <div class="flex items-center gap-0.5 app-region-no-drag mr-1" data-slot="campus-nav-controls">
    <UiTooltip>
      <UiTooltipTrigger as-child>
        <button
          type="button"
          :disabled="!canGoBack"
          :class="navBtnClass"
          aria-label="Go back"
          @click="goBack">
          <Icon name="lucide:chevron-left" class="size-4" />
        </button>
      </UiTooltipTrigger>
      <UiTooltipContent v-if="canGoBack && backHint" side="bottom" :side-offset="6">
        {{ backHint }}
        <span class="ml-1.5 text-muted-foreground">⌘[</span>
      </UiTooltipContent>
    </UiTooltip>

    <UiTooltip>
      <UiTooltipTrigger as-child>
        <button
          type="button"
          :disabled="!canGoForward"
          :class="navBtnClass"
          aria-label="Go forward"
          @click="goForward">
          <Icon name="lucide:chevron-right" class="size-4" />
        </button>
      </UiTooltipTrigger>
      <UiTooltipContent v-if="canGoForward && forwardHint" side="bottom" :side-offset="6">
        {{ forwardHint }}
        <span class="ml-1.5 text-muted-foreground">⌘]</span>
      </UiTooltipContent>
    </UiTooltip>
  </div>
</template>
