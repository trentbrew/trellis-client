<script lang="ts" setup>
  /**
   * DatabaseDetailPanel — Collapsible right panel for schema inspection/editing.
   *
   * Shows type info, schema fields, config, references, and stats.
   * Toggled via a button in the browse page toolbar. Open by default.
   */

  import type { DynamicEntityTypeConfig } from '~/composables/useOntologyRegistry'
  import type { EntityClassConfig } from '~/types/entity'

  const VALUE_TYPE_ICONS: Record<string, string> = {
    title: 'lucide:type',
    rich_text: 'lucide:align-left',
    number: 'lucide:hash',
    select: 'lucide:chevrons-up-down',
    multi_select: 'lucide:list-checks',
    status: 'lucide:circle-dot',
    date: 'lucide:calendar',
    checkbox: 'lucide:check-square',
    url: 'lucide:link',
    email: 'lucide:mail',
    phone_number: 'lucide:phone',
    people: 'lucide:users',
    files: 'lucide:paperclip',
    relation: 'lucide:git-branch',
  }

  const props = defineProps<{
    typeConfig: DynamicEntityTypeConfig
    entityCount: number
    isPlatform?: boolean
    isDynamic?: boolean
    entityClassConfig?: EntityClassConfig | null
    typeDescription?: string
  }>()

  const activeTab = ref<'schema' | 'refs' | 'config'>('schema')

  // Reverse mapping: entity type → workspace routes that reference it
  const ENTITY_TYPE_ROUTES: Record<string, Array<{ path: string; label: string; icon: string }>> = {
    task: [{ path: '/workspace/tasks', label: 'Tasks', icon: 'lucide:check-square' }, { path: '/workspace/calendar', label: 'Calendar', icon: 'lucide:calendar' }],
    event: [{ path: '/workspace/calendar', label: 'Calendar', icon: 'lucide:calendar' }],
    trip: [{ path: '/workspace/calendar', label: 'Calendar', icon: 'lucide:calendar' }],
    payment: [{ path: '/workspace/calendar', label: 'Calendar', icon: 'lucide:calendar' }],
    appointment: [{ path: '/workspace/calendar', label: 'Calendar', icon: 'lucide:calendar' }],
    reminder: [{ path: '/workspace/reminders', label: 'Reminders', icon: 'lucide:bell' }, { path: '/workspace/calendar', label: 'Calendar', icon: 'lucide:calendar' }],
    deadline: [{ path: '/workspace/calendar', label: 'Calendar', icon: 'lucide:calendar' }],
    milestone: [{ path: '/workspace/milestones', label: 'Milestones', icon: 'lucide:flag' }, { path: '/workspace/calendar', label: 'Calendar', icon: 'lucide:calendar' }],
    sprint: [{ path: '/workspace/sprints', label: 'Sprints', icon: 'lucide:zap' }],
    budget: [{ path: '/workspace/budgets', label: 'Budgets', icon: 'lucide:wallet' }],
    note: [{ path: '/workspace/notes', label: 'Notes', icon: 'lucide:sticky-note' }],
    file: [{ path: '/workspace/files', label: 'Files & Media', icon: 'lucide:paperclip' }],
    page: [{ path: '/workspace/documents', label: 'Documents', icon: 'lucide:file-text' }],
    bookmark: [{ path: '/workspace/bookmarks', label: 'Bookmarks', icon: 'lucide:bookmark' }],
    person: [{ path: '/workspace/people', label: 'People', icon: 'lucide:users' }],
    contact: [{ path: '/workspace/people', label: 'People', icon: 'lucide:users' }],
    organization: [{ path: '/workspace/organizations', label: 'Organizations', icon: 'lucide:building-2' }],
    project: [{ path: '/workspace/projects', label: 'Projects', icon: 'lucide:folder-kanban' }],
    goal: [{ path: '/workspace/goals', label: 'Goals', icon: 'lucide:target' }],
  }

  const typeReferences = computed(() => {
    const slug = props.typeConfig.type
    const workspaceRoutes = ENTITY_TYPE_ROUTES[slug] || []
    const dbRoute = { path: `/database/${slug}`, label: `Database: ${props.typeConfig.label}`, icon: 'lucide:database' }
    return { workspaceRoutes, dbRoute }
  })

  const typeKindLabel = computed(() => {
    if (props.isPlatform) return 'Platform Type'
    if (props.isDynamic) return 'Custom Type'
    return 'System Entity'
  })

  const typeKindIcon = computed(() => {
    if (props.isPlatform) return 'lucide:lock'
    if (props.isDynamic) return 'lucide:blocks'
    return 'lucide:box'
  })

  function titleCase(str: string): string {
    return str
      .replace(/([A-Z])/g, ' $1')
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase())
      .trim()
  }
</script>

<template>
  <div class="w-72 shrink-0 border-l border-border bg-card/50 flex flex-col overflow-hidden">
    <!-- Panel header: type identity -->
    <div class="shrink-0 px-4 py-3 border-b border-border space-y-2.5">
      <div class="flex items-center gap-2.5">
        <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted/50">
          <Icon :name="props.typeConfig.icon || 'lucide:database'" class="h-4 w-4 text-muted-foreground" />
        </div>
        <div class="min-w-0 flex-1">
          <div class="text-sm font-medium truncate">{{ props.typeConfig.label }}</div>
          <div class="text-[10px] text-muted-foreground">v{{ props.typeConfig.schemaVersion }}</div>
        </div>
      </div>
      <!-- Type info row -->
      <div class="flex items-center gap-1.5 flex-wrap">
        <span class="inline-flex items-center gap-1 text-[10px] text-muted-foreground bg-muted/40 px-1.5 py-0.5 rounded">
          <Icon :name="typeKindIcon" class="h-3 w-3" />
          {{ typeKindLabel }}
        </span>
        <span
          v-if="props.entityClassConfig"
          class="inline-flex items-center gap-1 text-[10px] text-muted-foreground bg-muted/30 px-1.5 py-0.5 rounded">
          <Icon :name="props.entityClassConfig.icon" class="h-3 w-3" />
          {{ props.entityClassConfig.label }}
        </span>
        <span class="text-[10px] text-muted-foreground">
          {{ props.entityCount }} {{ props.entityCount === 1 ? 'record' : 'records' }}
        </span>
      </div>
      <p v-if="props.typeDescription" class="text-[11px] text-muted-foreground/70 leading-relaxed">
        {{ props.typeDescription }}
      </p>
    </div>

    <!-- Tab switcher -->
    <div class="shrink-0 px-3 py-2 border-b border-border">
      <div class="flex items-center gap-1 rounded-lg bg-muted/30 p-0.5">
        <button
          v-for="tab in (['schema', 'refs', 'config'] as const)"
          :key="tab"
          class="flex-1 px-2 py-1 text-[11px] rounded-md transition-colors capitalize"
          :class="activeTab === tab ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'"
          @click="activeTab = tab">
          {{ tab }}
        </button>
      </div>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-y-auto">
      <!-- Schema tab: fields list -->
      <div v-if="activeTab === 'schema'" class="p-3 space-y-1">
        <div class="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-2">
          Fields ({{ props.typeConfig.fields?.length || 0 }})
        </div>
        <div
          v-for="field in props.typeConfig.fields || []"
          :key="field.name"
          class="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted/30 transition-colors group">
          <div class="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-muted/30">
            <Icon :name="VALUE_TYPE_ICONS[field.valueType] || 'lucide:circle'" class="h-3 w-3 text-muted-foreground" />
          </div>
          <div class="flex-1 min-w-0">
            <div class="text-xs font-medium truncate">{{ field.name }}</div>
          </div>
          <code class="text-[9px] bg-muted/40 px-1 py-0.5 rounded text-muted-foreground shrink-0">
            {{ field.valueType }}
          </code>
          <span
            v-if="field.required"
            class="text-[8px] text-amber-500 shrink-0"
            title="Required">
            *
          </span>
        </div>

        <div v-if="!props.typeConfig.fields?.length" class="text-xs text-muted-foreground text-center py-4">
          No fields defined
        </div>
      </div>

      <!-- References tab -->
      <div v-else-if="activeTab === 'refs'" class="p-3 space-y-3">
        <!-- Workspace pages -->
        <div>
          <div class="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-2">Workspace Pages</div>
          <div v-if="typeReferences.workspaceRoutes.length > 0" class="space-y-1">
            <NuxtLink
              v-for="ref in typeReferences.workspaceRoutes"
              :key="ref.path"
              :to="ref.path"
              class="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted/30 transition-colors group">
              <Icon :name="ref.icon" class="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground" />
              <span class="text-xs group-hover:text-foreground">{{ ref.label }}</span>
              <Icon name="lucide:arrow-up-right" class="h-3 w-3 text-muted-foreground/50 ml-auto" />
            </NuxtLink>
          </div>
          <div v-else class="text-[11px] text-muted-foreground/50 px-2 py-2">
            No workspace pages use this type
          </div>
        </div>

        <!-- Database route -->
        <div>
          <div class="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-2">Database Route</div>
          <NuxtLink
            :to="typeReferences.dbRoute.path"
            class="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted/30 transition-colors group">
            <Icon name="lucide:database" class="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground" />
            <span class="text-xs group-hover:text-foreground">{{ typeReferences.dbRoute.label }}</span>
            <Icon name="lucide:arrow-up-right" class="h-3 w-3 text-muted-foreground/50 ml-auto" />
          </NuxtLink>
        </div>
      </div>

      <!-- Config tab -->
      <div v-else-if="activeTab === 'config'" class="p-3 space-y-3">
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Type</span>
            <code class="text-[10px] bg-muted/40 px-1.5 py-0.5 rounded text-muted-foreground">{{ props.typeConfig.type }}</code>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Class</span>
            <span class="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
              <Icon :name="props.typeConfig.icon || 'lucide:box'" class="h-3 w-3" />
              {{ titleCase(props.typeConfig.class) }}
            </span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Schema ID</span>
            <code class="text-[10px] bg-muted/40 px-1.5 py-0.5 rounded text-muted-foreground truncate max-w-[140px]">
              {{ props.typeConfig.schemaId }}
            </code>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Version</span>
            <span class="text-[10px] text-muted-foreground">{{ props.typeConfig.schemaVersion }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Records</span>
            <span class="text-xs font-medium">{{ props.entityCount }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Fields</span>
            <span class="text-xs font-medium">{{ props.typeConfig.fields?.length || 0 }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Required</span>
            <span class="text-xs font-medium">{{ (props.typeConfig.fields || []).filter(f => f.required).length }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Dialog</span>
            <span class="text-[10px] text-muted-foreground">{{ props.typeConfig.dialogShell }}</span>
          </div>
        </div>

        <!-- Projections -->
        <div>
          <div class="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Projections</div>
          <div class="flex flex-wrap gap-1">
            <span
              v-for="proj in props.typeConfig.projections || []"
              :key="proj"
              class="text-[10px] bg-muted/40 px-1.5 py-0.5 rounded text-muted-foreground">
              {{ proj }}
            </span>
            <span v-if="!props.typeConfig.projections?.length" class="text-[10px] text-muted-foreground/50">None</span>
          </div>
        </div>

        <!-- Search fields -->
        <div>
          <div class="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Search Fields</div>
          <div class="flex flex-wrap gap-1">
            <span
              v-for="sf in props.typeConfig.searchFields || []"
              :key="sf"
              class="text-[10px] bg-muted/40 px-1.5 py-0.5 rounded text-muted-foreground">
              {{ sf }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
