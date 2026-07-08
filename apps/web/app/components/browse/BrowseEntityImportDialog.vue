<script setup lang="ts">
  import type { EntityType } from '~/types/entity'
  import { parseEntityImportJson } from '~/lib/entity-export'

  const props = defineProps<{
    open: boolean
  }>()

  const emit = defineEmits<{
    'update:open': [value: boolean]
    imported: [result: { created: number; failed: number }]
  }>()

  const { create } = useEntities()
  const { $toast } = useNuxtApp()

  const importFile = ref<File | null>(null)
  const isImporting = ref(false)
  const importError = ref('')
  const importErrors = ref<string[]>([])

  function resetForm() {
    importFile.value = null
    importError.value = ''
    importErrors.value = []
  }

  watch(
    () => props.open,
    (isOpen) => {
      if (!isOpen) resetForm()
    },
  )

  function handleFileChange(event: Event) {
    const target = event.target as HTMLInputElement
    importFile.value = target.files?.[0] ?? null
    importError.value = ''
    importErrors.value = []
  }

  async function handleImport() {
    if (!importFile.value) {
      importError.value = 'Choose a JSON file to import'
      return
    }

    isImporting.value = true
    importError.value = ''
    importErrors.value = []

    let payloads: ReturnType<typeof parseEntityImportJson>
    try {
      const text = await importFile.value.text()
      const parsed = JSON.parse(text)
      payloads = parseEntityImportJson(parsed)
    } catch (err) {
      importError.value = err instanceof Error ? err.message : 'Invalid import file'
      isImporting.value = false
      return
    }

    let created = 0
    let failed = 0
    const errors: string[] = []

    for (let i = 0; i < payloads.length; i++) {
      const payload = payloads[i]!
      try {
        await create({
          tags: [],
          involved: [],
          references: [],
          ...payload,
          type: payload.type as EntityType,
          title: payload.title,
        })
        created++
      } catch (err) {
        failed++
        if (errors.length < 3) {
          const msg = err instanceof Error ? err.message : 'Create failed'
          errors.push(`Row ${i + 1} (${payload.title}): ${msg}`)
        }
      }
    }

    importErrors.value = errors
    isImporting.value = false

    if (created > 0) {
      ;($toast as { success?: (m: string) => void })?.success?.(
        `Imported ${created} entit${created === 1 ? 'y' : 'ies'}${failed ? ` (${failed} failed)` : ''}`,
      )
      emit('imported', { created, failed })
      if (failed === 0) emit('update:open', false)
    } else {
      importError.value = 'No entities were created'
      ;($toast as { error?: (m: string) => void })?.error?.('Import failed')
    }
  }
</script>

<template>
  <UiDialog :open="open" @update:open="emit('update:open', $event)">
    <UiDialogContent class="sm:max-w-md">
      <UiDialogHeader>
        <UiDialogTitle>Import entities</UiDialogTitle>
        <UiDialogDescription>
          Upload a JSON array of entities or a Trellis JSON-LD export from browse.
        </UiDialogDescription>
      </UiDialogHeader>

      <div class="space-y-4 py-2">
        <div class="space-y-2">
          <label class="text-xs font-medium text-muted-foreground">JSON file</label>
          <input
            type="file"
            accept=".json,.jsonld,application/json"
            class="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-xs file:font-medium"
            @change="handleFileChange" />
        </div>

        <p v-if="importError" class="text-sm text-destructive">{{ importError }}</p>
        <ul v-if="importErrors.length" class="text-xs text-destructive space-y-1 list-disc pl-4">
          <li v-for="(err, idx) in importErrors" :key="idx">{{ err }}</li>
        </ul>
      </div>

      <UiDialogFooter>
        <UiButton variant="outline" @click="emit('update:open', false)">Cancel</UiButton>
        <UiButton :disabled="isImporting || !importFile" @click="handleImport">
          <Icon v-if="isImporting" name="lucide:loader-2" class="mr-2 h-4 w-4 animate-spin" />
          Import
        </UiButton>
      </UiDialogFooter>
    </UiDialogContent>
  </UiDialog>
</template>
