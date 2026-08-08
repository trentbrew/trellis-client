<script lang="ts">
  import type { HTMLAttributes } from 'vue'
  import type { ClassNameValue } from 'tailwind-merge'

  export const sideBarInputStyles = tv({
    base: 'h-8 w-full bg-background shadow-none',
  })
</script>

<script setup lang="ts">
  const props = defineProps<{
    /**
     * Additional classes to apply to the parent element.
     */
    class?: ClassNameValue
  }>()

  const model = defineModel<any>()
</script>
<template>
  <UiInput
    v-model="model"
    data-slot="sidebar-input"
    data-sidebar="input"
    :class="sideBarInputStyles({ class: props.class })"
  >
    <slot />
  </UiInput>
</template>
