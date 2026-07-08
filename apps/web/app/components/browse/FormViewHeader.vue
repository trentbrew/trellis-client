<script lang="ts" setup>
  import type { FormPresentation } from '~/lib/ontology-form-spec'

  const props = defineProps<{
    responseCount: number
    formPresentation?: FormPresentation | null
    label?: string
  }>()

  const presentationLabel = computed(() => {
    const p = props.formPresentation ?? 'stacked'
    return p === 'entity-dialog' ? 'Stacked' : p.charAt(0).toUpperCase() + p.slice(1)
  })
</script>

<template>
  <div class="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-4">
    <div class="flex items-center gap-2">
      <span
        class="inline-flex items-center rounded-full border border-border bg-muted/40 px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
        {{ responseCount }} {{ responseCount === 1 ? 'response' : 'responses' }}
      </span>
      <span v-if="label" class="text-sm text-muted-foreground">{{ label }}</span>
    </div>
    <div class="flex items-center gap-2">
      <span class="rounded-md border border-border bg-muted/30 px-2 py-1 text-xs font-medium capitalize text-muted-foreground">
        {{ presentationLabel }}
      </span>
      <UiTooltip>
        <UiTooltipTrigger as-child>
          <span class="inline-flex">
            <UiButton variant="outline" size="sm" disabled class="pointer-events-none opacity-60">
              <Icon name="lucide:link" class="mr-1.5 h-3.5 w-3.5" />
              Copy link
            </UiButton>
          </span>
        </UiTooltipTrigger>
        <UiTooltipContent side="bottom">Publishing coming soon</UiTooltipContent>
      </UiTooltip>
    </div>
  </div>
</template>
