<script setup>
  defineProps({
    title: { type: String, default: 'No Projects Yet' },
    description: {
      type: String,
      default: "You haven't created any projects yet. Get started by creating your first project.",
    },
    icon: { type: String, default: 'lucide:folder-code' },
  })
</script>

<template>
  <div class="flex items-center justify-center">
    <UiEmpty>
      <UiEmptyHeader>
        <UiEmptyMedia variant="icon">
          <Icon :name="icon" />
        </UiEmptyMedia>
        <UiEmptyTitle>{{ title }}</UiEmptyTitle>
        <UiEmptyDescription>
          {{ description }}
        </UiEmptyDescription>
      </UiEmptyHeader>
      <UiEmptyContent>
        <slot name="actions">
          <UiButton>Create Project</UiButton>
          <UiButton variant="outline">Import Project</UiButton>
        </slot>
      </UiEmptyContent>
      <slot name="footer">
        <UiButton variant="link" as-child size="sm">
          <a href="#" class="flex items-center gap-2 text-muted-foreground">
            Learn More
            <Icon name="lucide:arrow-up-right" />
          </a>
        </UiButton>
      </slot>
    </UiEmpty>
  </div>
</template>
