<script lang="ts" setup>
  const isOpen = defineModel<boolean>('open', { default: false })

  const emit = defineEmits<{
    created: [space: { title: string; icon: string; slug: string }]
  }>()

  const form = reactive({
    title: '',
    icon: 'lucide:folder',
    slug: '',
  })

  const isIconPickerOpen = ref(false)

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
  }

  watch(
    () => form.title,
    (newTitle) => {
      form.slug = generateSlug(newTitle)
    },
  )

  const handleSubmit = () => {
    if (!form.title.trim() || !form.slug.trim()) return

    emit('created', {
      title: form.title.trim(),
      icon: form.icon,
      slug: form.slug.trim(),
    })

    form.title = ''
    form.icon = 'lucide:folder'
    form.slug = ''
    isOpen.value = false
  }

  const handleClose = () => {
    form.title = ''
    form.icon = 'lucide:folder'
    form.slug = ''
    isOpen.value = false
  }
</script>

<template>
  <UiDialog v-model:open="isOpen">
    <UiDialogContent class="sm:max-w-md">
      <UiDialogHeader>
        <UiDialogTitle>Create New Space</UiDialogTitle>
        <UiDialogDescription>Add a new space to your application rail.</UiDialogDescription>
      </UiDialogHeader>

      <form class="space-y-4" @submit.prevent="handleSubmit">
        <div class="space-y-2">
          <label for="space-title" class="text-sm font-medium">Title</label>
          <input
            id="space-title"
            v-model="form.title"
            type="text"
            class="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
            placeholder="My Space"
            required />
        </div>

        <div class="space-y-2">
          <label for="space-slug" class="text-sm font-medium">Slug (URL path)</label>
          <input
            id="space-slug"
            v-model="form.slug"
            type="text"
            class="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
            placeholder="my-space"
            pattern="[a-z0-9\-]+"
            required
            readonly />
          <p class="text-muted-foreground text-xs">Auto-generated from title</p>
        </div>

        <div class="space-y-2">
          <label class="text-sm font-medium">Icon</label>
          <div class="flex items-center gap-2">
            <button
              type="button"
              class="hover:bg-accent flex h-12 w-12 items-center justify-center rounded-md border transition-colors"
              :class="{ 'border-primary bg-accent': form.icon }"
              @click="isIconPickerOpen = true">
              <Icon :name="form.icon" class="h-5 w-5" />
            </button>
            <span class="text-sm text-muted-foreground">Click to choose icon</span>
          </div>
          <IconPicker
            v-model:open="isIconPickerOpen"
            :model-value="form.icon"
            @update:model-value="form.icon = $event" />
        </div>

        <UiDialogFooter>
          <UiButton type="button" variant="outline" @click="handleClose">Cancel</UiButton>
          <UiButton type="submit">Create Space</UiButton>
        </UiDialogFooter>
      </form>
    </UiDialogContent>
  </UiDialog>
</template>
