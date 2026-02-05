<script lang="ts">
  import { reactiveOmit } from '@vueuse/core'
  import { useForwardPropsEmits } from 'reka-ui'
  import type { Calendar } from 'v-calendar'

  export type AttributeConfig = NonNullable<InstanceType<typeof Calendar>['$props']['attributes']>[number]
</script>

<script lang="ts" setup>
  defineOptions({ inheritAttrs: false })

  const calendarRef = useTemplateRef('calendarRef')

  type Props = /* @vue-ignore */ Omit<Partial<InstanceType<typeof Calendar>['$props']>, 'attributes'>

  const props = defineProps<Props & { trimWeeks?: boolean; attributes?: AttributeConfig[] }>()

  const forwarded = useForwardPropsEmits(reactiveOmit(props, ['trimWeeks', 'attributes']))
  defineExpose({ calendarRef })
</script>

<template>
  <ClientOnly>
    <VCalendar
      v-bind="{ ...forwarded, ...$attrs }"
      ref="calendarRef"
      :attributes="props.attributes"
      :trim-weeks="props.trimWeeks || true"
      :is-dark="$colorMode.value == 'dark'">
      <template v-for="(_, slot) in $slots" #[slot]="scope">
        <slot :name="slot" v-bind="scope" />
      </template>
    </VCalendar>
  </ClientOnly>
</template>

<style>
  @reference "~/assets/css/tailwind.css";

  :root {
    --vc-font-family: var(--font-sans);
    --vc-rounded-full: var(--radius);
    --vc-font-bold: 500;
    --vc-font-semibold: 600;
    --vc-text-lg: 16px;
  }

  .vc-light,
  .vc-dark {
    --vc-bg: var(--color-background);
    --vc-border: var(--color-border);
    --vc-focus-ring: 0 0 0 3px --alpha(var(--color-primary) / 30%);
    --vc-weekday-color: var(--color-muted-foreground);
    --vc-popover-content-color: var(--color-popover-foreground);
    --vc-hover-bg: var(--color-accent);
    --vc-popover-content-bg: var(--color-popover);
    --vc-popover-content-border: var(--color-border);
    --vc-header-arrow-hover-bg: var(--color-accent);
    --vc-weeknumber-color: var(--color-muted-foreground);
    --vc-nav-hover-bg: var(--color-accent);

    --vc-day-content-disabled-color: --alpha(var(--color-muted-foreground) / 80%);

    --vc-nav-item-active-color: var(--color-primary-foreground);
    --vc-nav-item-active-bg: var(--color-primary);

    &.vc-attr,
    & .vc-attr {
      --vc-content-color: var(--color-primary);
      --vc-highlight-outline-bg: var(--color-primary);
      --vc-highlight-outline-border: var(--color-primary);
      --vc-highlight-outline-content-color: var(--color-primary-foreground);
      --vc-highlight-light-bg: var(--vc-accent-200); /* Highlighted color between two dates */
      --vc-highlight-light-content-color: var(--color-secondary-foreground);
      --vc-highlight-solid-bg: var(--color-primary);
      --vc-highlight-solid-content-color: var(--color-primary-foreground);
    }
  }

  .vc-blue {
    --vc-accent-200: --alpha(var(--color-primary) / 20%);
    --vc-accent-400: var(--color-primary);
    --vc-accent-500: var(--color-primary);
    --vc-accent-600: --alpha(var(--color-primary) / 70%);
  }

  .dark {
    .vc-blue {
      --vc-accent-200: --alpha(var(--color-primary) / 20%);
      --vc-accent-400: var(--color-primary);
      --vc-accent-500: --alpha(var(--color-primary) / 70%);
    }
  }
  .vc-disabled {
    @apply pointer-events-none line-through;
  }
  .vc-header .vc-title {
    @apply text-sm font-medium;
  }
  .vc-weekday {
    @apply rounded-md text-[0.8rem] font-normal text-muted-foreground;
  }
  .vc-weekdays {
    @apply my-2 font-normal;
  }
  .vc-day-content,
  .vc-day,
  .vc-highlight {
    @apply size-9 rounded-md;
  }
  .vc-focus {
    @apply focus-within:shadow-none;
  }
  .vc-day {
    @apply mb-0.5;
  }

  .vc-base-icon {
    @apply size-4 stroke-1;
  }
  .vc-header .vc-arrow,
  .vc-nav-arrow {
    @apply size-7 rounded-md;
    border: 1px solid var(--color-border);
  }
  .vc-header .vc-prev,
  .vc-header .vc-next {
    @apply border;
  }
  .weekday-position-1 .vc-highlights {
    @apply rounded-l-md;
  }
  .weekday-position-7 .vc-highlights {
    @apply rounded-r-md;
  }
  .vc-highlight-bg-light {
    @apply bg-accent;
  }
  .vc-nav-item {
    @apply font-medium;
  }
  .vc-header .vc-title-wrapper {
    @apply decoration-accent-foreground/60 underline-offset-2 hover:underline;
  }
  .vc-highlights + .vc-day-content {
    @apply hover:bg-accent/5;
  }
</style>
