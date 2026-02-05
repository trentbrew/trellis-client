<script setup lang="ts">
  definePageMeta({
    layout: 'default',
  })

  const { currentFacility } = useFacilities()
  const route = useRoute()

  useHead(() => ({
    title: `Facility Status | ${currentFacility.value?.name || 'Facility'}`,
  }))

  const reportYear = computed(() => route.params.year || '2024')
  const deadline = 'September 30'
  const deadlineMonth = 8
  const deadlineDay = 30
  const daysRemaining = computed(() => {
    const now = new Date()
    const year = parseInt(reportYear.value as string, 10)
    const dueDate = new Date(year, deadlineMonth, deadlineDay)
    const diff = dueDate.getTime() - now.getTime()
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
  })

  interface WorkflowStep {
    id: string
    title: string
    description: string
    status: 'completed' | 'active' | 'pending' | 'locked'
    icon: string
    progress?: string
    actionLabel?: string
    actionDisabled?: boolean
  }

  const workflowSteps = ref<WorkflowStep[]>([
    {
      id: 'add-products',
      title: 'Add products',
      description: '31 products have been added.',
      status: 'active',
      icon: 'lucide:package',
      actionLabel: 'Add products',
    },
    {
      id: 'define-activity',
      title: 'Define activity levels',
      description: '132,834.82 lbs. reported.',
      status: 'pending',
      icon: 'lucide:activity',
    },
    {
      id: 'review-thresholds',
      title: 'Review thresholds',
      description: 'Please add products and define activity levels before reviewing thresholds.',
      status: 'pending',
      icon: 'lucide:gauge',
    },
    {
      id: 'assign-profiles',
      title: 'Assign release profiles',
      description: 'Please add products and define activity levels before assigning release profiles.',
      status: 'pending',
      icon: 'lucide:file-check',
    },
    {
      id: 'answer-questions',
      title: 'Answer questions',
      description: 'You must assign release profiles before you can answer questions.',
      status: 'pending',
      icon: 'lucide:help-circle',
    },
    {
      id: 'final-review',
      title: 'Final review',
      description: 'You must answer questions before you can review the final report data.',
      status: 'pending',
      icon: 'lucide:clipboard-check',
    },
  ])

  const completedSteps = computed(() => workflowSteps.value.filter((s) => s.status === 'completed').length)
  const totalSteps = computed(() => workflowSteps.value.length)
  const progressPercent = computed(() => Math.round((completedSteps.value / totalSteps.value) * 100))

  const thresholdData = ref({
    chemical: 'Styrene (Processed)',
    years: [
      { year: 2023, value: 180 },
      { year: 2024, value: 380 },
    ],
    threshold: 250,
    percentChange: '+99886.7%',
  })

  const topProduct = ref({
    name: 'Styrene (Processed)',
    percent: 99,
    description: 'Sweet, Sweet Natural Gas',
    subtext: 'Contains 2.5% Styrene',
    thresholdPercent: 348.3,
  })

  const yearOverYear = ref({
    air: { change: 100.0, direction: 'up' as const },
    water: { change: 0.0, direction: 'neutral' as const },
    onsite: { change: 0.0, direction: 'neutral' as const },
    offsite: { change: 0.0, direction: 'neutral' as const },
    total: { change: 100.0, direction: 'up' as const },
  })

  const releaseCategories = ref(['Air', 'Water', 'Onsite', 'Offsite'])
  const selectedCategories = ref(['Air'])

  const chartData = ref([
    { category: 'Air', y2023: 0, y2024: 48000 },
    { category: 'Water', y2023: 0, y2024: 0 },
    { category: 'Onsite', y2023: 0, y2024: 0 },
    { category: 'Offsite', y2023: 0, y2024: 0 },
  ])

  const maxChartValue = computed(() => {
    const max = Math.max(...chartData.value.flatMap((d) => [d.y2023, d.y2024]))
    return Math.ceil(max / 10000) * 10000 || 60000
  })

  function getStepStatusColor(status: WorkflowStep['status']) {
    switch (status) {
      case 'completed':
        return 'bg-emerald-500 text-white'
      case 'active':
        return 'bg-blue-500 text-white'
      case 'pending':
        return 'bg-muted text-muted-foreground'
      case 'locked':
        return 'bg-slate-300 text-slate-500'
    }
  }

  function getStepBorderColor(status: WorkflowStep['status']) {
    switch (status) {
      case 'completed':
        return 'border-emerald-200 bg-emerald-50/50'
      case 'active':
        return 'border-blue-200 bg-blue-50/50'
      default:
        return 'border-border bg-background'
    }
  }

  function toggleCategory(cat: string) {
    const idx = selectedCategories.value.indexOf(cat)
    if (idx === -1) {
      selectedCategories.value.push(cat)
    } else if (selectedCategories.value.length > 1) {
      selectedCategories.value.splice(idx, 1)
    }
  }
</script>

<template>
  <Page variant="canvas" :fill-height="true">
    <div class="flex flex-col h-full overflow-hidden">
      <!-- Header -->
      <div class="shrink-0 border-b border-border bg-linear-to-r from-slate-800 to-slate-700 px-6 py-5">
        <div class="flex items-start gap-4">
          <div
            class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/10 text-white">
            <Icon name="lucide:building-2" class="h-6 w-6" />
          </div>
          <div class="flex-1 min-w-0">
            <h1 class="text-lg font-semibold text-white">
              {{ currentFacility?.name || 'Facility' }} Status
            </h1>
            <p class="text-sm text-slate-300 mt-0.5">
              Navigate the compliance reporting process for {{ reportYear }}. Follow the steps below to complete your annual submission.
            </p>
          </div>
        </div>

        <!-- Progress Bar -->
        <div class="mt-5 flex items-center gap-6">
          <div class="flex items-center gap-3 rounded-lg bg-white/10 px-4 py-2.5">
            <div class="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500 text-white">
              <Icon name="lucide:calendar" class="h-4 w-4" />
            </div>
            <div>
              <p class="text-xs font-medium text-white">{{ reportYear }} Annual Report</p>
              <p class="text-[10px] text-slate-400">{{ daysRemaining }} days remaining</p>
            </div>
          </div>

          <div class="flex-1">
            <div class="flex items-center justify-between mb-1.5">
              <span class="text-xs text-slate-400">Report due {{ deadline }}</span>
              <div class="text-right">
                <span class="text-xs font-medium text-white">Progress</span>
                <span class="ml-2 text-xs font-bold text-emerald-400">{{ progressPercent }}%</span>
              </div>
            </div>
            <div class="h-2 rounded-full bg-white/20 overflow-hidden">
              <div
                class="h-full rounded-full bg-linear-to-r from-emerald-400 to-emerald-500 transition-all duration-500"
                :style="{ width: `${progressPercent}%` }" />
            </div>
            <p class="text-[10px] text-slate-400 mt-1 text-right">
              Deadline passed 168 days ago
            </p>
          </div>
        </div>
      </div>

      <!-- Main Content -->
      <div class="flex-1 overflow-auto">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
          <!-- Left Column: Workflow Steps -->
          <div class="space-y-4">
            <div>
              <h2 class="text-base font-semibold">Reporting Timeline</h2>
              <p class="text-xs text-muted-foreground mt-0.5">
                Complete each step to prepare your annual report
              </p>
            </div>

            <div class="space-y-3">
              <div
                v-for="step in workflowSteps"
                :key="step.id"
                class="rounded-xl border p-4 transition-all"
                :class="getStepBorderColor(step.status)">
                <div class="flex items-start gap-4">
                  <div
                    class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                    :class="getStepStatusColor(step.status)">
                    <Icon
                      v-if="step.status === 'completed'"
                      name="lucide:check"
                      class="h-5 w-5" />
                    <Icon v-else :name="step.icon" class="h-5 w-5" />
                  </div>

                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2">
                      <h3 class="text-sm font-semibold">{{ step.title }}</h3>
                      <span
                        v-if="step.status === 'active'"
                        class="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700">
                        Active
                      </span>
                      <span
                        v-else-if="step.status === 'pending'"
                        class="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                        Pending
                      </span>
                    </div>
                    <p class="text-xs text-muted-foreground mt-1">{{ step.description }}</p>

                    <div v-if="step.actionLabel && step.status === 'active'" class="mt-3 flex items-center gap-2">
                      <UiButton size="sm" variant="default" class="h-7 text-xs">
                        <Icon name="lucide:plus" class="mr-1.5 h-3.5 w-3.5" />
                        {{ step.actionLabel }}
                      </UiButton>
                      <UiButton size="sm" variant="outline" class="h-7 text-xs">
                        <Icon name="lucide:check" class="mr-1.5 h-3.5 w-3.5" />
                        Done adding products
                      </UiButton>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Right Column: Data Visualizations -->
          <div class="space-y-6">
            <!-- Threshold Comparison -->
            <div class="rounded-xl border border-border bg-background p-5">
              <div class="flex items-start justify-between mb-4">
                <div>
                  <h3 class="text-sm font-semibold">Threshold Comparison</h3>
                  <p class="text-xs text-muted-foreground">{{ thresholdData.chemical }}</p>
                </div>
                <div class="flex items-center gap-1.5 text-xs">
                  <span class="text-emerald-600 font-medium">{{ thresholdData.percentChange }}</span>
                  <span class="text-muted-foreground">year-over-year</span>
                </div>
              </div>

              <div class="flex items-center gap-3 mb-3 text-xs">
                <div class="flex items-center gap-1.5">
                  <span class="h-2.5 w-2.5 rounded-full bg-slate-400" />
                  <span class="text-muted-foreground">2023</span>
                </div>
                <div class="flex items-center gap-1.5">
                  <span class="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  <span class="text-muted-foreground">2024</span>
                </div>
              </div>

              <!-- Simple bar visualization -->
              <div class="space-y-2">
                <div class="flex items-center gap-3">
                  <div class="h-6 flex-1 rounded bg-muted overflow-hidden">
                    <div class="h-full bg-slate-400 rounded" :style="{ width: '40%' }" />
                  </div>
                </div>
                <div class="flex items-center gap-3">
                  <div class="h-6 flex-1 rounded bg-muted overflow-hidden">
                    <div class="h-full bg-emerald-500 rounded" :style="{ width: '85%' }" />
                  </div>
                </div>
              </div>

              <div class="flex items-center justify-between mt-3 text-[10px] text-muted-foreground">
                <span>0%</span>
                <span class="text-amber-600 font-medium">Exceeds Threshold</span>
                <span>200%</span>
                <span>400%</span>
              </div>

              <div class="flex items-center justify-between mt-4 pt-3 border-t border-border">
                <UiButton variant="ghost" size="sm" class="h-7 text-xs">
                  <Icon name="lucide:chevron-left" class="h-3.5 w-3.5 mr-1" />
                  Previous
                </UiButton>
                <span class="text-xs text-muted-foreground">1 / 3</span>
                <UiButton variant="ghost" size="sm" class="h-7 text-xs">
                  Next
                  <Icon name="lucide:chevron-right" class="h-3.5 w-3.5 ml-1" />
                </UiButton>
              </div>
            </div>

            <!-- Top Contributing Product -->
            <div class="rounded-xl border border-border bg-background p-5">
              <h3 class="text-sm font-semibold mb-1">Top Contributing Product</h3>
              <p class="text-xs text-muted-foreground mb-4">{{ topProduct.name }}</p>

              <div class="flex items-center gap-6">
                <!-- Donut Chart -->
                <div class="relative h-28 w-28 shrink-0">
                  <svg viewBox="0 0 36 36" class="h-full w-full -rotate-90">
                    <path
                      class="text-muted"
                      stroke="currentColor"
                      stroke-width="3"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                    <path
                      class="text-emerald-500"
                      stroke="currentColor"
                      stroke-width="3"
                      stroke-linecap="round"
                      fill="none"
                      :stroke-dasharray="`${topProduct.percent}, 100`"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  </svg>
                  <div class="absolute inset-0 flex flex-col items-center justify-center">
                    <span class="text-2xl font-bold">{{ topProduct.percent }}%</span>
                    <span class="text-[9px] text-muted-foreground">of chemical total</span>
                  </div>
                </div>

                <div class="flex-1 space-y-2">
                  <p class="text-sm font-medium text-amber-600">{{ topProduct.description }}</p>
                  <p class="text-xs text-muted-foreground">{{ topProduct.subtext }}</p>
                  <p class="text-xs">
                    Accounts for
                    <span class="font-semibold text-amber-600">{{ topProduct.thresholdPercent }}%</span>
                    of reporting threshold
                  </p>
                </div>
              </div>
            </div>

            <!-- Release Comparison -->
            <div class="rounded-xl border border-border bg-background p-5">
              <h3 class="text-sm font-semibold mb-1">Release Comparison</h3>
              <p class="text-xs text-muted-foreground mb-4">
                Compare releases for selected chemicals across air, water, and land.
              </p>

              <!-- Chemical selector placeholder -->
              <div class="flex items-center gap-2 mb-4 pb-4 border-b border-border">
                <div class="h-6 flex-1 rounded bg-muted/50 px-3 flex items-center">
                  <span class="text-xs text-muted-foreground">Xylene (mixed isomers)</span>
                </div>
              </div>

              <!-- Year over Year Changes -->
              <div class="mb-5">
                <h4 class="text-xs font-medium text-muted-foreground mb-3">Year-over-Year Changes</h4>
                <div class="grid grid-cols-5 gap-3">
                  <div class="text-center">
                    <p class="text-[10px] text-muted-foreground mb-1">Air</p>
                    <p class="text-sm font-semibold text-emerald-600">
                      <Icon name="lucide:trending-up" class="inline h-3 w-3 mr-0.5" />
                      {{ yearOverYear.air.change }}%
                    </p>
                  </div>
                  <div class="text-center">
                    <p class="text-[10px] text-muted-foreground mb-1">Water</p>
                    <p class="text-sm font-semibold text-muted-foreground">
                      <Icon name="lucide:minus" class="inline h-3 w-3 mr-0.5" />
                      {{ yearOverYear.water.change }}%
                    </p>
                  </div>
                  <div class="text-center">
                    <p class="text-[10px] text-muted-foreground mb-1">Onsite</p>
                    <p class="text-sm font-semibold text-muted-foreground">
                      <Icon name="lucide:minus" class="inline h-3 w-3 mr-0.5" />
                      {{ yearOverYear.onsite.change }}%
                    </p>
                  </div>
                  <div class="text-center">
                    <p class="text-[10px] text-muted-foreground mb-1">Offsite</p>
                    <p class="text-sm font-semibold text-muted-foreground">
                      <Icon name="lucide:minus" class="inline h-3 w-3 mr-0.5" />
                      {{ yearOverYear.offsite.change }}%
                    </p>
                  </div>
                  <div class="text-center">
                    <p class="text-[10px] text-muted-foreground mb-1">Total</p>
                    <p class="text-sm font-semibold text-emerald-600">
                      <Icon name="lucide:trending-up" class="inline h-3 w-3 mr-0.5" />
                      {{ yearOverYear.total.change }}%
                    </p>
                  </div>
                </div>
              </div>

              <!-- Category toggles -->
              <div class="flex items-center gap-2 mb-4">
                <button
                  v-for="cat in releaseCategories"
                  :key="cat"
                  class="rounded-full px-3 py-1 text-xs font-medium transition-colors"
                  :class="
                    selectedCategories.includes(cat)
                      ? cat === 'Air'
                        ? 'bg-sky-500 text-white'
                        : cat === 'Water'
                          ? 'bg-blue-500 text-white'
                          : cat === 'Onsite'
                            ? 'bg-emerald-500 text-white'
                            : 'bg-slate-500 text-white'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  "
                  @click="toggleCategory(cat)">
                  {{ cat }}
                </button>
              </div>

              <!-- Legend -->
              <div class="flex items-center gap-4 mb-3 text-xs">
                <div class="flex items-center gap-1.5">
                  <span class="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  <span class="text-muted-foreground">2023</span>
                </div>
                <div class="flex items-center gap-1.5">
                  <span class="h-2.5 w-2.5 rounded-full bg-emerald-300" />
                  <span class="text-muted-foreground">2024</span>
                </div>
              </div>

              <!-- Simple Bar Chart -->
              <div class="relative h-40">
                <div class="absolute left-0 top-0 bottom-6 w-12 flex flex-col justify-between text-[10px] text-muted-foreground">
                  <span>60,000 lbs</span>
                  <span>40,000 lbs</span>
                  <span>20,000 lbs</span>
                  <span>0 lbs</span>
                </div>
                <div class="ml-14 h-full flex items-end gap-8 pb-6">
                  <div
                    v-for="item in chartData"
                    :key="item.category"
                    class="flex-1 flex items-end justify-center gap-1">
                    <div
                      class="w-6 bg-emerald-500 rounded-t transition-all"
                      :style="{ height: `${(item.y2023 / maxChartValue) * 100}%` }" />
                    <div
                      class="w-6 bg-emerald-300 rounded-t transition-all"
                      :style="{ height: `${(item.y2024 / maxChartValue) * 100}%` }" />
                  </div>
                </div>
                <div class="ml-14 flex justify-around text-[10px] text-muted-foreground">
                  <span v-for="item in chartData" :key="item.category">{{ item.category }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Page>
</template>
