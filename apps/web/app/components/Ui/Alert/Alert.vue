<script lang="ts">
  import type { HTMLAttributes } from 'vue'
  import type { ClassNameValue } from 'tailwind-merge'

  export type AlertProps = {
    /** Custom class to add to the `Alert` parent */
    class?: ClassNameValue
    /** Classes to add to the icon */
    iconClass?: ClassNameValue
    /** Whether the alert should have a filled/colored background */
    filled?: boolean
    /**
     * Whether or not the `Alert` is shown.
     * @default true
     */
    modelValue?: boolean
    /** The variant of the `Alert` */
    variant?: VariantProps<typeof alertStyles>['variant']
    /** The title that is passed to the `AlertTitle` component */
    title?: string
    /** The description that is passed to the `AlertDescription` component */
    description?: string
    /** The icon that should be displayed*/
    icon?: string
  }

  export const alertStyles = tv({
    slots: {
      base: 'relative flex w-full gap-3 rounded-lg border p-4',
      icon: 'size-4 shrink-0',
      content: 'grow',
    },
    variants: {
      variant: {
        default: {
          base: 'bg-white/10 text-foreground border-white/10',
          icon: 'text-foreground',
        },
        destructive: {
          base: 'bg-rose-500/20 text-rose-400 border border-rose-500/20',
          icon: 'text-rose-400',
        },
        info: {
          base: 'bg-blue-500/20 text-blue-400 border border-blue-500/20',
          icon: 'text-blue-400',
        },
        success: {
          base: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20',
          icon: 'text-emerald-400',
        },
        warning: {
          base: 'bg-amber-500/20 text-amber-400 border border-amber-500/20',
          icon: 'text-amber-400',
        },
      },
      filled: {
        true: {},
      },
    },
    defaultVariants: {
      variant: 'default',
      filled: false,
    },
    compoundVariants: [
      {
        filled: true,
        variant: 'default',
        class: { base: 'bg-muted/50 text-foreground', icon: 'text-foreground' },
      },
      {
        filled: true,
        variant: 'destructive',
        class: {
          base: 'bg-destructive text-destructive-foreground shadow-xs',
          icon: 'text-destructive-foreground',
        },
      },
      {
        filled: true,
        variant: 'info',
        class: { base: 'bg-blue-500 text-blue-50 shadow-xs', icon: 'text-blue-50' },
      },
      {
        filled: true,
        variant: 'success',
        class: { base: 'bg-emerald-500 text-emerald-50 shadow-xs', icon: 'text-emerald-50' },
      },
      {
        filled: true,
        variant: 'warning',
        class: { base: 'bg-amber-500 text-amber-50 shadow-xs', icon: 'text-amber-50' },
      },
    ],
  })
</script>

<script lang="ts" setup>
  const props = withDefaults(defineProps<AlertProps>(), {
    modelValue: true,
    variant: 'default',
  })

  const shown = defineModel<boolean>({ default: true })
</script>

<template>
  <div v-if="shown" data-slot="alert" :class="alertStyles().base({ variant, filled, class: props.class })">
    <slot :props="props" name="icon">
      <Icon
        v-if="icon"
        data-slot="alert-icon"
        :name="icon"
        :class="alertStyles().icon({ variant, filled, class: props.iconClass })" />
    </slot>
    <div data-slot="alert-content" :class="alertStyles().content({ variant, filled })">
      <slot :props="props">
        <slot name="title">
          <UiAlertTitle v-if="title" :title="title" />
        </slot>
        <slot name="description">
          <UiAlertDescription v-if="description" :description="description" />
        </slot>
      </slot>
    </div>
  </div>
</template>
