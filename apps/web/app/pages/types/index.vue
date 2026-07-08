<script setup lang="ts">
  /**
   * Legacy redirect: /types → /ontologies.
   * CustomType settings are deprecated in favor of user-tier TQL ontologies.
   */
  definePageMeta({
    title: 'Types',
    icon: 'lucide:blocks',
    middleware: ['auth'],
    layout: 'fullscreen',
  })

  const { wp } = useWorkspacePath()

  onMounted(() => {
    void navigateTo(wp('/ontologies'), { replace: true })
  })
</script>

<template>
  <div class="flex h-full items-center justify-center">
    <Icon name="lucide:loader-2" class="h-8 w-8 animate-spin text-muted-foreground" />
  </div>
</template>
