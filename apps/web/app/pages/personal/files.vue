<script setup lang="ts">
  definePageMeta({
    layout: 'default',
  })
</script>

<template>
  <Page
    variant="browse"
    title="Files"
    subtitle="Personal"
    description="Attached files and documents."
    icon="lucide:paperclip"
    icon-class="text-cyan-300"
    :primary-action="{
      label: 'Upload File',
      icon: 'lucide:plus',
      type: 'click',
      onClick: () => {},
      variant: 'outline',
    }">
    <div class="flex flex-col items-center justify-center py-20 text-center">
      <Icon name="lucide:paperclip" class="h-12 w-12 text-muted-foreground/30 mb-4" />
      <h3 class="text-lg font-medium text-foreground mb-1">No files yet</h3>
      <p class="text-sm text-muted-foreground max-w-sm">
        Upload or attach files to keep your documents organized in one place.
      </p>
    </div>
  </Page>
</template>
