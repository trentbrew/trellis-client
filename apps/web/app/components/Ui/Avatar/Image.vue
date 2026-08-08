<script lang="ts" setup>
  import { AvatarImage, useForwardPropsEmits } from 'reka-ui'
  import type { AvatarImageEmits, AvatarImageProps } from 'reka-ui'
  import type { HTMLAttributes } from 'vue'
  import type { ClassNameValue } from 'tailwind-merge'

  const props = defineProps<
    AvatarImageProps & {
      /** The alt text for the image */
      alt?: string
      /** Custom class(es) to add to the element */
      class?: ClassNameValue
    }
  >()
  const emits = defineEmits<AvatarImageEmits>()

  const forwarded = useForwardPropsEmits(reactiveOmit(props, 'class'), emits)

  const styles = tv({
    base: 'aspect-square size-full object-cover',
  })
</script>

<template>
  <AvatarImage data-slot="avatar-image" v-bind="forwarded" :class="styles({ class: props.class })" />
</template>
