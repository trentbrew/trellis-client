<script setup lang="ts">
  import FlowEditor from '~/components/Flow/FlowEditor.vue'
</script>

<template>
  <Page variant="canvas" :fill-height="true" title="Workflow Builder" subtitle="Workflow Layer">
    <FlowEditor />
  </Page>
</template>
