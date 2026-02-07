<script setup lang="ts">
  import type { AdvancedFilterState, FilterRule } from '~/composables/useAdvancedFilters'
  import { operatorsByType } from '~/composables/useAdvancedFilters'

  const props = defineProps<{
    filters: AdvancedFilterState
  }>()

  function getOperators(fieldKey: string) {
    const field = props.filters.fields.find((f) => f.key === fieldKey)
    if (!field) return []
    return operatorsByType[field.type] || []
  }

  function getField(fieldKey: string) {
    return props.filters.fields.find((f) => f.key === fieldKey)
  }

  function operatorNeedsValue(fieldKey: string, operator: string) {
    const ops = getOperators(fieldKey)
    const op = ops.find((o) => o.value === operator)
    return op?.needsValue ?? false
  }

  function onFieldChange(rule: FilterRule, newKey: string) {
    rule.fieldKey = newKey
    const ops = getOperators(newKey)
    const first = ops[0]
    if (first) rule.operator = first.value
    rule.value = ''
  }
</script>

<template>
  <div class="space-y-3 min-w-[360px] max-w-[520px]">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <span class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Filters</span>
        <button
          v-if="filters.hasActiveFilters.value"
          class="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
          @click="filters.clearAll()">
          Clear all
        </button>
      </div>
      <div class="flex items-center gap-1">
        <button
          class="px-1.5 py-0.5 text-[11px] rounded transition-colors"
          :class="filters.state.value.conjunction === 'and' ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:text-foreground'"
          @click="filters.setConjunction('and')">
          And
        </button>
        <button
          class="px-1.5 py-0.5 text-[11px] rounded transition-colors"
          :class="filters.state.value.conjunction === 'or' ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:text-foreground'"
          @click="filters.setConjunction('or')">
          Or
        </button>
      </div>
    </div>

    <!-- Rules -->
    <div class="space-y-2">
      <div
        v-for="rule in filters.state.value.rules"
        :key="rule.id"
        class="flex items-center gap-1.5">
        <!-- Field selector -->
        <select
          :value="rule.fieldKey"
          class="h-7 rounded-md border border-border bg-card px-2 text-xs outline-none focus:ring-1 focus:ring-primary min-w-[100px]"
          @change="onFieldChange(rule, ($event.target as HTMLSelectElement).value)">
          <option v-for="f in filters.fields" :key="f.key" :value="f.key">{{ f.label }}</option>
        </select>

        <!-- Operator selector -->
        <select
          v-model="rule.operator"
          class="h-7 rounded-md border border-border bg-card px-2 text-xs outline-none focus:ring-1 focus:ring-primary min-w-[100px]">
          <option v-for="op in getOperators(rule.fieldKey)" :key="op.value" :value="op.value">{{ op.label }}</option>
        </select>

        <!-- Value input -->
        <template v-if="operatorNeedsValue(rule.fieldKey, rule.operator)">
          <!-- Select field → dropdown -->
          <select
            v-if="getField(rule.fieldKey)?.type === 'select' || getField(rule.fieldKey)?.type === 'multi_select'"
            v-model="rule.value"
            class="h-7 rounded-md border border-border bg-card px-2 text-xs outline-none focus:ring-1 focus:ring-primary min-w-[100px] flex-1">
            <option value="" disabled>Select...</option>
            <option
              v-for="opt in getField(rule.fieldKey)?.options"
              :key="opt.value"
              :value="opt.value">
              {{ opt.label }}
            </option>
          </select>

          <!-- Date field → date input -->
          <input
            v-else-if="getField(rule.fieldKey)?.type === 'date'"
            v-model="rule.value"
            type="date"
            class="h-7 rounded-md border border-border bg-card px-2 text-xs outline-none focus:ring-1 focus:ring-primary min-w-[120px] flex-1" />

          <!-- Number field → number input -->
          <input
            v-else-if="getField(rule.fieldKey)?.type === 'number'"
            v-model="rule.value"
            type="number"
            placeholder="Value..."
            class="h-7 rounded-md border border-border bg-card px-2 text-xs outline-none focus:ring-1 focus:ring-primary min-w-[80px] flex-1" />

          <!-- Text field → text input -->
          <input
            v-else
            v-model="rule.value"
            type="text"
            placeholder="Value..."
            class="h-7 rounded-md border border-border bg-card px-2 text-xs outline-none focus:ring-1 focus:ring-primary min-w-[80px] flex-1" />
        </template>

        <!-- Remove rule -->
        <button
          class="h-7 w-7 shrink-0 flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-muted transition-colors"
          @click="filters.removeRule(rule.id)">
          <Icon name="lucide:x" class="h-3 w-3" />
        </button>
      </div>

      <!-- Groups -->
      <div
        v-for="group in filters.state.value.groups"
        :key="group.id"
        class="rounded-lg border border-border/50 bg-muted/20 p-2 space-y-1.5">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-1">
            <button
              class="px-1.5 py-0.5 text-[10px] rounded transition-colors"
              :class="group.conjunction === 'and' ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:text-foreground'"
              @click="group.conjunction = 'and'">
              And
            </button>
            <button
              class="px-1.5 py-0.5 text-[10px] rounded transition-colors"
              :class="group.conjunction === 'or' ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:text-foreground'"
              @click="group.conjunction = 'or'">
              Or
            </button>
          </div>
          <button
            class="h-5 w-5 flex items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-muted transition-colors"
            @click="filters.removeGroup(group.id)">
            <Icon name="lucide:x" class="h-3 w-3" />
          </button>
        </div>
        <div
          v-for="rule in group.rules"
          :key="rule.id"
          class="flex items-center gap-1.5">
          <select
            :value="rule.fieldKey"
            class="h-7 rounded-md border border-border bg-card px-2 text-xs outline-none focus:ring-1 focus:ring-primary min-w-[100px]"
            @change="onFieldChange(rule, ($event.target as HTMLSelectElement).value)">
            <option v-for="f in filters.fields" :key="f.key" :value="f.key">{{ f.label }}</option>
          </select>
          <select
            v-model="rule.operator"
            class="h-7 rounded-md border border-border bg-card px-2 text-xs outline-none focus:ring-1 focus:ring-primary min-w-[100px]">
            <option v-for="op in getOperators(rule.fieldKey)" :key="op.value" :value="op.value">{{ op.label }}</option>
          </select>
          <template v-if="operatorNeedsValue(rule.fieldKey, rule.operator)">
            <select
              v-if="getField(rule.fieldKey)?.type === 'select' || getField(rule.fieldKey)?.type === 'multi_select'"
              v-model="rule.value"
              class="h-7 rounded-md border border-border bg-card px-2 text-xs outline-none focus:ring-1 focus:ring-primary min-w-[100px] flex-1">
              <option value="" disabled>Select...</option>
              <option v-for="opt in getField(rule.fieldKey)?.options" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
            </select>
            <input
              v-else-if="getField(rule.fieldKey)?.type === 'date'"
              v-model="rule.value"
              type="date"
              class="h-7 rounded-md border border-border bg-card px-2 text-xs outline-none focus:ring-1 focus:ring-primary min-w-[120px] flex-1" />
            <input
              v-else
              v-model="rule.value"
              type="text"
              placeholder="Value..."
              class="h-7 rounded-md border border-border bg-card px-2 text-xs outline-none focus:ring-1 focus:ring-primary min-w-[80px] flex-1" />
          </template>
          <button
            class="h-7 w-7 shrink-0 flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-muted transition-colors"
            @click="filters.removeRule(rule.id)">
            <Icon name="lucide:x" class="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <p v-if="!filters.state.value.rules.length && !filters.state.value.groups.length" class="text-xs text-muted-foreground text-center py-2">
      No filters applied. Click below to add one.
    </p>

    <!-- Add actions -->
    <div class="flex items-center gap-2 pt-1 border-t border-border">
      <button
        class="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
        @click="filters.addRule()">
        <Icon name="lucide:plus" class="h-3 w-3" />
        Add filter
      </button>
      <button
        class="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
        @click="filters.addGroup()">
        <Icon name="lucide:folder-plus" class="h-3 w-3" />
        Add group
      </button>
    </div>
  </div>
</template>
