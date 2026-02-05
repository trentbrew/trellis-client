<script setup lang="ts">
  definePageMeta({
    middleware: ['auth'],
  })

  const router = useRouter()
  const { currentApp, workflows, createWorkflow } = useInstantData()

  const handleCreate = async () => {
    const id = await createWorkflow({ name: 'Untitled Workflow', icon: 'lucide:workflow', active: true })
    await router.push(`/workflows/${id}`)
  }
</script>

<template>
  <Page
    variant="sidebar"
    title="Workflows"
    subtitle="Workflow Layer"
    description="Automations and orchestration"
    icon="lucide:workflow"
    :fill-height="true"
    :left-sidebar="(workflows?.length || 0) > 0">
    <template v-if="(workflows?.length || 0) > 0" #sidebar>
      <AppSidebar />
    </template>

    <div v-if="!currentApp" class="flex h-full items-center justify-center p-8">
      <div class="text-center max-w-md">
        <Icon name="lucide:workflow" class="text-muted-foreground mx-auto h-16 w-16 mb-4" />
        <h3 class="text-lg font-semibold mb-2">Select an app</h3>
        <p class="text-muted-foreground text-sm">Choose an application to view its workflows.</p>
      </div>
    </div>

    <div v-else-if="(workflows?.length || 0) === 0" class="flex h-full items-center justify-center p-8">
      <div class="text-center max-w-md">
        <Icon name="lucide:workflow" class="text-muted-foreground mx-auto h-16 w-16 mb-4" />
        <h3 class="text-lg font-semibold mb-2">No Workflows Yet</h3>
        <p class="text-muted-foreground text-sm mb-6">Create your first workflow for this application.</p>
        <UiButton @click="handleCreate">Create Workflow</UiButton>
      </div>
    </div>

    <div v-else class="flex h-full items-center justify-center p-8">
      <div class="text-center">
        <Icon name="lucide:workflow" class="text-muted-foreground mx-auto mb-4 h-16 w-16" />
        <h2 class="mb-2 text-2xl font-bold">Workflows</h2>
        <p class="text-muted-foreground mb-4">Select a workflow from the sidebar to view and edit</p>
        <UiButton variant="outline" @click="handleCreate">New workflow</UiButton>
      </div>
    </div>
  </Page>
</template>
