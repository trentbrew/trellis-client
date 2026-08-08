<script lang="ts" setup>
  import type { HTMLAttributes } from 'vue'
  import type { ClassNameValue } from 'tailwind-merge'

  defineOptions({ inheritAttrs: false })

  const { formDescriptionId } = useFormField()
  const props = defineProps<{ class?: ClassNameValue; description?: string }>()
  const styles = tv({ base: 'text-sm text-muted-foreground' })
</script>
<template>
  <p :id="formDescriptionId" :class="styles({ class: props.class })" v-bind="$attrs">
    <slot>
      <ClientOnly>
        <p v-html="description" />
      </ClientOnly>
    </slot>
  </p>
</template>
