<script lang="ts">
  import type { PrimitiveProps } from 'reka-ui'
  import type { VariantProps } from 'tailwind-variants'
  import type { HTMLAttributes } from 'vue'
  import type { ClassNameValue } from 'tailwind-merge'

  const itemMediaStyles = tv({
    base: 'flex shrink-0 items-center justify-center gap-2 group-has-[[data-slot=item-description]]/item:translate-y-0.5 group-has-[[data-slot=item-description]]/item:self-start [&_svg]:pointer-events-none',

    variants: {
      variant: {
        default: 'bg-transparent',
        icon: "size-8 rounded-sm border bg-muted [&_svg:not([class*='size-'])]:size-4",
        image: 'size-10 overflow-hidden rounded-sm [&_img]:size-full [&_img]:object-cover',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  })

  export type ItemMediaProps = PrimitiveProps & {
    /**
     * The variant of the item media.
     * @default 'default'
     */
    variant?: VariantProps<typeof itemMediaStyles>['variant']
    /**
     * Additional classes to apply to the parent element.
     */
    class?: ClassNameValue
  }
</script>

<script lang="ts" setup>
  const props = withDefaults(defineProps<ItemMediaProps>(), {
    variant: 'default',
  })

  const forwarded = reactiveOmit(props, ['variant', 'class'])
</script>

<template>
  <Primitive
    data-slot="item-media"
    :data-variant="variant"
    v-bind="forwarded"
    :class="itemMediaStyles({ variant, class: props.class })"
  >
    <slot />
  </Primitive>
</template>
