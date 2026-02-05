<script setup lang="ts">
  definePageMeta({
    layout: 'default',
  })
</script>

<template>
  <Page
    title="My Calendar"
    subtitle="Personal"
    description="Upcoming deadlines and inspections across facilities."
    icon="lucide:calendar"
    icon-class="text-blue-300">
    <div class="rounded-xl border border-dashed border-border bg-muted/30 p-10 text-center">
      <Icon name="lucide:calendar-days" class="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
      <p class="text-sm text-muted-foreground">Calendar view placeholder</p>
      <p class="text-xs text-muted-foreground">Connect to scheduling data when ready.</p>
    </div>
  </Page>
</template>
