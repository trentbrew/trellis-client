<script setup lang="ts">
  definePageMeta({
    title: 'Members',
    icon: 'lucide:users',
  })
</script>

<template>
  <Page
    title="Members"
    subtitle="Team"
    description="Manage team members, roles, and permissions"
    icon="lucide:users"
    :hide-sidebar="true"
    :fill-height="true">
    <div class="flex h-full items-center justify-center">
      <div class="text-center">
        <Icon name="lucide:users" class="text-muted-foreground mx-auto mb-4 h-16 w-16" />
        <h2 class="mb-2 text-2xl font-bold">Coming Soon</h2>
        <p class="text-muted-foreground">Team member management with roles and permissions</p>
      </div>
    </div>
  </Page>
</template>
