<script setup lang="ts">
  import { computed, ref } from 'vue'
  import type { GanttFeature, GanttMode, GanttStatus, Range } from '~/components/data/Gantt/ganttContext'

  interface ScheduleTask {
    id: string
    name: string
    category: string
    frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually' | 'custom'
    nextDue: string
    status: 'active' | 'paused' | 'upcoming'
  }

  interface ScheduleFeature extends GanttFeature {
    category: string
  }

  definePageMeta({
    layout: 'embed',
  })

  useHead({
    title: 'Schedule Timeline',
  })

  const route = useRoute()

  const parseRange = (value: unknown): Range => {
    if (value === 'hourly' || value === 'daily' || value === 'monthly' || value === 'quarterly') {
      return value
    }
    return 'monthly'
  }

  const mode = ref<GanttMode>('read')
  const zoom = ref(Number(route.query.zoom) || 100)
  const range = ref<Range>(parseRange(route.query.range))

  const statusMap: Record<ScheduleTask['status'], GanttStatus> = {
    active: { id: 'active', name: 'Active', color: '#10A96A' },
    paused: { id: 'paused', name: 'Paused', color: '#6B7280' },
    upcoming: { id: 'upcoming', name: 'Upcoming', color: '#FDC601' },
  }

  const tasks: ScheduleTask[] = [
    {
      id: '1',
      name: 'Monthly Air Emissions Report',
      category: 'Air Quality',
      frequency: 'monthly',
      nextDue: '2026-02-15',
      status: 'active',
    },
    {
      id: '2',
      name: 'Quarterly Wastewater Sampling',
      category: 'Water',
      frequency: 'quarterly',
      nextDue: '2026-04-01',
      status: 'active',
    },
    {
      id: '3',
      name: 'Annual Stack Test - All Units',
      category: 'Air Quality',
      frequency: 'annually',
      nextDue: '2026-06-15',
      status: 'upcoming',
    },
    {
      id: '4',
      name: 'Weekly Stormwater Inspection',
      category: 'Water',
      frequency: 'weekly',
      nextDue: '2026-01-27',
      status: 'active',
    },
    {
      id: '5',
      name: 'SPCC Plan Review',
      category: 'Hazmat',
      frequency: 'annually',
      nextDue: '2026-01-30',
      status: 'paused',
    },
    {
      id: '6',
      name: 'Baghouse Filter Inspection',
      category: 'Air Quality',
      frequency: 'monthly',
      nextDue: '2026-02-01',
      status: 'paused',
    },
    {
      id: '7',
      name: 'Annual Regulatory Report',
      category: 'Reporting',
      frequency: 'annually',
      nextDue: '2026-09-30',
      status: 'upcoming',
    },
    {
      id: '8',
      name: 'Daily Opacity Readings',
      category: 'Air Quality',
      frequency: 'daily',
      nextDue: '2026-01-21',
      status: 'active',
    },
  ]

  const durationByFrequency: Record<ScheduleTask['frequency'], number> = {
    daily: 1,
    weekly: 3,
    monthly: 7,
    quarterly: 14,
    annually: 21,
    custom: 5,
  }

  const toDate = (iso: string, hour = 10) => {
    const parts = iso.split('-').map((value) => Number(value))
    const year = parts[0] ?? 1970
    const month = parts[1] ?? 1
    const day = parts[2] ?? 1
    return new Date(year, month - 1, day, hour, 0, 0, 0)
  }

  const addDays = (date: Date, days: number) => {
    const next = new Date(date)
    next.setDate(next.getDate() + days)
    return next
  }

  const features = computed<ScheduleFeature[]>(() =>
    tasks.map((task) => {
      const endAt = toDate(task.nextDue, 12)
      const duration = durationByFrequency[task.frequency] ?? 3
      const startAt = addDays(endAt, -duration)
      return {
        id: task.id,
        name: task.name,
        startAt,
        endAt,
        status: statusMap[task.status],
        category: task.category,
      }
    }),
  )

  const groupedFeatures = computed<Record<string, ScheduleFeature[]>>(() => {
    const groups: Record<string, ScheduleFeature[]> = {}
    features.value.forEach((feature) => {
      if (!groups[feature.category]) {
        groups[feature.category] = []
      }
      groups[feature.category]!.push(feature)
    })
    return groups
  })
</script>

<template>
  <div class="h-dvh w-full bg-background text-foreground">
    <div v-if="features.length === 0" class="flex h-full items-center justify-center text-sm text-muted-foreground">
      No schedule data available.
    </div>
    <div v-else class="h-full">
      <GanttProvider :range="range" :zoom="zoom" :mode="mode" class-name="rounded-none">
        <GanttSidebar>
          <GanttSidebarGroup v-for="(items, category) in groupedFeatures" :key="category" :name="category">
            <GanttSidebarItem v-for="feature in items" :key="feature.id" :feature="feature" />
          </GanttSidebarGroup>
        </GanttSidebar>

        <GanttTimeline>
          <GanttHeader />
          <GanttToday />
          <GanttFeatureList>
            <GanttFeatureListGroup v-for="(items, category) in groupedFeatures" :key="`group-${category}`">
              <div v-for="feature in items" :key="`feature-${feature.id}`" class="flex">
                <GanttFeatureItem :feature="feature" />
              </div>
            </GanttFeatureListGroup>
          </GanttFeatureList>
        </GanttTimeline>
      </GanttProvider>
    </div>
  </div>
</template>
