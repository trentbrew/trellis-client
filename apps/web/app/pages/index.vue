<script setup lang="ts">
  definePageMeta({
    layout: 'marketing',
  })

  const instant = useInstantDb()

  const heroGridCols = 12
  const heroGridRows = 7
  const heroGridCells = Array.from({ length: heroGridCols * heroGridRows }, (_, index) => ({
    id: index,
    col: (index % heroGridCols) + 1,
    row: Math.floor(index / heroGridCols) + 1,
  }))

  interface HeroDemo {
    id: 'tasks' | 'graph' | 'calendar' | 'notes'
    eyebrow: string
    title: string
    description: string
    column: string
    row: string
    gradientClass: string
    metrics?: { label: string; value: string }[]
    list?: string[]
    chips?: string[]
    relations?: { from: string; to: string }[]
    schedule?: { day: string; label: string; tone: string }[]
    bullets?: string[]
  }

  const heroDemos: HeroDemo[] = [
    {
      id: 'tasks',
      eyebrow: 'Tasks',
      title: 'Daily Focus',
      description: 'The work for today, the blockers, and the linked project context in one pane.',
      column: '1 / span 5',
      row: '1 / span 4',
      gradientClass: 'from-sky-500/18 via-cyan-500/8 to-transparent',
      metrics: [
        { label: 'Today', value: '7' },
        { label: 'Blocked', value: '2' },
      ],
      list: ['Ship onboarding polish', 'Review graph schema', 'Prep launch notes'],
    },
    {
      id: 'graph',
      eyebrow: 'Graph',
      title: 'Context Map',
      description: 'People, docs, and decisions stay queryable instead of falling into separate silos.',
      column: '6 / span 4',
      row: '2 / span 3',
      gradientClass: 'from-violet-500/18 via-fuchsia-500/8 to-transparent',
      chips: ['launch-plan', 'meeting-note', 'assignedTo', 'decision-log'],
      relations: [
        { from: 'Project', to: 'Tasks' },
        { from: 'Notes', to: 'People' },
        { from: 'Docs', to: 'Launch' },
      ],
    },
    {
      id: 'calendar',
      eyebrow: 'Calendar',
      title: 'Launch Rhythm',
      description: 'Milestones, reviews, and follow-ups share the same timeline.',
      column: '10 / span 3',
      row: '1 / span 4',
      gradientClass: 'from-amber-500/18 via-orange-500/8 to-transparent',
      schedule: [
        { day: 'Mon', label: 'Review', tone: 'bg-amber-500/55' },
        { day: 'Tue', label: 'Notes', tone: 'bg-sky-500/55' },
        { day: 'Thu', label: 'Launch', tone: 'bg-emerald-500/55' },
      ],
    },
    {
      id: 'notes',
      eyebrow: 'Notes',
      title: 'Ops Snapshot',
      description: 'A working brief that stays linked back to the entities it describes.',
      column: '2 / span 7',
      row: '5 / span 2',
      gradientClass: 'from-emerald-500/18 via-teal-500/8 to-transparent',
      bullets: [
        'Decisions sync instantly across the graph',
        'Updates stay attached to projects and owners',
        'Agents can query the same structure the UI uses',
      ],
    },
  ]

  onMounted(async () => {
    const user = await instant.getAuth()
    if (user) {
      await navigateTo('/welcome')
    }
  })
</script>

<template>
  <div class="relative overflow-hidden">
    <!-- Hero Section -->
    <UiContainer constrained class="py-20 sm:py-32">
      <div class="mx-auto max-w-4xl text-center space-y-8">
        <div class="flex items-center justify-center gap-2">
          <UiBadge variant="secondary" class="px-3 py-1">Open Source</UiBadge>
          <UiBadge variant="secondary" class="px-3 py-1">Local-First</UiBadge>
        </div>

        <h1 class="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight">
          Your Second Brain,
          <span class="text-primary">Actually Yours</span>
        </h1>

        <p class="text-muted-foreground text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed">
          A personal knowledge graph that lives on your machine. No cloud required. No vendor lock-in. Just your
          thoughts, connected.
        </p>

        <div class="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
          <UiButton size="lg" to="/welcome">
            <Icon name="lucide:rocket" class="h-4 w-4" />
            Try in Browser
          </UiButton>
          <UiButton size="lg" variant="outline" href="https://github.com/trentbrew" target="_blank" rel="noopener">
            <Icon name="lucide:github" class="h-4 w-4" />
            View on GitHub
          </UiButton>
        </div>
      </div>

      <!-- Hero Video -->
      <div class="mx-auto mt-16 max-w-5xl">
        <div
          class="relative overflow-hidden rounded-[28px] border border-border/70 bg-card/65 shadow-2xl backdrop-blur-sm">
          <div
            class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,hsl(var(--primary)/0.12),transparent_50%)]" />
          <div class="relative p-4">
            <iframe
              src="https://player.mux.com/EYU9Zwb82F2Jp3AnP00LvOrt3a8vv8RQaJnVBiWOw7cA?metadata-video-title=CleanShot+2026-04-18+at+05&video-title=CleanShot+2026-04-18+at+05"
              style="width: 100%; border: none; aspect-ratio: 167/108"
              class="rounded-[20px]"
              allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
              allowfullscreen />
          </div>
        </div>
      </div>
    </UiContainer>

    <!-- Problem/Solution Section -->
    <UiContainer constrained class="py-20 sm:py-24 bg-muted/30">
      <div class="mx-auto max-w-3xl">
        <div class="text-center space-y-4 mb-12">
          <h2 class="text-3xl sm:text-4xl font-bold tracking-tight">Built for Builders</h2>
          <p class="text-muted-foreground text-lg">
            Knowledge tools force you to choose: powerful & complex or simple & limited. Privacy means self-hosting
            complexity. Extensibility means APIs that break.
          </p>
        </div>

        <div class="grid gap-6 sm:grid-cols-2">
          <div class="space-y-3">
            <div class="flex items-center gap-2 text-sm font-medium">
              <Icon name="lucide:check-circle" class="h-4 w-4 text-primary" />
              Graph-first architecture
            </div>
            <div class="flex items-center gap-2 text-sm font-medium">
              <Icon name="lucide:check-circle" class="h-4 w-4 text-primary" />
              Runs locally (SQLite)
            </div>
            <div class="flex items-center gap-2 text-sm font-medium">
              <Icon name="lucide:check-circle" class="h-4 w-4 text-primary" />
              Optional cloud sync
            </div>
          </div>
          <div class="space-y-3">
            <div class="flex items-center gap-2 text-sm font-medium">
              <Icon name="lucide:check-circle" class="h-4 w-4 text-primary" />
              CLI/SDK/MCP for automation
            </div>
            <div class="flex items-center gap-2 text-sm font-medium">
              <Icon name="lucide:check-circle" class="h-4 w-4 text-primary" />
              Auto-generated UI from schema
            </div>
            <div class="flex items-center gap-2 text-sm font-medium">
              <Icon name="lucide:check-circle" class="h-4 w-4 text-primary" />
              Works with AI agents natively
            </div>
          </div>
        </div>
      </div>
    </UiContainer>

    <!-- Features Section -->
    <UiContainer constrained class="py-20 sm:py-24">
      <div class="text-center space-y-4 mb-16">
        <h2 class="text-3xl sm:text-4xl font-bold tracking-tight">Everything You Need</h2>
        <p class="text-muted-foreground text-lg max-w-2xl mx-auto">
          A complete knowledge management platform built on solid foundations
        </p>
      </div>

      <div class="grid gap-8 sm:grid-cols-2 lg:grid-cols-2 max-w-5xl mx-auto">
        <!-- Graph-First -->
        <UiCard class="border-2">
          <UiCardHeader>
            <div class="mb-2">
              <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <Icon name="lucide:network" class="h-6 w-6 text-primary" />
              </div>
            </div>
            <UiCardTitle class="text-xl">Graph-First Architecture</UiCardTitle>
          </UiCardHeader>
          <UiCardContent class="space-y-3">
            <p class="text-muted-foreground text-sm leading-relaxed">
              Everything is an entity with typed properties and semantic links. Tasks, notes, events, people,
              projects—all connected in a queryable graph.
            </p>
            <div class="font-mono text-xs bg-muted/50 p-3 rounded-lg">
              FIND task WHERE priority = "high"
              <br />
              AND assignedTo = "me"
            </div>
          </UiCardContent>
        </UiCard>

        <!-- Local-First -->
        <UiCard class="border-2">
          <UiCardHeader>
            <div class="mb-2">
              <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <Icon name="lucide:database" class="h-6 w-6 text-primary" />
              </div>
            </div>
            <UiCardTitle class="text-xl">Local-First, Cloud-Optional</UiCardTitle>
          </UiCardHeader>
          <UiCardContent class="space-y-3">
            <p class="text-muted-foreground text-sm leading-relaxed">
              Your data lives in SQLite on your machine. Works offline, syncs when connected (optional). Export/import
              between local and cloud modes.
            </p>
            <div class="text-xs text-muted-foreground">No vendor lock-in • Privacy by default • Full control</div>
          </UiCardContent>
        </UiCard>

        <!-- Ontology-Driven -->
        <UiCard class="border-2">
          <UiCardHeader>
            <div class="mb-2">
              <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <Icon name="lucide:boxes" class="h-6 w-6 text-primary" />
              </div>
            </div>
            <UiCardTitle class="text-xl">Ontology-Driven UI</UiCardTitle>
          </UiCardHeader>
          <UiCardContent class="space-y-3">
            <p class="text-muted-foreground text-sm leading-relaxed">
              Define entity types via CLI or UI. The interface auto-scaffolds—sidebar items, browse pages, dialogs—with
              zero code changes.
            </p>
            <div class="text-xs text-muted-foreground">
              Notion-compatible fields • Extend with custom types • Schema-driven
            </div>
          </UiCardContent>
        </UiCard>

        <!-- Agent-Friendly -->
        <UiCard class="border-2">
          <UiCardHeader>
            <div class="mb-2">
              <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <Icon name="lucide:terminal" class="h-6 w-6 text-primary" />
              </div>
            </div>
            <UiCardTitle class="text-xl">Agent-Friendly</UiCardTitle>
          </UiCardHeader>
          <UiCardContent class="space-y-3">
            <p class="text-muted-foreground text-sm leading-relaxed">
              MCP server with 15 tools for AI agents. TypeScript SDK for scripting. CLI for automation. Realtime SSE for
              instant updates.
            </p>
            <div class="text-xs text-muted-foreground">
              Claude • Windsurf • Custom agents • Full programmatic access
            </div>
          </UiCardContent>
        </UiCard>
      </div>
    </UiContainer>

    <!-- How It Works -->
    <UiContainer constrained class="py-20 sm:py-24 bg-muted/30">
      <div class="text-center space-y-4 mb-16">
        <h2 class="text-3xl sm:text-4xl font-bold tracking-tight">How It Works</h2>
        <p class="text-muted-foreground text-lg">Get started in three simple steps</p>
      </div>

      <div class="grid gap-8 md:grid-cols-3 max-w-5xl mx-auto">
        <div class="text-center space-y-4">
          <div
            class="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary font-bold text-2xl">
            1
          </div>
          <h3 class="text-xl font-semibold">Install & Run</h3>
          <p class="text-muted-foreground text-sm leading-relaxed">
            Download the desktop app or clone the repo. No account needed for local mode.
          </p>
        </div>

        <div class="text-center space-y-4">
          <div
            class="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary font-bold text-2xl">
            2
          </div>
          <h3 class="text-xl font-semibold">Create Entities</h3>
          <p class="text-muted-foreground text-sm leading-relaxed">
            Add tasks, notes, events, people, projects. Link them together with semantic relationships.
          </p>
        </div>

        <div class="text-center space-y-4">
          <div
            class="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary font-bold text-2xl">
            3
          </div>
          <h3 class="text-xl font-semibold">Query & Automate</h3>
          <p class="text-muted-foreground text-sm leading-relaxed">
            Use powerful queries, connect AI agents, script workflows, visualize your knowledge graph.
          </p>
        </div>
      </div>
    </UiContainer>

    <!-- Tech Stack -->
    <UiContainer constrained class="py-20 sm:py-24">
      <div class="max-w-4xl mx-auto">
        <div class="text-center space-y-4 mb-12">
          <h2 class="text-3xl sm:text-4xl font-bold tracking-tight">Built with Modern Tech</h2>
          <p class="text-muted-foreground text-lg">Solid foundations for extensibility and performance</p>
        </div>

        <div class="grid gap-4 sm:grid-cols-2 md:grid-cols-4 text-center">
          <div class="p-6 rounded-xl border bg-card">
            <Icon name="lucide:component" class="h-8 w-8 mx-auto mb-3 text-primary" />
            <div class="font-semibold text-sm">Nuxt 4 + Vue 3</div>
          </div>
          <div class="p-6 rounded-xl border bg-card">
            <Icon name="lucide:database" class="h-8 w-8 mx-auto mb-3 text-primary" />
            <div class="font-semibold text-sm">TQL Kernel</div>
          </div>
          <div class="p-6 rounded-xl border bg-card">
            <Icon name="lucide:package" class="h-8 w-8 mx-auto mb-3 text-primary" />
            <div class="font-semibold text-sm">Tauri v2</div>
          </div>
          <div class="p-6 rounded-xl border bg-card">
            <Icon name="lucide:code-2" class="h-8 w-8 mx-auto mb-3 text-primary" />
            <div class="font-semibold text-sm">TypeScript + Rust</div>
          </div>
        </div>

        <div class="mt-8 text-center text-sm text-muted-foreground">
          Frontend: Nuxt 4, Vue 3, Tailwind CSS, Reka UI
          <br />
          Backend: TQL (EAV store + Datalog engine), SQLite
          <br />
          Desktop: Tauri v2 (Rust + WebView)
        </div>
      </div>
    </UiContainer>

    <!-- CTA Section -->
    <UiContainer constrained class="py-20 sm:py-24">
      <div class="mx-auto max-w-3xl text-center space-y-8 rounded-2xl border-2 border-border bg-card p-10 sm:p-12">
        <div class="space-y-4">
          <h2 class="text-3xl sm:text-4xl font-bold tracking-tight">Start Building Your Knowledge Graph</h2>
          <p class="text-muted-foreground text-lg">
            Built by
            <a href="https://github.com/trentbrew" target="_blank" rel="noopener" class="text-primary hover:underline">
              @trentbrew
            </a>
            as a tool for personal knowledge management.
          </p>
        </div>

        <div class="flex flex-col sm:flex-row gap-4 justify-center">
          <UiButton size="lg" to="/welcome">
            <Icon name="lucide:rocket" class="h-4 w-4" />
            Try in Browser
          </UiButton>
          <UiButton size="lg" variant="outline" href="https://github.com/trentbrew" target="_blank" rel="noopener">
            <Icon name="lucide:github" class="h-4 w-4" />
            View Source Code
          </UiButton>
        </div>

        <div class="text-sm text-muted-foreground pt-4">Open development • Watch progress on GitHub</div>
      </div>
    </UiContainer>
  </div>
</template>
