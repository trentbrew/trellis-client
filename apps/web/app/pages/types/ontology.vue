<script setup lang="ts">
  definePageMeta({
    middleware: ['auth'],
  })
</script>

<template>
  <Page
    variant="prose"
    title="Ontology"
    subtitle="Schema Layer"
    description="Workspace-wide entity kinds, IRIs, and relation conventions"
    icon="lucide:network">
    <div class="grid gap-4 md:grid-cols-2">
      <UiCard>
        <UiCardHeader>
          <UiCardTitle>turtle:// IRIs</UiCardTitle>
        </UiCardHeader>
        <UiCardContent>
          <p class="text-muted-foreground text-sm font-mono">turtle://collection/&lt;slug&gt;</p>
          <p class="text-muted-foreground mt-2 text-sm">
            Internal identifiers used for JSON-LD relations inside the workspace.
          </p>
        </UiCardContent>
      </UiCard>

      <UiCard>
        <UiCardHeader>
          <UiCardTitle>Relations</UiCardTitle>
        </UiCardHeader>
        <UiCardContent>
          <p class="text-muted-foreground text-sm">
            Upcoming: define relation predicates, cardinality, and navigation behavior.
          </p>
        </UiCardContent>
      </UiCard>
    </div>
  </Page>
</template>
