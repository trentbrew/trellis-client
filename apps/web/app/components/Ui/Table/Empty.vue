<script lang="ts" setup>
  import type { HTMLAttributes } from 'vue'
  import type { ClassNameValue } from 'tailwind-merge'

  const props = withDefaults(
    defineProps<{
      colspan?: number
      class?: ClassNameValue
    }>(),
    {
      colspan: 1,
    },
  )

  const styles = tv({
    base: 'p-4 align-middle text-sm whitespace-nowrap text-foreground',
  })
</script>

<template>
  <UiTableRow>
    <UiTableCell :colspan="colspan" :class="styles({ class: props.class })">
      <div data-slot="table-empty" class="flex items-center justify-center py-10">
        <slot />
      </div>
    </UiTableCell>
  </UiTableRow>
</template>
