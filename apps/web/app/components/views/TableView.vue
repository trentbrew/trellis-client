<script setup lang="ts">
  import CollectionDataTableProjection from '~/components/data/CollectionDataTableProjection.vue'

  const props = defineProps<{
    collectionId: string
    modelValue?: string
  }>()

  const emit = defineEmits<{
    'update:modelValue': [value: string]
  }>()

  const tableProjectionRef = ref<InstanceType<typeof CollectionDataTableProjection> | null>(null)

  const scrollToTop = () => {
    tableProjectionRef.value?.scrollToTop?.()
  }

  defineExpose({ scrollToTop })
</script>

<template>
  <CollectionDataTableProjection
    ref="tableProjectionRef"
    :collection-id="props.collectionId"
    :model-value="props.modelValue"
    @update:model-value="(v) => emit('update:modelValue', v)" />
</template>
