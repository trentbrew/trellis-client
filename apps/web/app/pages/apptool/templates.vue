<script setup lang="ts">
  import { questionnaires, getProgramById } from '~/data/apptool-mock-data'

  const templates = computed(() => {
    return questionnaires.map((q) => {
      const program = getProgramById(q.program)
      return {
        ...q,
        programName: program?.name || q.program,
        programIcon: program?.icon || 'lucide:file-text',
        programColor: program?.color || 'text-primary',
        programBgColor: program?.bgColor || 'bg-primary/10',
      }
    })
  })

  function getStatusVariant(status: string): 'default' | 'secondary' | 'outline' {
    if (status === 'published') return 'default'
    if (status === 'review') return 'secondary'
    return 'outline'
  }
</script>

<template>
  <Page variant="canvas" :fill-height="true">
    <div class="p-6 space-y-6 overflow-y-auto">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold">Template Library</h1>
          <p class="text-muted-foreground">Manage questionnaire templates for applicability determinations</p>
        </div>
        <UiButton>
          <Icon name="lucide:plus" class="mr-2 size-4" />
          New Template
        </UiButton>
      </div>

      <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <UiCard
          v-for="template in templates"
          :key="template.id"
          class="hover:border-primary/30 transition-colors cursor-pointer">
          <UiCardHeader>
            <div class="flex items-start gap-3">
              <div class="flex size-10 items-center justify-center rounded-lg" :class="template.programBgColor">
                <Icon :name="template.programIcon" class="size-5" :class="template.programColor" />
              </div>
              <div class="flex-1 min-w-0">
                <UiCardTitle class="text-base truncate">{{ template.name }}</UiCardTitle>
                <UiCardDescription class="truncate">{{ template.description }}</UiCardDescription>
              </div>
            </div>
          </UiCardHeader>
          <UiCardContent>
            <div class="flex items-center justify-between text-sm">
              <div class="flex items-center gap-4 text-muted-foreground">
                <span class="flex items-center gap-1">
                  <Icon name="lucide:building-2" class="size-3" />
                  {{ template.facilitiesCount }} facilities
                </span>
                <span class="flex items-center gap-1">
                  <Icon name="lucide:help-circle" class="size-3" />
                  {{ template.questionsCount }} questions
                </span>
              </div>
              <UiBadge :variant="getStatusVariant(template.status)" class="capitalize">
                {{ template.status }}
              </UiBadge>
            </div>
          </UiCardContent>
        </UiCard>
      </div>
    </div>
  </Page>
</template>
