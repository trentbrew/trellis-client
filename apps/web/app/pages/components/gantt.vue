<script setup lang="ts">
  import {
    GanttProvider,
    GanttTimeline,
    GanttHeader,
    GanttSidebar,
    GanttSidebarItem,
    GanttSidebarGroup,
    GanttFeatureList,
    GanttFeatureListGroup,
    GanttFeatureItem,
    GanttMarker,
    GanttToday,
    GanttCreateMarkerTrigger,
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuTrigger,
  } from '~/components/data/Gantt/index.vue'
  import type { GanttFeature, GanttStatus, GanttMode, GanttScheduleItemChange } from '~/components/data/Gantt/ganttContext'

  definePageMeta({
    middleware: ['auth'],
  })

  const today = new Date()

  const exampleStatuses: GanttStatus[] = [
    { id: '1', name: 'Planned', color: '#6B7280' },
    { id: '2', name: 'In Progress', color: '#F59E0B' },
    { id: '3', name: 'Done', color: '#10B981' },
  ]

  const plannedStatus = exampleStatuses[0]!
  const inProgressStatus = exampleStatuses[1]!
  const doneStatus = exampleStatuses[2]!

  const features = ref<GanttFeature[]>([
    {
      id: '1',
      name: 'AI Scene Analysis',
      startAt: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 9, 0, 0, 0),
      endAt: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12, 0, 0, 0),
      status: plannedStatus,
    },
    {
      id: '2',
      name: 'Collaborative Editing',
      startAt: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 11, 0, 0, 0),
      endAt: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 14, 0, 0, 0),
      status: inProgressStatus,
    },
    {
      id: '3',
      name: 'AI-Powered Color Grading',
      startAt: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 15, 0, 0, 0),
      endAt: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 18, 0, 0, 0),
      status: doneStatus,
    },
  ])

  const markers = ref<{ id: string; date: Date; label: string }[]>([])

  const groupedFeatures = computed(() => {
    const groups = {
      'Core AI Features': [] as GanttFeature[],
      'Collaboration Tools': [] as GanttFeature[],
      'Cloud Infrastructure': [] as GanttFeature[],
    }

    features.value.forEach((feature) => {
      if (feature.name.includes('AI')) {
        groups['Core AI Features'].push(feature)
      } else if (feature.name.includes('Collaborative') || feature.name.includes('Video')) {
        groups['Collaboration Tools'].push(feature)
      } else {
        groups['Cloud Infrastructure'].push(feature)
      }
    })

    return groups
  })

  const handleViewFeature = (id: string) => {
    console.log('Feature selected:', id)
  }

  const handleMoveFeature = (id: string, startAt: Date, endAt: Date | null) => {
    const feature = features.value.find((f) => f.id === id)
    if (feature && endAt) {
      feature.startAt = startAt
      feature.endAt = endAt
    }
  }

  const handleScheduleItemChange = (payload: GanttScheduleItemChange) => {
    console.log('Schedule item changed:', payload)
    handleMoveFeature(payload.feature.id, payload.startAt, payload.endAt)
  }

  const zoom = ref(100)
  const mode = ref<GanttMode>('edit')

  const handleRemoveMarker = (id: string) => {
    markers.value = markers.value.filter((m) => m.id !== id)
  }

  const handleCreateMarker = (date: Date) => {
    const id = String(markers.value.length + 1)
    markers.value.push({
      id,
      date,
      label: `Marker ${id}`,
    })
  }

  const handleAddFeature = (date: Date) => {
    const id = String(features.value.length + 1)
    features.value.push({
      id,
      name: `New Feature ${id}`,
      startAt: date,
      endAt: new Date(date.getTime() + 2 * 60 * 60 * 1000),
      status: plannedStatus,
    })
  }
</script>

<template>
  <Page
    subtitle="Components"
    title="Gantt Chart"
    description="Interactive Gantt chart component for project timeline visualization.">
    <div class="mb-2 flex items-center justify-between gap-2">
      <div class="flex items-center gap-2">
        <span class="text-xs text-muted-foreground">Mode</span>
        <UiButton size="sm" variant="outline" :disabled="mode === 'edit'" @click="mode = 'edit'">Edit</UiButton>
        <UiButton size="sm" variant="outline" :disabled="mode === 'read'" @click="mode = 'read'">Read-only</UiButton>
      </div>
      <div class="text-xs text-muted-foreground">Zoom: {{ zoom }}%</div>
    </div>

    <div class="h-[600px] border rounded-lg overflow-hidden">
      <GanttProvider v-model:zoom="zoom" v-model:mode="mode" :on-add-item="handleAddFeature" range="hourly">
        <GanttSidebar>
          <GanttSidebarGroup v-for="(groupFeatures, groupName) in groupedFeatures" :key="groupName" :name="groupName">
            <GanttSidebarItem
              v-for="feature in groupFeatures"
              :key="feature.id"
              :feature="feature"
              @select-item="handleViewFeature" />
          </GanttSidebarGroup>
        </GanttSidebar>

        <GanttTimeline>
          <GanttHeader />

          <GanttFeatureList>
            <GanttFeatureListGroup v-for="(groupFeatures, groupName) in groupedFeatures" :key="groupName">
              <div v-for="feature in groupFeatures" :key="feature.id" class="flex">
                <ContextMenu>
                  <ContextMenuTrigger as-child>
                    <button type="button" class="flex-1" @click="handleViewFeature(feature.id)">
                      <GanttFeatureItem
                        :feature="feature"
                        :on-move="handleMoveFeature"
                        @schedule-item-change="handleScheduleItemChange" />
                    </button>
                  </ContextMenuTrigger>
                  <ContextMenuContent>
                    <ContextMenuItem @click="handleViewFeature(feature.id)">View feature</ContextMenuItem>
                    <ContextMenuItem
                      class="text-destructive"
                      @click="
                        () => {
                          features = features.filter((f) => f.id !== feature.id)
                        }
                      ">
                      Remove
                    </ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>
              </div>
            </GanttFeatureListGroup>
          </GanttFeatureList>

          <GanttMarker
            v-for="marker in markers"
            :id="marker.id"
            :key="marker.id"
            :date="marker.date"
            :label="marker.label"
            @remove="handleRemoveMarker" />

          <GanttToday />
          <GanttCreateMarkerTrigger @create-marker="handleCreateMarker" />
        </GanttTimeline>
      </GanttProvider>
    </div>
  </Page>
</template>
