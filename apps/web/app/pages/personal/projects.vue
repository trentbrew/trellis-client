<script setup lang="ts">
  definePageMeta({
    layout: 'default',
  })
</script>

<template>
  <Page
    variant="browse"
    title="Projects"
    subtitle="Personal"
    description="Your projects and initiatives."
    icon="lucide:folder-kanban"
    icon-class="text-orange-300"
    :primary-action="{
      label: 'New Project',
      icon: 'lucide:plus',
      type: 'click',
      onClick: () => {},
      variant: 'outline',
    }">
    <div class="flex flex-col items-center justify-center py-20 text-center">
      <Icon name="lucide:folder-kanban" class="h-12 w-12 text-muted-foreground/30 mb-4" />
      <h3 class="text-lg font-medium text-foreground mb-1">No projects yet</h3>
      <p class="text-sm text-muted-foreground max-w-sm">
        Create a project to organize related tasks, notes, and files together.
      </p>
    </div>
  </Page>
</template>
