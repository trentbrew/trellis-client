<script lang="ts" setup>
  const props = defineProps<{
    collapsed?: boolean
  }>()

  const emit = defineEmits<{
    'update:collapsed': [value: boolean]
  }>()

  const label = computed(() => (props.collapsed ? 'Expand sidebar' : 'Collapse sidebar'))

  function toggle() {
    emit('update:collapsed', !props.collapsed)
  }
</script>

<template>
  <UiButton
    variant="ghost"
    size="icon"
    class="h-7 w-7"
    data-testid="right-sidebar-toggle"
    :title="label"
    :aria-label="label"
    @click="toggle">
    <Icon :name="collapsed ? 'lucide:panel-right-open' : 'lucide:panel-right-close'" class="h-4 w-4" />
  </UiButton>
</template>
