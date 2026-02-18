<script setup lang="ts">
  definePageMeta({
    title: 'Agent',
    icon: 'lucide:bot',
  })
</script>

<template>
  <Page
    variant="default"
    title="Agent"
    subtitle="Trellis"
    description="AI agent workspace"
    icon="lucide:bot"
    :hide-sidebar="true">
    <div class="flex flex-col items-center justify-center h-full min-h-[60vh] gap-6 text-center px-8">
      <div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
        <Icon name="lucide:bot" class="h-8 w-8 text-primary" />
      </div>
      <div class="space-y-2">
        <h2 class="text-2xl font-bold tracking-tight">Agent workspace</h2>
        <p class="text-muted-foreground max-w-sm">
          Agentic automation and AI tools are coming soon. Connect your MCP server to get started.
        </p>
      </div>
      <UiButton variant="outline" as-child>
        <a href="https://trigger.dev/docs" target="_blank" rel="noopener">
          <Icon name="lucide:external-link" class="mr-2 h-4 w-4" />
          Learn about agents
        </a>
      </UiButton>
    </div>
  </Page>
</template>
