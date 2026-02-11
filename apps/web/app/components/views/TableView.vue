<script setup lang="ts">
  import CollectionDataTableProjection from '~/components/data/CollectionDataTableProjection.vue'
  import type { DatabaseSchema } from '~/types/database'

  const props = defineProps<{
    collectionId: string
    modelValue?: string
    schema?: DatabaseSchema | null
  }>()

  const emit = defineEmits<{
    'update:modelValue': [value: string]
    'update:schema': [schema: DatabaseSchema]
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
    :schema="props.schema"
    @update:model-value="(v) => emit('update:modelValue', v)"
    @update:schema="(s: DatabaseSchema) => emit('update:schema', s)" />
</template>
