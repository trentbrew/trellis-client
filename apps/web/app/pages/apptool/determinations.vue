<script setup lang="ts">
  import { facilities, responseStatuses, getProgramById, formatRelativeTime } from '~/data/apptool-mock-data'

  const determinations = computed(() => {
    return responseStatuses.map((rs) => {
      const facility = facilities.find((f) => f.id === rs.facilityId)
      const program = getProgramById(rs.program)
      return {
        ...rs,
        facilityName: facility?.name || 'Unknown',
        programName: program?.name || rs.program,
        programIcon: program?.icon || 'lucide:file-check',
        programColor: program?.color || 'text-primary',
        programBgColor: program?.bgColor || 'bg-primary/10',
        relativeDate: formatRelativeTime(rs.lastUpdated),
      }
    })
  })

  function getStatusVariant(status: string): 'default' | 'secondary' | 'outline' | 'destructive' {
    if (status === 'Applicable') return 'default'
    if (status === 'Not Applicable') return 'secondary'
    return 'outline'
  }

  function getProgressVariant(progress: string): 'default' | 'secondary' | 'outline' {
    if (progress === 'Complete') return 'default'
    return 'secondary'
  }
</script>

<template>
  <Page variant="canvas" :fill-height="true">
    <div class="p-6 space-y-6 overflow-y-auto">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold">Applicability Determinations</h1>
          <p class="text-muted-foreground">Track and manage facility applicability assessments</p>
        </div>
        <UiButton>
          <Icon name="lucide:plus" class="mr-2 size-4" />
          New Determination
        </UiButton>
      </div>

      <UiCard>
        <UiCardContent class="p-0">
          <div class="divide-y">
            <div
              v-for="d in determinations"
              :key="d.id"
              class="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors cursor-pointer">
              <div class="flex size-10 items-center justify-center rounded-lg" :class="d.programBgColor">
                <Icon :name="d.programIcon" class="size-5" :class="d.programColor" />
              </div>
              <div class="flex-1 min-w-0">
                <p class="font-medium truncate">{{ d.standard }}</p>
                <p class="text-sm text-muted-foreground">{{ d.facilityName }} · {{ d.relativeDate }}</p>
              </div>
              <div class="flex items-center gap-2">
                <UiBadge v-if="d.status" :variant="getStatusVariant(d.status)">
                  {{ d.status }}
                </UiBadge>
                <UiBadge :variant="getProgressVariant(d.progress)">
                  {{ d.progress }}
                </UiBadge>
              </div>
              <div class="text-sm text-muted-foreground">{{ d.completedQuestions }}/{{ d.totalQuestions }}</div>
            </div>
          </div>
        </UiCardContent>
      </UiCard>
    </div>
  </Page>
</template>
