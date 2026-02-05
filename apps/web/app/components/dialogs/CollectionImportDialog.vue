<script setup lang="ts">
  import type { Collection } from '~/types/database'
  import { TrellisDocumentSchema, isTrellisDocument } from '~/lib/trellis'

  const props = defineProps<{
    open: boolean
  }>()

  const emit = defineEmits<{
    'update:open': [value: boolean]
    imported: [collection: Collection]
  }>()

  const { createCollection, updateCollection, collections, currentApp } = useInstantData()
  const { importTrellis } = useTrellisAdapter()
  const nuxtApp = useNuxtApp()

  const importMethod = ref<'url' | 'file'>('url')
  const importUrl = ref('')
  const importFile = ref<File | null>(null)
  const collectionTitle = ref('')
  const isImporting = ref(false)
  const importError = ref('')

  const resetForm = () => {
    importMethod.value = 'url'
    importUrl.value = ''
    importFile.value = null
    collectionTitle.value = ''
    importError.value = ''
  }

  const handleFileChange = (event: Event) => {
    const target = event.target as HTMLInputElement
    if (target.files && target.files[0]) {
      importFile.value = target.files[0]
      // Auto-generate title from filename
      const name = target.files[0].name.replace(/\.[^/.]+$/, '')
      collectionTitle.value = name
    }
  }

  const validateTrellis = (content: string): boolean => {
    try {
      const parsed = JSON.parse(content)
      const doc = TrellisDocumentSchema.safeParse(parsed)
      return doc.success && isTrellisDocument(doc.data)
    } catch {
      return false
    }
  }

  const slugify = (input: string) => {
    return input
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  }

  const validateJsonLd = (content: string): boolean => {
    try {
      const parsed = JSON.parse(content)
      if (Array.isArray(parsed)) return parsed.length > 0
      if (parsed && typeof parsed === 'object' && Array.isArray((parsed as any)['@graph'])) {
        return (parsed as any)['@graph'].length > 0
      }
      return false
    } catch {
      return false
    }
  }

  const detectFormat = (content: string): 'trellis' | 'jsonld-array' | 'unknown' => {
    if (validateTrellis(content)) return 'trellis'
    if (validateJsonLd(content)) return 'jsonld-array'
    return 'unknown'
  }

  const importFromUrl = async (): Promise<string> => {
    const response = await fetch(importUrl.value)
    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.statusText}`)
    }
    return await response.text()
  }

  const importFromFile = async (): Promise<string> => {
    if (!importFile.value) {
      throw new Error('No file selected')
    }
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        if (e.target?.result) {
          resolve(e.target.result as string)
        } else {
          reject(new Error('Failed to read file'))
        }
      }
      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsText(importFile.value!)
    })
  }

  const handleImport = async () => {
    if (!currentApp.value) {
      importError.value = 'No active app. Please finish onboarding and try again.'
      return
    }
    if (!collectionTitle.value) return

    isImporting.value = true
    importError.value = ''

    try {
      // Get JSON-LD content
      let content = ''
      if (importMethod.value === 'url') {
        content = await importFromUrl()
      } else {
        content = await importFromFile()
      }

      const format = detectFormat(content)

      if (format === 'trellis') {
        const doc = JSON.parse(content)
        const id = await importTrellis(doc, { title: collectionTitle.value })
        const collection = collections.value.find((c) => c.id === id)
        if (collection) {
          emit('imported', collection)
          await navigateTo(`/collections/${collection.slug}`)
        }
        ;(nuxtApp as any).$toast?.success('Imported Trellis document')
      } else if (format === 'jsonld-array') {
        const baseSlug = slugify(collectionTitle.value)
        const uniqueSlug = collections.value.some((c) => c.slug === baseSlug) ? `${baseSlug}-${Date.now()}` : baseSlug
        // Create collection with imported content
        const collectionId = await createCollection({
          appId: currentApp.value.id,
          title: collectionTitle.value,
          icon: 'lucide:upload',
          type: 'database',
          slug: uniqueSlug,
          order: collections.value.length,
          isPublished: false,
          createdBy: 'current-user',
        })

        // Update the collection with the imported content
        await updateCollection(collectionId, { content })

        // Find the newly created collection
        const collection = collections.value.find((c) => c.id === collectionId)
        if (collection) {
          emit('imported', collection)
          await navigateTo(`/collections/${collection.slug}`)
        }
        ;(nuxtApp as any).$toast?.success('Imported JSON-LD')
      } else {
        throw new Error('Unsupported format. Expected Trellis JSON or a JSON-LD array.')
      }

      resetForm()
      emit('update:open', false)
    } catch (error) {
      importError.value = error instanceof Error ? error.message : 'Import failed'
    } finally {
      isImporting.value = false
    }
  }

  const closeModal = () => {
    resetForm()
    emit('update:open', false)
  }
</script>

<template>
  <UiDialog :open="props.open" @update:open="closeModal">
    <UiDialogContent class="max-w-2xl">
      <UiDialogHeader>
        <UiDialogTitle>Import Collection</UiDialogTitle>
        <UiDialogDescription>Import a collection from a JSON-LD file or URL</UiDialogDescription>
      </UiDialogHeader>

      <div class="space-y-6 py-4">
        <!-- Import Method -->
        <div class="space-y-2">
          <label class="text-sm font-medium">Import Method</label>
          <div class="grid grid-cols-2 gap-3">
            <button
              type="button"
              class="border-border hover:bg-accent flex flex-col items-start gap-2 rounded-lg border p-3 text-left transition-colors"
              :class="{ 'border-primary bg-accent': importMethod === 'url' }"
              @click="importMethod = 'url'">
              <div class="flex items-center gap-2">
                <Icon name="lucide:link" class="h-4 w-4" />
                <span class="text-sm font-medium">From URL</span>
              </div>
              <p class="text-muted-foreground text-xs">Import from a remote JSON-LD file</p>
            </button>
            <button
              type="button"
              class="border-border hover:bg-accent flex flex-col items-start gap-2 rounded-lg border p-3 text-left transition-colors"
              :class="{ 'border-primary bg-accent': importMethod === 'file' }"
              @click="importMethod = 'file'">
              <div class="flex items-center gap-2">
                <Icon name="lucide:file-text" class="h-4 w-4" />
                <span class="text-sm font-medium">From File</span>
              </div>
              <p class="text-muted-foreground text-xs">Upload a JSON-LD file from your device</p>
            </button>
          </div>
        </div>

        <!-- URL Input -->
        <div v-if="importMethod === 'url'" class="space-y-2">
          <label class="text-sm font-medium">JSON-LD URL</label>
          <UiInput
            v-model="importUrl"
            type="url"
            placeholder="https://example.com/data.jsonld"
            :disabled="isImporting" />
          <p class="text-muted-foreground text-xs">
            The URL should point to a valid JSON-LD file containing an array of objects
          </p>
        </div>

        <!-- File Input -->
        <div v-if="importMethod === 'file'" class="space-y-2">
          <label class="text-sm font-medium">JSON-LD File</label>
          <UiInput type="file" accept=".json,.jsonld,.trellis" :disabled="isImporting" @change="handleFileChange" />
          <p class="text-muted-foreground text-xs">Select a JSON-LD file containing an array of objects</p>
        </div>

        <!-- Collection Title -->
        <div class="space-y-2">
          <label class="text-sm font-medium">Collection Title</label>
          <UiInput v-model="collectionTitle" placeholder="My Imported Collection" :disabled="isImporting" />
        </div>

        <!-- Error Message -->
        <div v-if="importError" class="destructive bg-destructive/10 text-destructive p-3 rounded-md text-sm">
          {{ importError }}
        </div>
      </div>

      <UiDialogFooter>
        <UiButton variant="outline" :disabled="isImporting" @click="closeModal">Cancel</UiButton>
        <UiButton
          :disabled="
            !collectionTitle ||
            (importMethod === 'url' && !importUrl) ||
            (importMethod === 'file' && !importFile) ||
            isImporting
          "
          @click="handleImport">
          <Icon v-if="isImporting" name="lucide:loader-2" class="mr-2 h-4 w-4 animate-spin" />
          Import Collection
        </UiButton>
      </UiDialogFooter>
    </UiDialogContent>
  </UiDialog>
</template>
