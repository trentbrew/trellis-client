<script lang="ts" setup>
  import {
    DEFAULTS,
    provideMessageScroller,
    type MessageScrollerProviderProps,
  } from '~/utils/message-scroller'

  const props = withDefaults(defineProps<MessageScrollerProviderProps>(), {
    autoScroll: false,
    defaultScrollPosition: 'end',
  })

  function resolved() {
    return {
      autoScroll: props.autoScroll ?? false,
      defaultScrollPosition: props.defaultScrollPosition ?? 'end',
      scrollEdgeThreshold: props.scrollEdgeThreshold ?? DEFAULTS.scrollEdgeThreshold,
      scrollPreviousItemPeek: props.scrollPreviousItemPeek ?? DEFAULTS.scrollPreviousItemPeek,
      scrollMargin: props.scrollMargin ?? DEFAULTS.scrollMargin,
    }
  }

  const engine = provideMessageScroller(resolved())

  watch(
    () => resolved(),
    (next, prev) => {
      engine.setProps(next)
      if (next.autoScroll !== prev?.autoScroll) engine.context.onAutoScrollChange()
    },
    { deep: true },
  )

  onMounted(() => {
    engine.context.applyDefaultScrollPosition()
  })
</script>

<template>
  <slot />
</template>
