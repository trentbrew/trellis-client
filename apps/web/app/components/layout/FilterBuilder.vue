<script setup lang="ts">
  import type { AdvancedFilterState, FilterConjunction, FilterGroup } from '~/composables/useAdvancedFilters'
  import { createRule } from '~/composables/useAdvancedFilters'
  import FilterRule from '~/components/filters/FilterRule.vue'

  const props = defineProps<{
    filters: AdvancedFilterState
  }>()

  function addRuleToGroup(group: FilterGroup) {
    group.rules.push(createRule(props.filters.fields[0]?.key || ''))
  }

  function removeRuleFromGroup(group: FilterGroup, ruleId: string) {
    const idx = group.rules.findIndex((r) => r.id === ruleId)
    if (idx !== -1) group.rules.splice(idx, 1)
    if (group.rules.length === 0 && group.groups.length === 0) {
      props.filters.removeGroup(group.id)
    }
  }

  function setGroupConjunction(group: FilterGroup, c: string) {
    group.conjunction = c as FilterConjunction
  }
</script>

<template>
  <div class="space-y-2 min-w-[520px]">
    <div v-if="filters.hasActiveFilters.value" class="flex items-center justify-between mb-1">
      <span class="text-xs font-medium text-primary">
        <Icon name="lucide:filter" class="inline h-3 w-3 mr-1" />
        {{ filters.activeRuleCount.value }} {{ filters.activeRuleCount.value === 1 ? 'rule' : 'rules' }}
      </span>
      <button
        type="button"
        class="text-xs text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1"
        @click="filters.clearAll()">
        <Icon name="lucide:trash-2" class="h-3 w-3" />
        Delete filter
      </button>
    </div>

    <div v-for="(rule, idx) in filters.state.value.rules" :key="rule.id">
      <FilterRule
        :rule="rule"
        :fields="filters.fields"
        :show-conjunction="idx > 0"
        :conjunction="filters.state.value.conjunction"
        @update:conjunction="filters.setConjunction($event as FilterConjunction)"
        @remove="filters.removeRule(rule.id)" />
    </div>

    <div
      v-for="group in filters.state.value.groups"
      :key="group.id"
      class="ml-[68px] rounded-lg border border-border bg-muted/30 p-2.5 space-y-2">
      <div class="flex items-center gap-2 mb-1">
        <UiSelect
          :model-value="filters.state.value.conjunction"
          @update:model-value="filters.setConjunction($event as FilterConjunction)">
          <UiSelectTrigger class="h-6 w-[52px] text-[11px] px-1.5 bg-muted/50 border-0 font-medium">
            <UiSelectValue />
          </UiSelectTrigger>
          <UiSelectContent>
            <UiSelectItem value="and">And</UiSelectItem>
            <UiSelectItem value="or">Or</UiSelectItem>
          </UiSelectContent>
        </UiSelect>
      </div>

      <div v-for="(rule, rIdx) in group.rules" :key="rule.id">
        <FilterRule
          :rule="rule"
          :fields="filters.fields"
          :show-conjunction="rIdx > 0"
          :conjunction="group.conjunction"
          @update:conjunction="setGroupConjunction(group, $event)"
          @remove="removeRuleFromGroup(group, rule.id)" />
      </div>

      <button
        type="button"
        class="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors ml-[68px] mt-1"
        @click="addRuleToGroup(group)">
        <Icon name="lucide:plus" class="h-3 w-3" />
        Add filter rule
      </button>
    </div>

    <div class="flex items-center gap-3 pt-1">
      <button
        type="button"
        class="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        @click="filters.addRule()">
        <Icon name="lucide:plus" class="h-3.5 w-3.5" />
        Add filter rule
      </button>
      <button
        type="button"
        class="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        @click="filters.addGroup()">
        <Icon name="lucide:plus" class="h-3.5 w-3.5" />
        Add filter group
      </button>
    </div>
  </div>
</template>
