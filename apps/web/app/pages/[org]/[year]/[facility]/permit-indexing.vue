<script setup lang="ts">
  import type { PermitCondition } from '~/components/permit/ConditionCard.vue'
  import PermitPageThumbnails from '~/components/permit/PageThumbnails.vue'
  import PermitSelectionPopover from '~/components/permit/SelectionPopover.vue'
  import PermitSearchPanel from '~/components/permit/SearchPanel.vue'
  import PermitConditionsSidebar from '~/components/permit/ConditionsSidebar.vue'
  import PermitConditionBubble from '~/components/permit/ConditionBubble.vue'
  import PermitMockPdfPage from '~/components/permit/MockPdfPage.vue'

  definePageMeta({
    layout: 'default',
  })

  const { currentFacility } = useFacilities()

  useHead(() => ({
    title: `Permit Indexing | ${currentFacility.value?.name || 'Facility'}`,
  }))

  const showConditionPanel = ref(true)
  const panelMode = ref<'floating' | 'docked'>('docked')
  const sidebarCollapsed = ref(false)
  const currentPage = ref(3)
  const totalPages = ref(10)
  const activeConditionId = ref<string | null>('cond-1')

  // Text selection state
  const showSelectionPopover = ref(false)
  const selectionPosition = ref({ x: 0, y: 0 })
  const selectedText = ref('')
  const pdfContentRef = ref<HTMLDivElement>()

  // Search state
  const showSearchPanel = ref(false)
  const searchQuery = ref('')

  const demoConditions: PermitCondition[] = [
    {
      id: 'cond-1',
      number: 1,
      page: 3,
      reference: '1',
      type: 'other',
      quote:
        'The owner or operator shall continue to operate under all applicable requirements, including emission limits and standards, testing, monitoring, record keeping, and reporting of the existing Title V Operating Permit (TV-0820-0001) that are not changed or contravened by this construction permit.',
      taskDescription:
        'Continue operating in compliance with all requirements of the existing Title V Operating Permit (TV-0820-0001) that are not altered by this construction permit.',
      valuableAsAuditItem: false,
      specificUnits: ['Debur-1', 'Debur-2', 'CD-Mob-1', 'CD-Mob-2'],
      needsTask: true,
    },
    {
      id: 'cond-2',
      number: 2,
      page: 3,
      reference: '2',
      type: 'other',
      quote:
        'This permit supersedes construction permit 0820-0001-DL issued December 21, 2020. All applicable requirements from construction permit 0820-0001-DL have been included in this construction permit.',
      taskDescription:
        'Acknowledge that this permit replaces construction permit 0820-0001-DL, and all its requirements are incorporated herein.',
      valuableAsAuditItem: false,
      needsTask: false,
    },
    {
      id: 'cond-3',
      number: 3,
      page: 4,
      reference: '3',
      type: 'monitoring',
      quote:
        '(S.C. Regulation 61-62.5, Standard No. 4, Section IX) Where construction or modification began after December 31, 1985, emissions from this/these source(s) (including fugitive emissions) shall not exhibit an opacity greater than 20%, each.',
      taskDescription: 'Ensure that emissions from the specified sources do not exceed 20% opacity.',
      valuableAsAuditItem: false,
      limits: 'Limit: Opacity ≤ 20%\nEvaluation Method: Method 9\nBasis: S.C. Regulation 61-62.5, Standard No. 4',
      specificUnits: ['Debur-1', 'Debur-2', 'CD-Mob-1', 'CD-Mob-2'],
      needsTask: true,
    },
    {
      id: 'cond-4',
      number: 4,
      page: 4,
      reference: '4',
      type: 'monitoring',
      quote:
        '(S.C. Regulation 61-62.5, Standard No. 4, Section VIII) Particulate matter emissions shall be limited to the rate specified by use of the following equations.',
      taskDescription:
        'Monitor and ensure particulate matter emissions comply with calculated limits based on process weight rates.',
      valuableAsAuditItem: false,
      limits:
        'For P ≤ 30 ton/hr: E = (F) × 4.10P^0.67\nFor P > 30 ton/hr: E = (F) × (55.0P^0.11 - 40)\nDebur-1: Max 8.0 ton/hr\nDebur-2: Max 8.0 ton/hr',
      specificUnits: ['Debur-1', 'Debur-2'],
      needsTask: true,
    },
    {
      id: 'cond-5',
      number: 5,
      page: 4,
      reference: '5',
      type: 'other',
      quote:
        'Filter(s) shall be operational and in place at all times when equipment or processes controlled by filter(s) are operating, except during periods of malfunction or mechanical failure.',
      taskDescription:
        'Ensure filters are operational during equipment operation. Check filter change indicator each use and replace as needed. Document operation and maintenance checks.',
      valuableAsAuditItem: true,
      specificUnits: ['Debur-1', 'Debur-2', 'CD-Mob-1', 'CD-Mob-2'],
      needsTask: true,
    },
    {
      id: 'cond-6',
      number: 1,
      page: 5,
      reference: 'GFW-1',
      type: 'report',
      quote:
        'Regulation 61-30, Environmental Protection Fees. In the event of an emergency, the owner or operator may document an emergency situation through properly signed, contemporaneous operating logs.',
      taskDescription:
        'Document any emergency situations with proper logs. Provide verbal notification within 24 hours and written report within 30 days of emission exceedances.',
      valuableAsAuditItem: true,
      needsTask: false,
    },
    {
      id: 'cond-7',
      number: 2,
      page: 5,
      reference: 'GFW-2',
      type: 'other',
      quote:
        '(S.C. Regulation 61-62.1, Section II(O)) Upon presentation of credentials, the owner or operator shall allow the Department to enter, inspect, and sample at the facility.',
      taskDescription:
        'Allow Department access for inspections, record review, equipment inspection, and sampling as authorized.',
      valuableAsAuditItem: false,
      needsTask: false,
    },
    {
      id: 'cond-8',
      number: 1,
      page: 6,
      reference: 'EIR-1',
      type: 'report',
      quote:
        'All newly permitted and constructed Title V sources shall complete and submit an emissions inventory consistent with the schedule approved pursuant to S.C. Regulation 61-62.1, Section III.',
      taskDescription:
        'Submit Emissions Inventory Reports to the Manager of the Emissions Inventory Section, Bureau of Air Quality.',
      valuableAsAuditItem: true,
      needsTask: true,
    },
    {
      id: 'cond-9',
      number: 1,
      page: 6,
      reference: 'RK-1',
      type: 'other',
      quote:
        '(S.C. Regulation 61-62.1, Section II(j)(1)(g)) A copy of the Department issued construction and/or operating permit must be kept readily available at the facility at all times.',
      taskDescription:
        'Maintain operational records, make reports, install and maintain monitoring equipment, and keep permit copy readily available at facility.',
      valuableAsAuditItem: true,
      needsTask: false,
    },
  ]

  const pageInfos = computed(() => {
    const pages = []
    for (let i = 1; i <= totalPages.value; i++) {
      const conditionsOnPage = demoConditions.filter((c) => c.page === i)
      pages.push({
        page: i,
        hasConditions: conditionsOnPage.length > 0,
        conditionCount: conditionsOnPage.length,
      })
    }
    return pages
  })

  const activeCondition = computed(() => demoConditions.find((c) => c.id === activeConditionId.value) || null)

  function getTypeBadgeClass(type: PermitCondition['type']) {
    const classes: Record<string, string> = {
      monitoring: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
      recordkeeping: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      reporting: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
      other: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400',
    }
    return classes[type || 'other'] || classes.other
  }

  const conditionsOnCurrentPage = computed(() => demoConditions.filter((c) => c.page === currentPage.value))

  const indexingProgress = computed(() => {
    const indexed = demoConditions.filter((c) => !c.needsTask).length
    return {
      indexed,
      total: demoConditions.length,
      percent: Math.round((indexed / demoConditions.length) * 100),
    }
  })

  function handleConditionSelect(condition: PermitCondition) {
    activeConditionId.value = condition.id
    if (condition.page !== currentPage.value) {
      currentPage.value = condition.page
    }
  }

  function handleGoToPage(page: number) {
    currentPage.value = page
  }

  function handleTextSelection() {
    const selection = window.getSelection()
    if (!selection || selection.isCollapsed) {
      showSelectionPopover.value = false
      return
    }

    const text = selection.toString().trim()
    if (text && text.length > 10) {
      const range = selection.getRangeAt(0)
      const rect = range.getBoundingClientRect()

      selectedText.value = text
      selectionPosition.value = {
        x: rect.left + rect.width / 2 - 100,
        y: rect.bottom + 8,
      }
      showSelectionPopover.value = true
    } else {
      showSelectionPopover.value = false
    }
  }

  function handleCreateCondition(text: string) {
    const newCondition: PermitCondition = {
      id: `cond-${Date.now()}`,
      number: demoConditions.length + 1,
      page: currentPage.value,
      reference: String(demoConditions.length + 1),
      type: 'other',
      quote: text,
      valuableAsAuditItem: false,
      needsTask: true,
    }
    demoConditions.push(newCondition)
    activeConditionId.value = newCondition.id
    showSelectionPopover.value = false
    showConditionPanel.value = true
    window.getSelection()?.removeAllRanges()
  }

  function handleHighlightText() {
    showSelectionPopover.value = false
    window.getSelection()?.removeAllRanges()
  }

  function closeSelectionPopover() {
    showSelectionPopover.value = false
    window.getSelection()?.removeAllRanges()
  }

  function handleSearch(query: string) {
    searchQuery.value = query
  }

  function handleSearchResult(result: { page: number }) {
    currentPage.value = result.page
  }

  onMounted(() => {
    document.addEventListener('mousedown', (e) => {
      if (!showSelectionPopover.value) return
      const target = e.target as HTMLElement
      if (!target.closest('[data-selection-popover]')) {
        showSelectionPopover.value = false
      }
    })
  })
</script>

<template>
  <Page variant="canvas" :fill-height="true" :full-width="true" :hide-header="true">
    <div class="flex h-full flex-col">
      <!-- Full-Width Header -->
      <div class="flex shrink-0 items-center justify-between border-b border-border bg-card px-4 py-2">
        <div class="flex items-center gap-3">
          <BackButton />
          <div>
            <h1 class="text-sm font-semibold">Air Permit 0820-0001-DM</h1>
            <p class="text-xs text-muted-foreground">
              {{ currentFacility?.name || 'Nucor Corporation - Darlington Plant' }}
            </p>
          </div>
        </div>

        <div class="flex items-center gap-4">
          <!-- Progress indicator -->
          <div class="flex items-center gap-2">
            <div class="h-2 w-24 overflow-hidden rounded-full bg-muted">
              <div
                class="h-full bg-violet-500 transition-all duration-300"
                :style="{ width: `${indexingProgress.percent}%` }" />
            </div>
            <span class="text-xs text-muted-foreground">
              {{ indexingProgress.indexed }}/{{ indexingProgress.total }} indexed
            </span>
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-1">
            <!-- <UiButton
              variant="ghost"
              size="sm"
              :class="showConditionPanel ? 'bg-accent' : ''"
              @click="showConditionPanel = !showConditionPanel">
              <Icon
                :name="panelMode === 'docked' ? 'lucide:panel-left' : 'lucide:message-circle'"
                class="mr-2 size-4" />
              Conditions
            </UiButton>
            <UiButton
              variant="ghost"
              size="icon"
              :title="panelMode === 'docked' ? 'Switch to floating' : 'Switch to sidebar'"
              @click="panelMode = panelMode === 'docked' ? 'floating' : 'docked'">
              <Icon :name="panelMode === 'docked' ? 'lucide:message-circle' : 'lucide:panel-left'" class="size-4" />
            </UiButton> -->
            <UiButton variant="ghost" size="icon">
              <Icon name="lucide:download" class="size-4" />
            </UiButton>
          </div>
        </div>
      </div>

      <!-- Main Content Row -->
      <div class="flex min-h-0 flex-1 overflow-hidden">
        <!-- Page Thumbnails (leftmost) -->
        <PermitPageThumbnails :pages="pageInfos" :current-page="currentPage" @page-select="handleGoToPage" />

        <!-- Conditions Sidebar (Docked Mode) -->
        <PermitConditionsSidebar
          v-if="panelMode === 'docked' && showConditionPanel"
          :conditions="demoConditions"
          :active-condition-id="activeConditionId"
          :current-page="currentPage"
          :is-collapsed="sidebarCollapsed"
          @condition-select="handleConditionSelect"
          @go-to-page="handleGoToPage"
          @update:is-collapsed="sidebarCollapsed = $event" />

        <!-- Sidebar Toggle (when collapsed) -->
        <button
          v-if="panelMode === 'docked' && sidebarCollapsed"
          class="flex h-full w-10 flex-col items-center justify-center border-r border-border bg-card hover:bg-accent"
          @click="sidebarCollapsed = false">
          <Icon name="lucide:panel-left-open" class="size-4 text-muted-foreground" />
        </button>

        <!-- PDF Viewer Area + Details Panel Container -->
        <div class="flex min-h-0 flex-1">
          <!-- PDF Viewer Content -->
          <div class="flex min-h-0 flex-1 flex-col">
            <!-- PDF Toolbar -->
            <div class="flex shrink-0 items-center justify-between border-b border-border bg-card/50 px-3 py-2">
              <div class="flex items-center gap-1">
                <UiButton
                  variant="ghost"
                  size="icon"
                  :disabled="currentPage <= 1"
                  @click="handleGoToPage(currentPage - 1)">
                  <Icon name="lucide:chevron-left" class="size-4" />
                </UiButton>
                <div class="flex items-center gap-1.5 text-sm">
                  <input
                    :value="currentPage"
                    type="number"
                    min="1"
                    :max="totalPages"
                    class="w-12 rounded border border-border bg-background px-2 py-1 text-center text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    @change="(e) => handleGoToPage(Number((e.target as HTMLInputElement).value))" />
                  <span class="text-muted-foreground">of {{ totalPages }}</span>
                </div>
                <UiButton
                  variant="ghost"
                  size="icon"
                  :disabled="currentPage >= totalPages"
                  @click="handleGoToPage(currentPage + 1)">
                  <Icon name="lucide:chevron-right" class="size-4" />
                </UiButton>
              </div>

              <div class="flex items-center gap-1">
                <UiButton variant="ghost" size="icon">
                  <Icon name="lucide:zoom-out" class="size-4" />
                </UiButton>
                <span class="min-w-16 text-center text-sm text-muted-foreground">100%</span>
                <UiButton variant="ghost" size="icon">
                  <Icon name="lucide:zoom-in" class="size-4" />
                </UiButton>
                <UiButton variant="ghost" size="icon" title="Fit to width">
                  <Icon name="lucide:maximize-2" class="size-4" />
                </UiButton>
              </div>

              <div class="flex items-center gap-1">
                <UiButton
                  variant="ghost"
                  size="icon"
                  :class="showSearchPanel ? 'bg-accent' : ''"
                  @click="showSearchPanel = !showSearchPanel">
                  <Icon name="lucide:search" class="size-4" />
                </UiButton>
              </div>
            </div>

            <!-- Search Panel -->
            <div v-if="showSearchPanel" class="absolute left-1/2 top-14 z-50 -translate-x-1/2">
              <PermitSearchPanel
                :total-pages="totalPages"
                @search="handleSearch"
                @go-to-result="handleSearchResult"
                @close="showSearchPanel = false" />
            </div>

            <!-- PDF Content Area with Overlay -->
            <div class="relative min-h-0 flex-1 overflow-auto bg-muted/30">
              <!-- PDF Page -->
              <div ref="pdfContentRef" class="flex justify-center p-6" @mouseup="handleTextSelection">
                <div class="relative w-full max-w-2xl rounded bg-white shadow-lg">
                  <!-- PDF Header -->
                  <div class="border-b border-gray-200 p-6 pb-4 text-center">
                    <p class="text-base font-bold text-gray-900">Nucor Corporation - Darlington Plant</p>
                    <p class="text-sm font-semibold text-gray-700">0820-0001-DM</p>
                    <p class="text-xs text-gray-500">Page {{ currentPage }} of {{ totalPages }}</p>
                  </div>

                  <!-- PDF Content -->
                  <div class="p-6">
                    <PermitMockPdfPage
                      :page="currentPage"
                      :total-pages="totalPages"
                      :conditions="demoConditions"
                      :active-condition-id="activeConditionId"
                      @condition-click="handleConditionSelect" />
                  </div>
                </div>
              </div>

              <!-- Selection Popover -->
              <PermitSelectionPopover
                :visible="showSelectionPopover"
                :position="selectionPosition"
                :selected-text="selectedText"
                @create-condition="handleCreateCondition"
                @highlight="handleHighlightText"
                @close="closeSelectionPopover" />

              <!-- Condition Bubbles (floating mode) -->
              <template v-if="panelMode === 'floating' && showConditionPanel">
                <PermitConditionBubble
                  v-for="(cond, idx) in conditionsOnCurrentPage"
                  :key="cond.id"
                  :condition="cond"
                  :is-active="activeConditionId === cond.id"
                  :position="{ x: 420, y: 120 + idx * 50 }"
                  @select="handleConditionSelect"
                  @go-to-page="handleGoToPage" />
              </template>
            </div>
          </div>

          <!-- Condition Details Panel (Right Sidebar) -->
          <aside
            v-if="activeCondition && panelMode === 'docked' && showConditionPanel"
            class="w-80 shrink-0 overflow-y-auto border-l border-border bg-card">
            <div class="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card px-3 py-4">
              <span class="text-sm font-medium">Condition #{{ activeCondition.number }}</span>
              <span :class="getTypeBadgeClass(activeCondition.type)" class="rounded px-1.5 py-0.5 text-xs capitalize">
                {{ activeCondition.type || 'other' }}
              </span>
            </div>
            <div class="space-y-4 p-3">
              <div>
                <p class="text-xs font-medium text-muted-foreground">Quote</p>
                <p class="mt-1 text-xs italic leading-relaxed text-foreground">"{{ activeCondition.quote }}"</p>
              </div>
              <div v-if="activeCondition.taskDescription">
                <p class="text-xs font-medium text-muted-foreground">Task</p>
                <p class="mt-1 text-xs leading-relaxed text-foreground">{{ activeCondition.taskDescription }}</p>
              </div>
              <div v-if="activeCondition.limits">
                <p class="text-xs font-medium text-muted-foreground">Limits</p>
                <p class="mt-1 whitespace-pre-line text-xs text-foreground">{{ activeCondition.limits }}</p>
              </div>
              <div v-if="activeCondition.specificUnits?.length">
                <p class="text-xs font-medium text-muted-foreground">Units</p>
                <div class="mt-1 flex flex-wrap gap-1">
                  <span
                    v-for="unit in activeCondition.specificUnits"
                    :key="unit"
                    class="rounded bg-muted px-1.5 py-0.5 text-xs">
                    {{ unit }}
                  </span>
                </div>
              </div>
              <div class="flex items-center gap-2 pt-2">
                <button class="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                  <Icon name="lucide:file-text" class="size-3" />
                  Page {{ activeCondition.page }}
                </button>
                <span v-if="activeCondition.needsTask" class="flex items-center gap-1 text-xs text-amber-600">
                  <Icon name="lucide:alert-circle" class="size-3" />
                  Task needed
                </span>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  </Page>
</template>
