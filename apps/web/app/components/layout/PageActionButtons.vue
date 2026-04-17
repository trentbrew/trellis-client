<script setup lang="ts">
import type { PageAction } from './Page.vue'

interface Props {
  actions: (PageAction | undefined)[]
  size?: 'xs' | 'sm' | 'default' | 'lg'
  onActionClick: (action: PageAction) => void
}

const props = withDefaults(defineProps<Props>(), {
  size: 'sm',
})

const validActions = computed(() => props.actions.filter((a): a is PageAction => a !== undefined))
</script>

<template>
  <template v-for="action in validActions" :key="action.label">
    <UiButton :variant="action.variant || 'outline'" :size="size" :disabled="action.disabled"
      :loading="action.isLoading" class="gap-2" :class="action.variant === 'default' ? 'bg-accent!' : ''"
      @click="onActionClick(action)">
      <Icon v-if="action.icon" :name="action.icon" class="h-4 w-4" />
      <span>{{ action.label }}</span>
    </UiButton>
  </template>
</template>
