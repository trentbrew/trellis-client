<script lang="ts" setup>
  import { reactiveOmit } from '@vueuse/core'
  import { Primitive, useForwardProps } from 'reka-ui'
  import type { TimelineData } from './Timeline.vue'
  import type { PrimitiveProps } from 'reka-ui'
  import type { HTMLAttributes } from 'vue'
  import type { ClassNameValue } from 'tailwind-merge'

  import { timelineDataSymbol } from './Timeline.vue'

  const timelineData = inject<TimelineData>(timelineDataSymbol)

  const styles = tv({
    base: 'group/timeline-item relative flex flex-1 flex-col gap-0.5 group-data-[orientation=horizontal]/timeline:mt-8 group-data-[orientation=horizontal]/timeline:not-last:pe-8 group-data-[orientation=vertical]/timeline:ms-8 group-data-[orientation=vertical]/timeline:not-last:pb-12 has-[+[data-completed]]:[&_[data-slot=timeline-separator]]:bg-primary',
  })
  const props = defineProps<
    PrimitiveProps & {
      class?: ClassNameValue
      step: number
    }
  >()

  const dataCompleted = computed(() => {
    const v = timelineData?.model?.value
    return typeof v === 'number' && props.step <= v ? true : undefined
  })

  const forwarded = useForwardProps(reactiveOmit(props, ['class', 'step']))
</script>

<template>
  <Primitive
    :data-completed="dataCompleted"
    :data-step="step"
    data-slot="timeline-item"
    aria-hidden="true"
    v-bind="forwarded"
    :class="styles({ class: props.class })"
  >
    <slot />
  </Primitive>
</template>
