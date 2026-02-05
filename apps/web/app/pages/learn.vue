<script setup lang="ts">
  definePageMeta({
    title: 'Academy',
    icon: 'lucide:graduation-cap',
  })
</script>

<template>
  <Page
    variant="prose"
    title="Learning Center"
    subtitle="Academy"
    description="Learn how to use Platform Sandbox"
    icon="lucide:graduation-cap">
    <div class="max-w-2xl mx-auto text-center space-y-4">
      <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
        <Icon name="lucide:graduation-cap" class="w-8 h-8 text-gray-400" />
      </div>
      <p class="text-muted-foreground">Content coming soon.</p>
      <div class="pt-4">
        <UiButton variant="outline" to="/welcome">Back to Welcome</UiButton>
      </div>
    </div>
  </Page>
</template>
