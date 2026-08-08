<script lang="ts" setup>
  import { TagsInputItemDelete } from 'reka-ui'
  import type { TagsInputItemDeleteProps } from 'reka-ui'
  import type { HTMLAttributes } from 'vue'
  import type { ClassNameValue } from 'tailwind-merge'

  const props = withDefaults(
    defineProps<TagsInputItemDeleteProps & { icon?: string; class?: ClassNameValue }>(),
    {
      icon: 'lucide:x',
    },
  )
  const forwarded = reactiveOmit(props, 'class', 'icon')
  const styles = tv({
    base: 'flex items-center justify-center p-0 text-muted-foreground/80 transition-[color,box-shadow] outline-none hover:text-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
  })
</script>

<template>
  <TagsInputItemDelete data-slot="tags-input-item-delete" v-bind="forwarded" :class="styles({ class: props.class })">
    <slot>
      <Icon v-if="icon" :name="icon" class="m-auto size-3" />
    </slot>
  </TagsInputItemDelete>
</template>
