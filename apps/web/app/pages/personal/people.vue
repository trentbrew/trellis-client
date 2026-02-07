<script setup lang="ts">
  definePageMeta({
    layout: 'default',
  })
</script>

<template>
  <Page
    variant="browse"
    title="People"
    subtitle="Personal"
    description="Contacts and collaborators."
    icon="lucide:users"
    icon-class="text-pink-300"
    :primary-action="{
      label: 'Add Person',
      icon: 'lucide:plus',
      type: 'click',
      onClick: () => {},
      variant: 'outline',
    }">
    <div class="flex flex-col items-center justify-center py-20 text-center">
      <Icon name="lucide:users" class="h-12 w-12 text-muted-foreground/30 mb-4" />
      <h3 class="text-lg font-medium text-foreground mb-1">No people yet</h3>
      <p class="text-sm text-muted-foreground max-w-sm">
        Add contacts and collaborators to keep track of who you work with.
      </p>
    </div>
  </Page>
</template>
