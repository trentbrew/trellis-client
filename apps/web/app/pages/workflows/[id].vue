<script setup lang="ts">
  definePageMeta({
    title: 'Workflow',
    layout: 'fullscreen',
    middleware: ['auth'],
  })

  const route = useRoute()
  const workflowId = computed(() => String(route.params.id || ''))

  const { currentApp, workflows, updateWorkflow } = useInstantData()

  const workflow = computed(() => {
    const id = workflowId.value
    if (!id) return null
    return (workflows.value || []).find((w) => w.id === id) || null
  })

  const isLoading = computed(() => !currentApp.value)
  const isSaving = ref(false)

  const handleSave = async () => {
    if (!workflow.value?.id) return
    isSaving.value = true
    try {
      await updateWorkflow(workflow.value.id, {
        name: workflow.value.name,
        description: workflow.value.description,
        icon: workflow.value.icon,
        trigger: workflow.value.trigger,
        active: workflow.value.active,
      })
    } finally {
      isSaving.value = false
    }
  }
</script>

<template>
  <Page variant="canvas" :title="workflow?.name || 'Workflow'" show-back-button subtitle="Workflow Layer">
    <template v-if="isLoading" #default>
      <div class="flex items-center justify-center h-full">
        <UiLoader />
      </div>
    </template>

    <template v-else-if="workflow" #default>
      <div class="space-y-6 p-6">
        <div class="space-y-2">
          <div class="flex items-center gap-2">
            <Icon :name="workflow?.icon || 'lucide:workflow'" class="h-5 w-5" />
            <h2 class="text-lg font-semibold">{{ workflow?.name }}</h2>
          </div>
          <p v-if="workflow?.description" class="text-muted-foreground text-sm">{{ workflow?.description }}</p>
        </div>

        <div class="border rounded p-4 text-center text-muted-foreground">
          <p>Workflow editor coming soon...</p>
        </div>

        <div class="flex gap-2">
          <UiButton :disabled="isSaving" @click="handleSave">
            {{ isSaving ? 'Saving...' : 'Save Changes' }}
          </UiButton>
          <UiButton variant="outline" as-child>
            <NuxtLink to="/workflows">Back to Workflows</NuxtLink>
          </UiButton>
        </div>
      </div>
    </template>

    <template v-else #default>
      <div class="flex items-center justify-center h-full">
        <div class="text-center">
          <Icon name="lucide:alert-circle" class="text-muted-foreground mx-auto mb-4 h-16 w-16" />
          <h2 class="mb-2 text-2xl font-bold">Workflow Not Found</h2>
          <UiButton as-child>
            <NuxtLink to="/workflows">Back to Workflows</NuxtLink>
          </UiButton>
        </div>
      </div>
    </template>
  </Page>
</template>
