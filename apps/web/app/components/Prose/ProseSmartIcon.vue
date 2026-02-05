<script lang="ts" setup>
  defineProps<{
    name: string
    className?: string
  }>()
</script>

<template>
  <Icon :name="name" :class="['inline-block h-4 w-4 align-middle', className]" />
</template>
