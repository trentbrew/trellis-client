<script lang="ts" setup>
  interface Props {
    size?: number | string
    colorClass?: string
  }

  withDefaults(defineProps<Props>(), {
    size: 24,
    colorClass: 'text-primary',
  })
</script>

<template>
  <img :src="'/logo.png'" :width="size" :height="size" alt="Logo" class="object-contain" />
</template>
