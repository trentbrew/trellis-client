<script lang="ts" setup>
  const status = useStatusBar()
</script>

<template>
  <footer
    class="bg-muted/50 border-t border-border flex items-center justify-between h-6 px-2 text-[11px] font-mono text-muted-foreground select-none shrink-0 z-100 relative"
    aria-label="Status bar">
    <!-- Left section -->
    <div class="flex items-center gap-3 min-w-0">
      <!-- Data mode indicator -->
      <div class="flex items-center gap-1" :title="`Data mode: ${status.dataMode.value}\nEntities: ${status.entityBackend.value}\nOntologies: ${status.ontologyBackend.value}`">
        <span
          class="inline-block h-2 w-2 rounded-full"
          :class="status.isCloud.value ? 'bg-sky-400' : 'bg-emerald-400'" />
        <span class="uppercase tracking-wider">{{ status.dataMode.value }}</span>
      </div>

      <!-- Auth state -->
      <div class="flex items-center gap-1" :title="status.authLabel.value">
        <Icon
          :name="status.isAuthenticated.value ? 'lucide:user-check' : status.isAuthLoading.value ? 'lucide:loader' : 'lucide:user-x'"
          class="h-3 w-3"
          :class="[
            status.isAuthenticated.value ? 'text-emerald-400' : 'text-muted-foreground/60',
            status.isAuthLoading.value ? 'animate-spin' : '',
          ]" />
        <span class="truncate max-w-[160px]">{{ status.authLabel.value }}</span>
      </div>

      <!-- Health indicator -->
      <div v-if="!status.isHealthy.value" class="flex items-center gap-1 text-destructive" :title="status.adapterError.value?.message">
        <Icon name="lucide:alert-circle" class="h-3 w-3" />
        <span class="truncate max-w-[200px]">{{ status.adapterError.value?.message }}</span>
      </div>
    </div>

    <!-- Right section -->
    <div class="flex items-center gap-3 min-w-0">
      <!-- Entity count -->
      <div class="flex items-center gap-1" title="Total entities in graph">
        <Icon name="lucide:database" class="h-3 w-3" />
        <span v-if="status.isEntitiesLoading.value" class="text-muted-foreground/60">…</span>
        <span v-else>{{ status.entityCount.value }} entities</span>
      </div>

      <!-- Current path -->
      <div class="flex items-center gap-1 text-muted-foreground/60" :title="status.currentPath.value">
        <Icon name="lucide:route" class="h-3 w-3" />
        <span class="truncate max-w-[120px]">{{ status.currentPath.value }}</span>
      </div>

      <!-- Version -->
      <span class="text-muted-foreground/40">{{ status.version }}</span>
    </div>
  </footer>
</template>
