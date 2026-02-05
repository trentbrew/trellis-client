<script lang="ts" setup>
  import { Primitive } from 'reka-ui'
  import type { PrimitiveProps } from 'reka-ui'

  defineProps<PrimitiveProps>()
</script>

<template>
  <Primitive data-slot="timeline-header" :as :as-child>
    <slot />
  </Primitive>
</template>
