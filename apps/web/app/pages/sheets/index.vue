<script setup lang="ts">
  import { sheetPathFromEntityId, sheetSlugFromEntityId } from '~/lib/sheet-routes'

  definePageMeta({
    layout: 'default',
    middleware: ['auth'],
  })

  useHead({ title: 'Sheets' })

  const { wp } = useWorkspacePath()
  const { sheets } = useSheetList()
  const { loading } = useEntities()
</script>

<template>
  <Page variant="browse" title="Sheets" icon="lucide:table-2">
    <template v-if="loading">
      <div class="flex h-48 items-center justify-center text-muted-foreground">
        <Icon name="lucide:loader-2" class="h-6 w-6 animate-spin" />
      </div>
    </template>

    <template v-else-if="sheets.length === 0">
      <div class="flex flex-col items-center justify-center gap-3 py-24 text-muted-foreground">
        <Icon name="lucide:table-2" class="h-10 w-10 opacity-25" />
        <div class="space-y-1 text-center">
          <p class="text-sm font-medium text-foreground">No sheets yet</p>
          <p class="text-xs max-w-sm">
            Sheet entities live in the graph. Run
            <code class="rounded bg-muted px-1 py-0.5 font-data text-[11px]">bun apps/web/scripts/seed-sheet-demo.mjs</code>
            for a demo projection.
          </p>
        </div>
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
