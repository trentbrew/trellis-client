<script lang="ts">
  import { reactiveOmit } from '@vueuse/core'
  import { useForwardProps } from 'reka-ui'
  import type { NuxtLinkProps } from 'nuxt/app'
  import type { HTMLAttributes } from 'vue'
  import type { ClassNameValue } from 'tailwind-merge'
</script>

<script lang="ts" setup>
  const badgeVariants = tv({
    base: 'inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-md border whitespace-nowrap transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3',
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground [a&]:hover:bg-primary/90',
        secondary: 'border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90',
        destructive:
          'border-transparent bg-destructive text-destructive-foreground focus-visible:ring-destructive/20 [a&]:hover:bg-destructive/90',
        outline: 'text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground',
        success:
          'border-transparent bg-success text-success-foreground focus-visible:ring-success/20 [a&]:hover:bg-success/90',
        warning:
          'border-transparent bg-warning text-warning-foreground focus-visible:ring-warning/20 [a&]:hover:bg-warning/90',
        info: 'border-transparent bg-blue-500 text-white focus-visible:ring-blue-500/20 dark:bg-blue-500/60 dark:focus-visible:ring-blue-500/40 [a&]:hover:bg-blue-600',
        ghost: 'border-transparent bg-transparent text-foreground [a&]:hover:bg-accent/50',
        error:
          'border-transparent bg-destructive text-destructive-foreground focus-visible:ring-destructive/20 [a&]:hover:bg-destructive/90',
      },
      disabled: {
        true: 'cursor-not-allowed opacity-50',
      },
      size: {
        sm: 'px-2 py-0.5 text-xs font-medium',
        md: 'px-2.5 py-[3px] text-sm font-medium',
        lg: 'px-2.5 py-1 text-sm font-semibold',
      },
    },
    defaultVariants: {
      variant: 'default',
      disabled: false,
      size: 'sm',
    },
  })

  type BadgeProps = VariantProps<typeof badgeVariants>

  const props = defineProps<
    NuxtLinkProps & {
      /** Any additional class that should be added to the badge */
      class?: ClassNameValue
      /** The variant of the badge */
      variant?: BadgeProps['variant']
      /** The size of the badge */
      size?: BadgeProps['size']
      /** The action to perform when the badge is clicked */
      onClick?: () => void
      /** Should the badge be disabled or not */
      disabled?: boolean
      /** The element to render the badge as */
      tag?: string
    }
  >()

  const forwarded = useForwardProps(reactiveOmit(props, 'class', 'variant', 'onClick', 'disabled'))

  const elementType = computed(() => {
    if (props.tag) return props.tag
    if (props.href || props.to) return resolveComponent('NuxtLink')
    if (props.onClick) return 'button'
    return props.tag || 'div'
  })
</script>

<template>
  <component
    :is="elementType"
    :class="badgeVariants({ disabled, size, variant, class: props.class })"
    v-bind="forwarded"
    @click="onClick"
  >
    <slot />
  </component>
</template>
