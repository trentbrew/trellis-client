<script setup lang="ts">
  import {
    activityLog,
    facilities,
    formatRelativeTime,
    getDashboardStats,
    getProgramById,
    getTeamMemberByName,
    questionnaires,
    responseStatuses,
  } from '~/data/apptool-mock-data'

  const stats = computed(() => getDashboardStats())

  const dashboardMetrics = computed(() => [
    {
      label: 'Total Determinations',
      value: stats.value.totalDeterminations.toString(),
      icon: 'lucide:file-check',
      trend: 12,
    },
    {
      label: 'Active Templates',
      value: stats.value.activeTemplates.toString(),
      icon: 'lucide:layout-template',
      trend: 3,
    },
    {
      label: 'Active Determinations',
      value: (stats.value.activeDeterminations ?? 0).toString(),
      icon: 'lucide:file-check',
      trend: 8,
    },
    {
      label: 'Facilities',
      value: stats.value.totalFacilities.toString(),
      icon: 'lucide:building-2',
      trend: 0,
    },
  ])

  const recentDeterminations = computed(() => {
    return responseStatuses.slice(0, 5).map((rs) => {
      const facility = facilities.find((f) => f.id === rs.facilityId)
      const questionnaire = questionnaires.find((q) => q.id === rs.questionnaireId)
      const program = questionnaire ? getProgramById(questionnaire.program) : null
      return {
        id: rs.id,
        title: questionnaire?.name || rs.standard,
        facility: facility?.name || 'Unknown',
        status:
          rs.progress === 'Complete'
            ? 'complete'
            : rs.progress === 'Incomplete' && rs.completedQuestions > 0
              ? 'in_progress'
              : 'pending',
        date: formatRelativeTime(rs.lastUpdated),
        result: rs.status || null,
        program,
      }
    })
  })

  const facilityProgress = computed(() => {
    return facilities.slice(0, 4).map((facility) => {
      const facilityStatuses = responseStatuses.filter((rs) => rs.facilityId === facility.id)
      const completed = facilityStatuses.filter((rs) => rs.progress === 'Complete').length
      const total = facilityStatuses.length || 1
      return {
        id: facility.id,
        name: facility.name,
        completed,
        total,
        percentage: Math.round((completed / total) * 100),
      }
    })
  })

  const recentActivity = computed(() => {
    return activityLog.slice(0, 4).map((activity) => {
      const member = getTeamMemberByName(activity.user)
      const facility = activity.facilityId ? facilities.find((f) => f.id === activity.facilityId) : null
      return {
        id: activity.id,
        user: {
          name: activity.user,
          initials:
            member?.initials ||
            activity.user
              .split(' ')
              .map((n) => n[0])
              .join(''),
        },
        action: activity.type.replace(/_/g, ' ').replace('determination ', ''),
        target: activity.title.replace(' completed', '').replace(' started', ''),
        facility: facility?.name || null,
        time: formatRelativeTime(activity.timestamp),
      }
    })
  })

  function getStatusBadge(status: string) {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'outline' | 'destructive'; label: string }> = {
      complete: { variant: 'default', label: 'Complete' },
      in_progress: { variant: 'secondary', label: 'In Progress' },
      pending: { variant: 'outline', label: 'Pending' },
    }
    return variants[status] || { variant: 'outline', label: status }
  }

  function getResultClass(result: string | null) {
    if (result === 'Applicable') return 'text-green-600 dark:text-green-400'
    if (result === 'Not Applicable') return 'text-amber-600 dark:text-amber-400'
    return 'text-muted-foreground'
  }
</script>

<template>
  <Page variant="canvas" :fill-height="true">
    <div class="space-y-6 p-6 overflow-y-auto">
      <!-- Hero Section -->
      <div class="grid gap-6 lg:grid-cols-3">
        <!-- Main Hero Card -->
        <UiCard class="lg:col-span-2 overflow-hidden p-0! rounded-xl">
          <div class="relative h-full min-h-[280px] bg-linear-to-br from-slate-700 to-slate-900">
            <div class="absolute inset-0 bg-linear-to-t from-slate-900/90 via-slate-900/50 to-transparent" />
            <div class="relative z-10 flex flex-col h-full p-6 text-white">
              <!-- Top row with buttons -->
              <div class="flex items-start justify-between mb-auto">
                <div class="flex items-center gap-2">
                  <Icon name="lucide:history" class="size-5 opacity-80" />
                  <span class="text-sm opacity-80">Continue your work</span>
                </div>
                <div class="flex items-center gap-3">
                  <UiButton class="bg-white text-slate-900 hover:bg-white/90">
                    <Icon name="lucide:arrow-right" class="mr-2 size-4" />
                    Open Last Facility
                  </UiButton>
                </div>
              </div>
              <!-- Bottom content -->
              <div class="mt-auto pb-12">
                <h1 class="text-2xl font-bold mb-2">Applicability Determinations</h1>
                <p class="text-white/70 max-w-md">
                  Continue with your facility applicability determinations and compliance tracking.
                </p>
              </div>
            </div>
            <!-- Stats Bar -->
            <div
              class="absolute bottom-0 left-0 right-0 grid grid-cols-3 divide-x divide-white/20 bg-slate-900/80 backdrop-blur-sm">
              <div class="p-3 text-center text-white">
                <p class="text-xl font-bold">{{ stats.totalFacilities }}</p>
                <p class="text-xs text-white/60">Facilities</p>
              </div>
              <div class="p-3 text-center text-white">
                <p class="text-xl font-bold">
                  {{ Math.round((stats.completedDeterminations / stats.totalDeterminations) * 100) }}%
                </p>
                <p class="text-xs text-white/60">Progress</p>
              </div>
              <div class="p-3 text-center text-white">
                <p class="text-xl font-bold text-amber-400">{{ stats.activeDeterminations ?? 0 }}</p>
                <p class="text-xs text-white/60">Active</p>
              </div>
            </div>
          </div>
        </UiCard>

        <!-- Quick Access Cards -->
        <div class="space-y-3">
          <h3 class="text-sm font-medium text-muted-foreground">Quick Access</h3>
          <UiCard class="cursor-pointer transition-all hover:shadow-md hover:border-primary/30">
            <UiCardContent class="flex items-center gap-4 p-4">
              <div class="flex size-12 items-center justify-center rounded-xl bg-sky-100 dark:bg-sky-900/30">
                <Icon name="lucide:file-plus" class="size-6 text-sky-600" />
              </div>
              <div class="flex-1">
                <p class="font-medium">New Determination</p>
                <p class="text-xs text-muted-foreground">Start a new applicability assessment</p>
              </div>
              <Icon name="lucide:arrow-right" class="size-4 text-muted-foreground" />
            </UiCardContent>
          </UiCard>
          <NuxtLink to="/apptool/determinations">
            <UiCard class="cursor-pointer transition-all hover:shadow-md hover:border-primary/30">
              <UiCardContent class="flex items-center gap-4 p-4">
                <div class="flex size-12 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/30">
                  <Icon name="lucide:file-check" class="size-6 text-amber-600" />
                </div>
                <div class="flex-1">
                  <p class="font-medium">Active Determinations</p>
                  <p class="text-xs text-muted-foreground">{{ stats.activeDeterminations ?? 0 }} in progress</p>
                </div>
                <Icon name="lucide:arrow-right" class="size-4 text-muted-foreground" />
              </UiCardContent>
            </UiCard>
          </NuxtLink>
          <NuxtLink to="/apptool/compliance-issues">
            <UiCard class="cursor-pointer transition-all hover:shadow-md hover:border-primary/30">
              <UiCardContent class="flex items-center gap-4 p-4">
                <div class="flex size-12 items-center justify-center rounded-xl bg-red-100 dark:bg-red-900/30">
                  <Icon name="lucide:shield-alert" class="size-6 text-red-600" />
                </div>
                <div class="flex-1">
                  <p class="font-medium">Compliance Issues</p>
                  <p class="text-xs text-muted-foreground">Review and resolve issues</p>
                </div>
                <Icon name="lucide:arrow-right" class="size-4 text-muted-foreground" />
              </UiCardContent>
            </UiCard>
          </NuxtLink>
        </div>
      </div>

      <!-- Metrics Cards -->
      <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <UiCard v-for="metric in dashboardMetrics" :key="metric.label">
          <UiCardHeader class="flex flex-row items-center justify-between pb-2">
            <UiCardTitle class="text-muted-foreground text-sm font-medium">
              {{ metric.label }}
            </UiCardTitle>
            <Icon :name="metric.icon" class="text-muted-foreground size-4" />
          </UiCardHeader>
          <UiCardContent>
            <div class="text-2xl font-bold">{{ metric.value }}</div>
            <div v-if="metric.trend !== 0" class="mt-1 flex items-center text-xs">
              <Icon
                :name="metric.trend > 0 ? 'lucide:trending-up' : 'lucide:trending-down'"
                class="mr-1 size-3"
                :class="metric.trend > 0 ? 'text-green-500' : 'text-red-500'" />
              <span :class="metric.trend > 0 ? 'text-green-500' : 'text-red-500'">{{ Math.abs(metric.trend) }}%</span>
              <span class="text-muted-foreground ml-1">from last month</span>
            </div>
          </UiCardContent>
        </UiCard>
      </div>

      <!-- Main Content Grid -->
      <div class="grid gap-6 lg:grid-cols-3">
        <!-- Recent Determinations -->
        <UiCard class="lg:col-span-2">
          <UiCardHeader>
            <div class="flex items-center justify-between">
              <div>
                <UiCardTitle>Recent Determinations</UiCardTitle>
                <UiCardDescription>Latest applicability assessments</UiCardDescription>
              </div>
              <UiButton variant="outline" size="sm">
                View All
                <Icon name="lucide:arrow-right" class="ml-2 size-3" />
              </UiButton>
            </div>
          </UiCardHeader>
          <UiCardContent>
            <div class="space-y-4">
              <div
                v-for="determination in recentDeterminations"
                :key="determination.id"
                class="flex items-center gap-4 rounded-lg border border-slate-200 dark:border-slate-700 p-3 transition-colors hover:bg-muted/50">
                <div
                  class="flex size-10 items-center justify-center rounded-lg overflow-hidden"
                  :class="determination.program?.bgColor || 'bg-primary/10'">
                  <Icon :name="determination.program?.icon || 'lucide:file-check'" class="size-5 text-primary" />
                </div>
                <div class="min-w-0 flex-1">
                  <p class="truncate text-sm font-medium">{{ determination.title }}</p>
                  <p class="text-muted-foreground text-xs">{{ determination.facility }} · {{ determination.date }}</p>
                </div>
                <div class="flex items-center gap-2">
                  <span
                    v-if="determination.result"
                    class="text-xs font-medium"
                    :class="getResultClass(determination.result)">
                    {{ determination.result }}
                  </span>
                  <UiBadge :variant="getStatusBadge(determination.status).variant">
                    {{ getStatusBadge(determination.status).label }}
                  </UiBadge>
                </div>
              </div>
            </div>
          </UiCardContent>
        </UiCard>

        <!-- Compliance Status Card -->
        <UiCard>
          <UiCardHeader>
            <UiCardTitle>Compliance Status</UiCardTitle>
            <UiCardDescription>Current compliance health and issues</UiCardDescription>
          </UiCardHeader>
          <UiCardContent class="space-y-4">
            <div class="flex items-center gap-3">
              <Icon
                :name="
                  stats.complianceStatus === 'Compliant'
                    ? 'lucide:check-circle'
                    : stats.complianceStatus === 'Attention Needed'
                      ? 'lucide:alert-triangle'
                      : 'lucide:x-circle'
                "
                :class="[
                  'size-7',
                  stats.complianceStatus === 'Compliant'
                    ? 'text-green-500'
                    : stats.complianceStatus === 'Attention Needed'
                      ? 'text-amber-500'
                      : 'text-red-500',
                ]" />
              <div>
                <div class="font-semibold text-lg">
                  {{ stats.complianceStatus || 'Unknown' }}
                </div>
                <div class="text-xs text-muted-foreground">
                  {{ stats.complianceStatusMessage || 'No recent compliance issues detected.' }}
                </div>
              </div>
            </div>
          </UiCardContent>
        </UiCard>
      </div>

      <!-- Bottom Row -->
      <div class="grid gap-6 lg:grid-cols-2">
        <!-- Facility Progress -->
        <UiCard>
          <UiCardHeader>
            <UiCardTitle>Facility Progress</UiCardTitle>
            <UiCardDescription>Determination completion by facility</UiCardDescription>
          </UiCardHeader>
          <UiCardContent>
            <div class="space-y-4">
              <div v-for="facility in facilityProgress" :key="facility.name" class="space-y-2">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <Icon name="lucide:building-2" class="size-4 text-muted-foreground" />
                    <span class="text-sm font-medium">{{ facility.name }}</span>
                  </div>
                  <span class="text-sm text-muted-foreground">{{ facility.completed }}/{{ facility.total }}</span>
                </div>
                <div class="flex items-center gap-2">
                  <UiProgress :model-value="facility.percentage" class="h-2 flex-1" />
                  <span class="text-xs font-medium w-10 text-right">{{ facility.percentage }}%</span>
                </div>
              </div>
            </div>
          </UiCardContent>
        </UiCard>

        <!-- Recent Activity -->
        <UiCard>
          <UiCardHeader>
            <UiCardTitle>Recent Activity</UiCardTitle>
            <UiCardDescription>Latest actions across the system</UiCardDescription>
          </UiCardHeader>
          <UiCardContent>
            <div class="space-y-4">
              <div v-for="activity in recentActivity" :key="activity.id" class="flex gap-3">
                <UiAvatar :fallback="activity.user.initials" class="size-8" />
                <div class="min-w-0 flex-1">
                  <p class="text-sm">
                    <span class="font-medium">{{ activity.user.name }}</span>
                    <span class="text-muted-foreground">{{ activity.action }}</span>
                    <span class="font-medium">{{ activity.target }}</span>
                  </p>
                  <p class="text-muted-foreground text-xs">
                    {{ activity.facility ? `${activity.facility} · ` : '' }}{{ activity.time }}
                  </p>
                </div>
              </div>
            </div>
          </UiCardContent>
        </UiCard>
      </div>
    </div>
  </Page>
</template>
