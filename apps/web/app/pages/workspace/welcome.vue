<script setup lang="ts">
  definePageMeta({ layout: 'default' })

  const { currentApp, currentOrg } = useInstantData()
  const { items, loading: entitiesLoading } = useEntities()
  const { serverTypes } = useOntologyRegistry()
  const { wp } = useWorkspacePath()

  useHead({
    title: computed(() => `${currentApp.value?.name || 'World'} | Welcome`),
  })

  // Entity type summary cards — only show types enabled for this world
  const entityTypeSummary = computed(() => {
    const appOntologies = currentApp.value?.ontologies as string[] | undefined
    const allTypes = serverTypes.value || []

    // Filter to types enabled for this app (or all if no filter)
    const enabledTypes = appOntologies?.length
      ? allTypes.filter((t) => appOntologies.includes(t.type))
      : allTypes.filter((t) => t.tier === 'system')

    return enabledTypes.map((config: any) => {
      const count = items.value.filter((e: any) => e.type === config.type).length
      return {
        type: config.type,
        label: config.pluralLabel || config.label || config.type,
        icon: config.icon || 'lucide:circle',
        count,
        path: config.browsePath || `/workspace/${config.type}s`,
      }
    }).filter((t: any) => t.label)
  })

  // Quick links for getting started
  const quickLinks = computed(() => [
    { label: 'Today', icon: 'lucide:sun', path: '/workspace/today', description: 'Your daily dashboard' },
    { label: 'Calendar', icon: 'lucide:calendar', path: '/workspace/calendar', description: 'View upcoming events' },
    { label: 'Tasks', icon: 'lucide:check-square', path: '/workspace/tasks', description: 'Manage your work' },
    { label: 'Notes', icon: 'lucide:file-text', path: '/workspace/notes', description: 'Capture your thoughts' },
    { label: 'Projects', icon: 'lucide:folder-kanban', path: '/workspace/projects', description: 'Track projects' },
    { label: 'People', icon: 'lucide:users', path: '/workspace/people', description: 'Your contacts' },
  ])

  const totalEntities = computed(() => items.value.length)

  const worldDescription = computed(() => {
    return currentApp.value?.description || 'Your personal knowledge workspace.'
  })

  const worldIcon = computed(() => {
    return (currentApp.value as any)?.icon || 'lucide:layout-grid'
  })

  const worldColor = computed(() => {
    const c = (currentApp.value as any)?.color
    if (!c || c.startsWith('bg-')) return '#6366f1'
    return c
  })

  const orgName = computed(() => currentOrg.value?.name || 'Organization')
</script>

<template>
  <Page variant="canvas" :fill-height="true">
    <div class="mx-auto max-w-3xl px-6 py-12 space-y-10">

      <!-- Hero header -->
      <div class="space-y-4">
        <div class="flex items-center gap-4">
          <div
            class="flex h-14 w-14 items-center justify-center rounded-2xl border border-border/50"
            :style="{ backgroundColor: worldColor + '15' }">
            <Icon :name="worldIcon" class="h-7 w-7" :style="{ color: worldColor }" />
          </div>
          <div>
            <h1 class="text-2xl font-bold text-foreground tracking-tight">
              {{ currentApp?.name || 'Welcome' }}
            </h1>
            <p class="text-sm text-muted-foreground">
              {{ orgName }}
            </p>
          </div>
        </div>
        <p class="text-base text-muted-foreground/80 leading-relaxed max-w-xl">
          {{ worldDescription }}
        </p>
      </div>

      <!-- Stats row -->
      <div v-if="!entitiesLoading" class="flex items-center gap-6 text-sm text-muted-foreground">
        <div class="flex items-center gap-2">
          <Icon name="lucide:database" class="h-4 w-4 opacity-50" />
          <span><strong class="text-foreground">{{ totalEntities }}</strong> entities</span>
        </div>
        <div class="flex items-center gap-2">
          <Icon name="lucide:shapes" class="h-4 w-4 opacity-50" />
          <span><strong class="text-foreground">{{ entityTypeSummary.length }}</strong> types enabled</span>
        </div>
      </div>

      <!-- Entity type cards -->
      <div v-if="entityTypeSummary.length > 0" class="space-y-3">
        <h2 class="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
          What's in this world
        </h2>
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <NuxtLink
            v-for="et in entityTypeSummary"
            :key="et.type"
            :to="wp(et.path)"
            class="group flex items-center gap-3 rounded-xl border border-border/50 bg-card/50 p-4 transition hover:border-border hover:bg-card hover:shadow-sm">
            <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted/50 group-hover:bg-muted transition">
              <Icon :name="et.icon" class="h-4.5 w-4.5 text-muted-foreground group-hover:text-foreground transition" />
            </div>
            <div class="min-w-0">
              <div class="text-sm font-medium text-foreground truncate capitalize">{{ et.label }}</div>
              <div class="text-xs text-muted-foreground tabular-nums">{{ et.count }} item{{ et.count !== 1 ? 's' : '' }}</div>
            </div>
          </NuxtLink>
        </div>
      </div>

      <!-- Quick links -->
      <div class="space-y-3">
        <h2 class="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
          Get started
        </h2>
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <NuxtLink
            v-for="link in quickLinks"
            :key="link.path"
            :to="wp(link.path)"
            class="group flex items-center gap-3 rounded-xl border border-border/30 bg-transparent p-4 transition hover:border-border/60 hover:bg-card/50">
            <Icon :name="link.icon" class="h-5 w-5 text-muted-foreground/60 group-hover:text-foreground transition shrink-0" />
            <div class="min-w-0">
              <div class="text-sm font-medium text-foreground truncate">{{ link.label }}</div>
              <div class="text-xs text-muted-foreground truncate">{{ link.description }}</div>
            </div>
          </NuxtLink>
        </div>
      </div>

      <!-- Marketplace CTA -->
      <div class="rounded-xl border border-border/30 bg-muted/10 p-6 flex items-center justify-between gap-4">
        <div class="space-y-1">
          <h3 class="text-sm font-semibold text-foreground">Customize this world</h3>
          <p class="text-xs text-muted-foreground">Install templates to add new entity types, sidebar sections, and starter content.</p>
        </div>
        <NuxtLink :to="wp('/settings/marketplace')">
          <UiButton variant="outline" size="sm" class="shrink-0 gap-2">
            <Icon name="lucide:store" class="h-4 w-4" />
            Marketplace
          </UiButton>
        </NuxtLink>
      </div>

    </div>
  </Page>
</template>
