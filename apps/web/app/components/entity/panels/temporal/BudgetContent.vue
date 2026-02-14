<script lang="ts" setup>
  import type { BudgetStatus } from '~/types/entity'

  const BUDGET_STATUS_OPTIONS: { value: BudgetStatus; label: string; icon: string; color: string }[] = [
    { value: 'draft', label: 'Draft', icon: 'lucide:file-edit', color: 'text-slate-600 bg-slate-100 dark:bg-slate-900/30 dark:text-slate-400' },
    { value: 'active', label: 'Active', icon: 'lucide:play', color: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400' },
    { value: 'closed', label: 'Closed', icon: 'lucide:check-circle', color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400' },
    { value: 'over-budget', label: 'Over Budget', icon: 'lucide:alert-triangle', color: 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400' },
  ]

  const props = defineProps<{
    modelValue: any
    mode: 'view' | 'create' | 'edit'
  }>()

  const emit = defineEmits<{
    'update:modelValue': [value: any]
  }>()

  const item = computed({
    get: () => props.modelValue,
    set: (v) => emit('update:modelValue', v),
  })

  const isViewMode = computed(() => props.mode === 'view')
  const budgetStatusOpen = ref(false)
</script>

<template>
  <div class="divide-y divide-border">
    <!-- Amount / Status -->
    <div class="p-4 grid grid-cols-2 gap-4">
      <div class="space-y-1.5">
        <p class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Amount</p>
        <div v-if="!isViewMode" class="flex items-center gap-2">
          <select
            v-model="item.currency"
            class="h-8 rounded-md border border-border bg-transparent text-xs px-2 outline-none w-16 shrink-0">
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="GBP">GBP</option>
            <option value="CAD">CAD</option>
          </select>
          <UiInput v-model.number="item.amount" type="number" placeholder="0.00" class="text-sm" />
        </div>
        <p v-else class="text-sm font-medium">{{ item.currency }} {{ item.amount?.toLocaleString() }}</p>
      </div>
      <div class="space-y-1.5">
        <p class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Budget Status</p>
        <UiPopover v-model:open="budgetStatusOpen">
          <UiPopoverTrigger as-child>
            <button
              class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-colors"
              :class="BUDGET_STATUS_OPTIONS.find((s) => s.value === item.budgetStatus)?.color || 'bg-muted/50'">
              <Icon :name="BUDGET_STATUS_OPTIONS.find((s) => s.value === item.budgetStatus)?.icon || 'lucide:circle'" class="h-3.5 w-3.5" />
              {{ BUDGET_STATUS_OPTIONS.find((s) => s.value === item.budgetStatus)?.label || 'Status' }}
            </button>
          </UiPopoverTrigger>
          <UiPopoverContent align="start" class="w-44 p-1">
            <button
              v-for="opt in BUDGET_STATUS_OPTIONS"
              :key="opt.value"
              class="w-full px-2 py-1.5 text-xs text-left rounded hover:bg-muted flex items-center gap-2"
              @click="item.budgetStatus = opt.value as BudgetStatus; budgetStatusOpen = false">
              <Icon :name="opt.icon" class="h-3.5 w-3.5 text-muted-foreground" />
              <span class="flex-1">{{ opt.label }}</span>
              <Icon v-if="item.budgetStatus === opt.value" name="lucide:check" class="h-3.5 w-3.5 text-primary" />
            </button>
          </UiPopoverContent>
        </UiPopover>
      </div>
    </div>
  </div>
</template>
