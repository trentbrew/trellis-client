<script setup lang="ts">
  import FlowEditor from '~/components/Flow/FlowEditor.vue'

  definePageMeta({
    title: 'Workflow',
    layout: 'fullscreen',
    middleware: ['auth'],
  })

  const route = useRoute()
  const router = useRouter()
  const workflowId = computed(() => String(route.params.id || ''))

  const { currentApp, workflows, updateWorkflow, deleteWorkflow } = useInstantData()

  const workflow = computed(() => {
    const id = workflowId.value
    if (!id) return null
    return (workflows.value || []).find((w) => w.id === id) || null
  })

  const isLoading = computed(() => !currentApp.value)

  // Inline title editing
  const isEditingTitle = ref(false)
  const editTitle = ref('')

  function startEditTitle() {
    editTitle.value = workflow.value?.name || ''
    isEditingTitle.value = true
    nextTick(() => {
      const input = document.querySelector('.workflow-title-input') as HTMLInputElement
      input?.focus()
      input?.select()
    })
  }

  async function commitTitle() {
    isEditingTitle.value = false
    if (!workflow.value || !editTitle.value.trim()) return
    if (editTitle.value.trim() !== workflow.value.name) {
      await updateWorkflow(workflow.value.id, { name: editTitle.value.trim() })
    }
  }

  // Active toggle
  async function toggleActive() {
    if (!workflow.value) return
    await updateWorkflow(workflow.value.id, { active: !workflow.value.active })
  }

  // Delete
  async function handleDelete() {
    if (!workflow.value) return
    await deleteWorkflow(workflow.value.id)
    await router.push('/workflows')
  }
</script>

<template>
  <div class="flex h-full flex-col">
    <!-- Not found state -->
    <template v-if="!isLoading && !workflow">
      <div class="flex flex-1 items-center justify-center">
        <div class="text-center">
          <Icon name="lucide:alert-circle" class="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
          <h2 class="mb-2 text-2xl font-bold">Workflow Not Found</h2>
          <UiButton as-child>
            <NuxtLink to="/workflows">Back to Workflows</NuxtLink>
          </UiButton>
        </div>
      </div>
    </template>

    <!-- Loading -->
    <template v-else-if="isLoading">
      <div class="flex flex-1 items-center justify-center">
        <UiLoader />
      </div>
    </template>

    <!-- Editor -->
    <template v-else-if="workflow">
      <!-- Header bar -->
      <div class="flex h-11 shrink-0 items-center gap-2 border-b border-border bg-background px-3">
        <UiButton variant="ghost" size="icon-sm" as-child>
          <NuxtLink to="/workflows">
            <Icon name="lucide:arrow-left" class="h-4 w-4" />
          </NuxtLink>
        </UiButton>

        <div class="flex items-center gap-1.5">
          <Icon :name="workflow.icon || 'lucide:workflow'" class="h-4 w-4 text-muted-foreground" />
          <template v-if="isEditingTitle">
            <input
              v-model="editTitle"
              class="workflow-title-input rounded border-none bg-transparent px-1 py-0.5 text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-ring"
              @blur="commitTitle"
              @keydown.enter="commitTitle"
              @keydown.escape="isEditingTitle = false" />
          </template>
          <template v-else>
            <button
              type="button"
              class="rounded px-1 py-0.5 text-sm font-semibold hover:bg-muted"
              @click="startEditTitle">
              {{ workflow.name }}
            </button>
          </template>
        </div>

        <div class="flex-1" />

        <!-- Active toggle -->
        <div class="flex items-center gap-1.5">
          <span class="text-xs text-muted-foreground">{{ workflow.active ? 'Active' : 'Inactive' }}</span>
          <button
            type="button"
            :class="[
              'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
              workflow.active ? 'bg-green-500' : 'bg-muted',
            ]"
            @click="toggleActive">
            <span
              :class="[
                'pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform',
                workflow.active ? 'translate-x-4' : 'translate-x-0',
              ]" />
          </button>
        </div>

        <!-- Menu -->
        <UiDropdownMenu>
          <UiDropdownMenuTrigger as-child>
            <UiButton variant="ghost" size="icon-sm">
              <Icon name="lucide:more-horizontal" class="h-4 w-4" />
            </UiButton>
          </UiDropdownMenuTrigger>
          <UiDropdownMenuContent align="end">
            <UiDropdownMenuItem class="text-destructive" @click="handleDelete">
              <Icon name="lucide:trash-2" class="mr-2 h-4 w-4" />
              Delete Workflow
            </UiDropdownMenuItem>
          </UiDropdownMenuContent>
        </UiDropdownMenu>
      </div>

      <!-- Flow canvas -->
      <div class="flex-1 overflow-hidden">
        <FlowEditor :workflow-id="workflowId" />
      </div>
    </template>
  </div>
</template>
