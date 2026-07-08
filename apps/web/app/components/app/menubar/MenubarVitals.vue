<script lang="ts" setup>
  const { status } = useAmbientBar()

  const vitalsLabel = computed(() => {
    if (status.isEntitiesLoading.value || status.isLinkCountLoading.value) return '…'
    const entities = status.entityCount.value
    const edges = status.linkCount.value
    if (edges == null) return `${entities}`
    return `${entities} · ${edges}`
  })
</script>

<template>
  <UiTooltip>
    <UiTooltipTrigger as-child>
      <button
        type="button"
        class="menubar-chip inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full bg-muted/30 px-2.5 text-[11px] font-medium text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
        :aria-label="`Facility vitals: ${vitalsLabel}`">
        <Icon name="lucide:activity" class="size-3.5 shrink-0 opacity-70" />
        <span
          class="inline-block h-1.5 w-1.5 rounded-full shrink-0"
          :class="status.isHealthy.value ? 'bg-emerald-400' : 'bg-destructive'" />
        <template v-if="status.isEntitiesLoading.value || status.isLinkCountLoading.value">
          <span class="tabular-nums">…</span>
        </template>
        <template v-else>
          <span class="inline-flex items-center gap-1 tabular-nums whitespace-nowrap">
            <Icon name="lucide:database" class="size-3 shrink-0 opacity-60" />
            <span>{{ status.entityCount.value }}</span>
          </span>
          <template v-if="status.linkCount.value != null">
            <span class="text-muted-foreground/40">·</span>
            <span class="inline-flex items-center gap-1 tabular-nums whitespace-nowrap">
              <Icon name="lucide:git-branch" class="size-3 shrink-0 opacity-60" />
              <span>{{ status.linkCount.value }}</span>
            </span>
          </template>
        </template>
      </button>
    </UiTooltipTrigger>
    <UiTooltipContent side="bottom" :side-offset="8" class="max-w-xs">
      <div class="space-y-1 text-xs">
        <div class="font-medium">Facility vitals</div>
        <div class="text-muted-foreground">{{ status.entityCount.value }} entities in graph</div>
        <div v-if="status.linkCount.value != null" class="text-muted-foreground">
          {{ status.linkCount.value }} edges in graph
        </div>
        <div class="text-muted-foreground">Mode: {{ status.dataMode.value }}</div>
        <div class="text-muted-foreground">Entities: {{ status.entityBackend.value }}</div>
        <div class="text-muted-foreground">Ontologies: {{ status.ontologyBackend.value }}</div>
        <div v-if="!status.isHealthy.value" class="text-destructive">{{ status.adapterError.value?.message }}</div>
      </div>
    </UiTooltipContent>
  </UiTooltip>
</template>
