<script setup lang="ts">
  definePageMeta({
    title: 'Formula Playground',
    middleware: ['auth'],
  })
</script>

<template>
  <Page :full-width="true">
    <FormulaTestPlayground />
  </Page>
</template>
