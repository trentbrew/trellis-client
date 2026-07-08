<script setup lang="ts">
  import { sheetPathFromEntityId, sheetSlugFromEntityId } from '~/lib/sheet-routes'
  import { listSheetTemplates, type SheetTemplateId } from '~/lib/sheet-templates'

  definePageMeta({
    layout: 'default',
    middleware: ['auth'],
  })

  useHead({ title: 'Sheets' })

  const { wp } = useWorkspacePath()
  const { sheets } = useSheetList()
  const { loading } = useEntities()
  const { createSheet, creating } = useCreateSheet()

  const templates = listSheetTemplates()
  const createMenuOpen = ref(false)

  async function handleCreate(template: SheetTemplateId) {
    createMenuOpen.value = false
    await createSheet({ template })
  }
</script>

<template>
  <Page variant="browse" title="Sheets" icon="lucide:table-2"
    description="Live TQL projections — rows are entities, columns are attributes, formulas derive in place.">
    <template #actions>
      <UiDropdownMenu v-model:open="createMenuOpen">
        <UiDropdownMenuTrigger as-child>
          <UiButton size="sm" :disabled="creating">
            <Icon :name="creating ? 'lucide:loader-2' : 'lucide:plus'" :class="['h-4 w-4', creating && 'animate-spin']" />
            New sheet
            <Icon name="lucide:chevron-down" class="ml-1 h-3.5 w-3.5 opacity-70" />
          </UiButton>
        </UiDropdownMenuTrigger>
        <UiDropdownMenuContent align="end" class="w-64">
          <UiDropdownMenuLabel class="text-xs text-muted-foreground uppercase tracking-wide">
            Choose template
          </UiDropdownMenuLabel>
          <UiDropdownMenuSeparator />
          <UiDropdownMenuItem
            v-for="template in templates"
            :key="template.id"
            class="gap-3 items-start py-2"
            @click="handleCreate(template.id)">
            <Icon :name="template.icon" class="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
            <div class="min-w-0">
              <p class="text-sm font-medium">{{ template.name }}</p>
              <p class="text-xs text-muted-foreground leading-snug">{{ template.description }}</p>
            </div>
          </UiDropdownMenuItem>
        </UiDropdownMenuContent>
      </UiDropdownMenu>
    </template>

    <template v-if="loading">
      <div class="flex h-48 items-center justify-center text-muted-foreground">
        <Icon name="lucide:loader-2" class="h-6 w-6 animate-spin" />
      </div>
    </template>

    <template v-else-if="sheets.length === 0">
      <div class="flex flex-col items-center justify-center gap-4 py-24 text-muted-foreground">
        <Icon name="lucide:table-2" class="h-10 w-10 opacity-25" />
        <div class="space-y-1 text-center">
          <p class="text-sm font-medium text-foreground">No sheets yet</p>
          <p class="text-xs max-w-sm">
            Create a blank projection or start from the budget tracker template. Expense rows live on the graph;
            sheets are live views over them.
          </p>
        </div>
        <div class="flex flex-wrap items-center justify-center gap-2">
          <UiButton size="sm" variant="secondary" :disabled="creating" @click="handleCreate('blank')">
            <Icon name="lucide:table-2" class="h-4 w-4" />
            Blank sheet
          </UiButton>
          <UiButton size="sm" :disabled="creating" @click="handleCreate('budget')">
            <Icon name="lucide:wallet" class="h-4 w-4" />
            Budget tracker
          </UiButton>
        </div>
        <p class="text-[11px] text-muted-foreground">
          Demo:
          <code class="rounded bg-muted px-1 py-0.5 font-data">bun apps/web/scripts/seed-sheet-demo.mjs</code>
        </p>
      </div>
    </template>

    <ul v-else class="divide-y divide-border rounded-lg border border-border bg-card">
      <li v-for="sheet in sheets" :key="sheet.id">
        <NuxtLink
          :to="wp(sheetPathFromEntityId(sheet.id))"
          class="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50">
          <Icon name="lucide:table-2" class="h-4 w-4 shrink-0 text-emerald-400" />
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-medium text-foreground">
              {{ sheet.title || sheetSlugFromEntityId(sheet.id) }}
            </p>
            <p class="truncate font-data text-[11px] text-muted-foreground">
              {{ sheetPathFromEntityId(sheet.id) }}
            </p>
          </div>
          <Icon name="lucide:chevron-right" class="h-4 w-4 shrink-0 text-muted-foreground/50" />
        </NuxtLink>
      </li>
    </ul>
  </Page>
</template>
