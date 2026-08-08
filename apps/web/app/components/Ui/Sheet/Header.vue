<script lang="ts" setup>
  import { Primitive } from 'reka-ui'
  import type { PrimitiveProps } from 'reka-ui'
  import type { HTMLAttributes } from 'vue'
  import type { ClassNameValue } from 'tailwind-merge'
  import { useSheetStack } from '~/composables/useSheetStack'

  const props = withDefaults(
    defineProps<
      PrimitiveProps & {
        /** Custom class(es) to add to parent element */
        class?: ClassNameValue
        /** Whether to show the back button (usually for nested sheets) */
        showBackButton?: boolean
      }
    >(),
    {
      as: 'div',
    },
  )

  const { isNested } = useSheetStack()
  const emits = defineEmits(['back'])

  const forwarded = reactiveOmit(props, 'class', 'showBackButton')
  const styles = tv({
    base: 'flex items-center gap-4 border-b border-border/50 px-6 py-4 min-h-[72px]',
  })
</script>

<template>
  <Primitive data-slot="sheet-header" :class="styles({ class: props.class })" v-bind="forwarded">
    <UiSheetClose v-if="showBackButton || isNested" as-child @click="emits('back')">
      <UiButton variant="ghost" size="icon-sm" class="-ml-2 h-8 w-8 shrink-0 rounded-full hover:bg-accent/50">
        <Icon name="lucide:arrow-left" class="h-4 w-4" />
      </UiButton>
    </UiSheetClose>
    <div class="flex flex-1 flex-col gap-0.5 min-w-0">
      <slot />
    </div>
  </Primitive>
</template>
