<script setup lang="ts">
  import { workflowTemplates } from '~/data/workflowTemplates'
  import type { WorkflowTemplate } from '~/data/workflowTemplates'

  definePageMeta({
    middleware: ['auth'],
  })

  const router = useRouter()
  const { currentApp, workflows, createWorkflow } = useInstantData()

  const creating = ref<string | null>(null)

  const handleCreate = async () => {
    creating.value = 'blank'
    const id = await createWorkflow({ name: 'Untitled Workflow', icon: 'lucide:workflow', active: true })
    await router.push(`/workflows/${id}`)
    creating.value = null
  }

  const handleCreateFromTemplate = async (tpl: WorkflowTemplate) => {
    creating.value = tpl.id
    const id = await createWorkflow({
      name: tpl.name,
      description: tpl.description,
      icon: tpl.icon,
      trigger: tpl.trigger,
      active: false,
      graph: tpl.graph,
    })
    await router.push(`/workflows/${id}`)
    creating.value = null
  }

  const triggerLabel: Record<string, string> = {
    manual: 'Manual',
    schedule: 'Scheduled',
    webhook: 'Webhook',
    event: 'Event',
  }

  const triggerColor: Record<string, string> = {
    manual: 'bg-zinc-500/15 text-zinc-400',
    schedule: 'bg-blue-500/15 text-blue-400',
    webhook: 'bg-violet-500/15 text-violet-400',
    event: 'bg-amber-500/15 text-amber-400',
  }
</script>

<template>
  <Page
    variant="default"
    title="Workflows"
    subtitle="Workflow Layer"
    description="Automations and orchestration"
    icon="lucide:workflow"
    :fill-height="true">

    <!-- No app selected -->
    <div v-if="!currentApp" class="flex h-full items-center justify-center p-8">
      <div class="text-center max-w-md">
        <Icon name="lucide:workflow" class="text-muted-foreground mx-auto h-16 w-16 mb-4" />
        <h3 class="text-lg font-semibold mb-2">Select an app</h3>
        <p class="text-muted-foreground text-sm">Choose an application to view its workflows.</p>
      </div>
    </div>

    <!-- Template picker (shown for both empty and non-empty states) -->
    <div v-else class="flex h-full flex-col overflow-y-auto">
      <div class="px-8 pt-8 pb-6">
        <h2 class="text-xl font-bold tracking-tight mb-1">
          {{ (workflows?.length || 0) === 0 ? 'Get started' : 'New Workflow' }}
        </h2>
        <p class="text-muted-foreground text-sm">
          {{ (workflows?.length || 0) === 0
            ? 'Automate tasks, run agents, and connect your data — pick a template or start blank.'
            : 'Choose a template or start from scratch.' }}
        </p>
      </div>

      <div class="px-8 pb-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <!-- Blank -->
        <button
          class="group relative flex flex-col gap-3 rounded-xl border border-border bg-card p-5 text-left transition-all hover:border-primary/50 hover:bg-primary/5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50"
          :disabled="creating !== null"
          @click="handleCreate">
          <div class="flex items-center justify-between">
            <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
              <Icon name="lucide:plus" class="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <span class="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-zinc-500/15 text-zinc-400">Blank</span>
          </div>
          <div>
            <p class="font-semibold text-sm leading-tight mb-1">Blank Workflow</p>
            <p class="text-xs text-muted-foreground leading-snug">Start from a single Start node and build your own flow.</p>
          </div>
          <div v-if="creating === 'blank'" class="absolute inset-0 flex items-center justify-center rounded-xl bg-background/60 backdrop-blur-sm">
            <Icon name="lucide:loader-circle" class="h-5 w-5 animate-spin text-primary" />
          </div>
        </button>

        <!-- Template cards -->
        <button
          v-for="tpl in workflowTemplates"
          :key="tpl.id"
          class="group relative flex flex-col gap-3 rounded-xl border border-border bg-card p-5 text-left transition-all hover:border-primary/50 hover:bg-primary/5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50"
          :disabled="creating !== null"
          @click="handleCreateFromTemplate(tpl)">
          <div class="flex items-center justify-between">
            <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
              <Icon :name="tpl.icon" class="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <span :class="['text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full', triggerColor[tpl.trigger]]">
              {{ triggerLabel[tpl.trigger] }}
            </span>
          </div>
          <div>
            <p class="font-semibold text-sm leading-tight mb-1">{{ tpl.name }}</p>
            <p class="text-xs text-muted-foreground leading-snug">{{ tpl.description }}</p>
          </div>
          <div class="flex flex-wrap gap-1 mt-auto">
            <span v-for="tag in tpl.tags" :key="tag" class="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{{ tag }}</span>
          </div>
          <div v-if="creating === tpl.id" class="absolute inset-0 flex items-center justify-center rounded-xl bg-background/60 backdrop-blur-sm">
            <Icon name="lucide:loader-circle" class="h-5 w-5 animate-spin text-primary" />
          </div>
        </button>
      </div>
    </div>
  </Page>
</template>
