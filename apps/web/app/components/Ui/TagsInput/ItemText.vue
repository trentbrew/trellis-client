<script lang="ts" setup>
  import { TagsInputItemText } from 'reka-ui'
  import type { TagsInputItemTextProps } from 'reka-ui'
  import type { HTMLAttributes } from 'vue'
  import type { ClassNameValue } from 'tailwind-merge'

  const props = defineProps<TagsInputItemTextProps & { class?: ClassNameValue }>()
  const forwarded = reactiveOmit(props, 'class')
  const styles = tv({
    base: '',
  })
</script>

<template>
  <TagsInputItemText data-slot="tags-input-item-text" v-bind="forwarded" :class="styles({ class: props.class })">
    <slot />
  </TagsInputItemText>
</template>
