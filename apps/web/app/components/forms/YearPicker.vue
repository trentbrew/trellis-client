<script lang="ts" setup>
  const { selectedYear, availableYears, selectYear } = useYear()

  const handleSelect = (year: number) => {
    selectYear(year)
  }
</script>

<template>
  <div class="flex items-center group">
    <UiDropdownMenu>
      <UiDropdownMenuTrigger as-child>
        <button
          class="flex items-center justify-between gap-1.5 rounded-md px-2 py-1 transition-all duration-200 w-fit group/trigger hover:bg-muted/50">
          <Icon name="lucide:calendar" class="text-muted-foreground/60 h-3.5 w-3.5 shrink-0" />
          <span class="text-foreground text-xs font-medium tabular-nums leading-none">
            {{ selectedYear }}
          </span>
          <Icon
            name="lucide:chevrons-up-down"
            class="text-muted-foreground/75 h-3.5 w-3.5 shrink-0 group-hover/trigger:text-muted-foreground/60 transition-colors ml-0.5" />
        </button>
      </UiDropdownMenuTrigger>
      <UiDropdownMenuContent align="start" :side-offset="8" class="w-[140px]">
        <UiDropdownMenuLabel class="text-xs text-muted-foreground">Select Year</UiDropdownMenuLabel>
        <UiDropdownMenuSeparator />
        <div class="max-h-[300px] overflow-y-auto">
          <UiDropdownMenuItem
            v-for="year in availableYears"
            :key="year"
            class="gap-2 rounded justify-between"
            @click="handleSelect(year)">
            <span class="tabular-nums">{{ year }}</span>
            <Icon v-if="year === selectedYear" name="lucide:check" class="text-primary h-4 w-4 shrink-0" />
          </UiDropdownMenuItem>
        </div>
      </UiDropdownMenuContent>
    </UiDropdownMenu>
  </div>
</template>
