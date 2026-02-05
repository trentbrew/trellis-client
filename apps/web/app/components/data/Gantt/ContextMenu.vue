<script lang="ts">
  import { defineComponent, h } from 'vue'
  import {
    ContextMenuRoot,
    ContextMenuTrigger as RadixContextMenuTrigger,
    ContextMenuContent as RadixContextMenuContent,
    ContextMenuItem as RadixContextMenuItem,
    ContextMenuPortal as RadixContextMenuPortal,
  } from 'reka-ui'
  import { cn } from '@/lib/utils'

  export const ContextMenu = defineComponent({
    name: 'ContextMenu',
    setup(_, { slots }) {
      return () => h(ContextMenuRoot, {}, slots)
    },
  })

  export const ContextMenuTrigger = defineComponent({
    name: 'ContextMenuTrigger',
    setup(_, { attrs, slots }) {
      return () => h(RadixContextMenuTrigger, attrs, slots)
    },
  })

  export const ContextMenuContent = defineComponent({
    name: 'ContextMenuContent',
    setup(_, { attrs, slots }) {
      return () =>
        h(RadixContextMenuPortal, {}, () =>
          h(
            RadixContextMenuContent,
            {
              class: cn(
                'z-50 min-w-32 overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md animate-in fade-in-80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
                (attrs as any).class,
              ),
            },
            slots,
          ),
        )
    },
  })

  export const ContextMenuItem = defineComponent({
    name: 'ContextMenuItem',
    setup(_, { attrs, slots }) {
      return () =>
        h(
          RadixContextMenuItem,
          {
            class: cn(
              'relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50',
              (attrs as any).class,
            ),
          },
          slots,
        )
    },
  })

  export default {
    ContextMenu,
    ContextMenuTrigger,
    ContextMenuContent,
    ContextMenuItem,
  }
</script>

<template>
  <slot />
</template>
