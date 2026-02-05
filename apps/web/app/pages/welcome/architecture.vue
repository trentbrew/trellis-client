<script setup lang="ts">
  definePageMeta({
    middleware: ['auth'],
  })

  const layers = [
    {
      name: 'Data Layer',
      path: '/collections',
      icon: 'lucide:database',
      color: 'text-blue-500',
      description: 'Collections are containers for your records. Think of them as flexible database tables.',
      concepts: ['Collections', 'Records', 'Fields', 'Relations'],
    },
    {
      name: 'Schema Layer',
      path: '/types',
      icon: 'lucide:shapes',
      color: 'text-violet-500',
      description: 'Types define the structure of your data. Create ontologies and reusable field definitions.',
      concepts: ['Ontology', 'Field Types', 'Presets', 'Validation'],
    },
    {
      name: 'Query Layer',
      path: '/views',
      icon: 'lucide:filter',
      color: 'text-cyan-500',
      description: 'Views are saved queries that filter, sort, and project your data in specific ways.',
      concepts: ['Views', 'Filters', 'Projections', 'TQL'],
    },
    {
      name: 'Input Layer',
      path: '/forms',
      icon: 'lucide:form-input',
      color: 'text-amber-500',
      description: 'Forms provide structured input interfaces that write data into your collections.',
      concepts: ['Forms', 'Surveys', 'Validation', 'Submission'],
    },
    {
      name: 'Output Layer',
      path: '/reports',
      icon: 'lucide:file-text',
      color: 'text-rose-500',
      description: 'Reports generate formatted output from your data for sharing and export.',
      concepts: ['Templates', 'Exports', 'Scheduling', 'Formats'],
    },
    {
      name: 'Graph Layer',
      path: '/graph',
      icon: 'lucide:git-graph',
      color: 'text-emerald-500',
      description: 'The graph is the semantic foundation. All data is connected in a knowledge graph.',
      concepts: ['Nodes', 'Edges', 'Traversal', 'Visualization'],
    },
  ]
</script>

<template>
  <Page
    variant="prose"
    title="Architecture"
    subtitle="Help"
    description="How Trellis works: Collections, Types, Views, and Graph"
    icon="lucide:building-2"
    show-back-button>
    <div class="prose prose-invert max-w-none">
      <p class="text-muted-foreground text-lg">
        Trellis is built on a layered architecture. Each layer serves a specific purpose and can be used independently
        or together.
      </p>

      <div class="not-prose mt-8 space-y-6">
        <div
          v-for="layer in layers"
          :key="layer.name"
          class="rounded-lg border p-6 transition-colors hover:bg-muted/20">
          <div class="flex items-start gap-4">
            <div class="bg-muted flex h-12 w-12 shrink-0 items-center justify-center rounded-lg">
              <Icon :name="layer.icon" :class="['h-6 w-6', layer.color]" />
            </div>
            <div class="flex-1">
              <div class="mb-1 flex items-center gap-2">
                <h3 class="text-lg font-semibold">{{ layer.name }}</h3>
                <NuxtLink
                  :to="layer.path"
                  class="text-muted-foreground hover:text-foreground text-sm transition-colors">
                  {{ layer.path }} →
                </NuxtLink>
              </div>
              <p class="text-muted-foreground mb-3">{{ layer.description }}</p>
              <div class="flex flex-wrap gap-2">
                <span v-for="concept in layer.concepts" :key="concept" class="bg-muted rounded-full px-3 py-1 text-xs">
                  {{ concept }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="mt-12">
        <h2 class="mb-4 text-xl font-bold">The Semantic Graph</h2>
        <div class="bg-muted/30 rounded-lg border p-6">
          <p class="text-muted-foreground mb-4">
            Under the hood, all Trellis data is stored as a
            <strong>semantic graph</strong>
            using JSON-LD. This means:
          </p>
          <ul class="text-muted-foreground space-y-2">
            <li class="flex items-start gap-2">
              <Icon name="lucide:check" class="mt-1 h-4 w-4 text-green-500" />
              <span>
                Every record is a
                <strong>node</strong>
                with a unique IRI
              </span>
            </li>
            <li class="flex items-start gap-2">
              <Icon name="lucide:check" class="mt-1 h-4 w-4 text-green-500" />
              <span>
                Relationships between records are
                <strong>edges</strong>
              </span>
            </li>
            <li class="flex items-start gap-2">
              <Icon name="lucide:check" class="mt-1 h-4 w-4 text-green-500" />
              <span>
                Types and schemas define the
                <strong>ontology</strong>
              </span>
            </li>
            <li class="flex items-start gap-2">
              <Icon name="lucide:check" class="mt-1 h-4 w-4 text-green-500" />
              <span>
                Views and projections are
                <strong>queries</strong>
                over the graph
              </span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </Page>
</template>
