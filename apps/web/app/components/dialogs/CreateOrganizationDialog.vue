<script lang="ts" setup>
  const props = defineProps<{
    open: boolean
  }>()

  const emit = defineEmits<{
    'update:open': [value: boolean]
    created: [orgId: string]
  }>()

  const { createOrganization } = useInstantData()
  const { selectOrganization } = useOrganizations()

  const form = ref({
    name: '',
    slug: '',
    description: '',
  })

  const isCreating = ref(false)
  const slugManuallyEdited = ref(false)

  const slugify = (input: string) =>
    input
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

  watch(
    () => form.value.name,
    (name) => {
      if (!slugManuallyEdited.value) {
        form.value.slug = slugify(name)
      }
    },
  )

  const handleSlugInput = () => {
    slugManuallyEdited.value = true
  }

  const isFormValid = computed(() => !!form.value.name.trim() && !!form.value.slug.trim())

  const handleCreate = async () => {
    if (!isFormValid.value || isCreating.value) return

    isCreating.value = true
    try {
      const orgId = await createOrganization({
        ownerId: '',
        name: form.value.name.trim(),
        slug: slugify(form.value.slug || form.value.name),
        plan: 'free',
      })

      // Auto-select the newly created org
      // Wait a tick for the reactive subscription to pick it up
      await nextTick()
      setTimeout(() => {
        selectOrganization(orgId)
      }, 100)

      emit('created', orgId)
      emit('update:open', false)

      // Reset form
      form.value = { name: '', slug: '', description: '' }
      slugManuallyEdited.value = false
    } catch (e) {
      console.error('[CreateOrganizationDialog] Failed to create organization:', e)
    } finally {
      isCreating.value = false
    }
  }

  watch(
    () => props.open,
    (isOpen) => {
      if (isOpen) {
        form.value = { name: '', slug: '', description: '' }
        slugManuallyEdited.value = false
      }
    },
  )
</script>

<template>
  <UiDialog :open="open" @update:open="emit('update:open', $event)">
    <UiDialogContent class="sm:max-w-md">
      <UiDialogHeader>
        <UiDialogTitle class="flex items-center gap-2">
          <Icon name="lucide:building-2" class="h-5 w-5 text-muted-foreground" />
          New Organization
        </UiDialogTitle>
        <UiDialogDescription>
          Create a new organization. A default workspace app will be created automatically.
        </UiDialogDescription>
      </UiDialogHeader>

      <form class="space-y-4 py-2" @submit.prevent="handleCreate">
        <!-- Name -->
        <div class="space-y-1.5">
          <label for="org-name" class="text-sm font-medium">Name</label>
          <UiInput
            id="org-name"
            v-model="form.name"
            placeholder="Acme Corp"
            autofocus />
        </div>

        <!-- Slug -->
        <div class="space-y-1.5">
          <label for="org-slug" class="text-sm font-medium">Slug</label>
          <UiInput
            id="org-slug"
            v-model="form.slug"
            placeholder="acme-corp"
            @input="handleSlugInput" />
          <p class="text-xs text-muted-foreground">URL-friendly identifier, auto-generated from name</p>
        </div>

        <!-- Description -->
        <div class="space-y-1.5">
          <label for="org-desc" class="text-sm font-medium">Description <span class="text-muted-foreground font-normal">(optional)</span></label>
          <UiInput
            id="org-desc"
            v-model="form.description"
            placeholder="What does this organization do?" />
        </div>
      </form>

      <UiDialogFooter class="gap-2">
        <UiButton variant="outline" @click="emit('update:open', false)">Cancel</UiButton>
        <UiButton :disabled="!isFormValid || isCreating" @click="handleCreate">
          <Icon v-if="isCreating" name="lucide:loader-2" class="mr-2 h-4 w-4 animate-spin" />
          Create Organization
        </UiButton>
      </UiDialogFooter>
    </UiDialogContent>
  </UiDialog>
</template>
