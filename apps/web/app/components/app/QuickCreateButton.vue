<script lang="ts" setup>
  /**
   * QuickCreateButton — typed entity creation menu ('+' affordance).
   *
   * Lets the user spawn their most frequently/recently used entities in one
   * click. Prioritized defaults: note, page, event, deadline, bookmark.
   *
   * Ordering heuristic: score = usageCount + recencyBoost
   *   recencyBoost = 5 if used in last 24h, 2 if last 7d, else 0
   * Tie-break: most recent first, then the default list order.
   *
   * Persistence: localStorage under `trellis:quick-create:usage`.
   * Shape: { [entityType]: { count: number; lastUsedAt: number } }
   */

  import EntityDialog from '~/components/dialogs/EntityDialog.vue'
  import type { Entity, EntityType } from '~/types/entity'
  import { createDefaultItem } from '~/types/entity'
  import { getBrowseEntityTypes } from '~/config/entityRegistry'

  const props = withDefaults(
    defineProps<{
      /** Visual context — rail matches Quick Capture cluster styling. */
      placement?: 'header' | 'rail'
      /** Rail orientation when placement is rail. */
      railPosition?: 'left' | 'bottom'
      variant?: 'ghost' | 'primary'
    }>(),
    { placement: 'header', railPosition: 'left', variant: 'primary' },
  )

  const isRail = computed(() => props.placement === 'rail')
  const isPrimary = computed(() => props.variant === 'primary')
  const menuSide = computed(() => {
    if (!isRail.value) return 'bottom'
    return props.railPosition === 'bottom' ? 'top' : 'right'
  })
  const buttonClass = computed(() => {
    if (isPrimary.value) {
      return '!rounded-full h-8 w-8 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg transition-all active:scale-95'
    }
    return '!rounded-full h-8 w-8 text-muted-foreground hover:text-foreground bg-transparent hover:bg-muted/50 transition-all active:scale-95'
  })

  interface QuickType {
    type: EntityType
    label: string
    icon: string
    colorClass: string
    shortcut?: string
  }

  const ALL_TYPES: QuickType[] = getBrowseEntityTypes().map((cfg) => ({
    type: cfg.type,
    label: cfg.label,
    icon: cfg.icon,
    colorClass: `text-${cfg.color}-400`,
  }))

  /** Workshop projections open canvas routes — not entity dialogs. */
  const WORKSHOP_PINNED: EntityType[] = ['slide_deck', 'sheet']

  const { createDeck } = useCreateDeck()
  const { createSheet } = useCreateSheet()

  const STORAGE_KEY = 'trellis:quick-create:usage'

  type Usage = Record<string, { count: number; lastUsedAt: number }>

  const usage = ref<Usage>({})

  const loadUsage = () => {
    if (!import.meta.client) return
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      usage.value = raw ? (JSON.parse(raw) as Usage) : {}
    } catch {
      usage.value = {}
    }
  }

  const saveUsage = () => {
    if (!import.meta.client) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(usage.value))
    } catch {
      /* quota or privacy mode — ignore */
    }
  }

  onMounted(loadUsage)

  const recencyBoost = (lastUsedAt: number) => {
    if (!lastUsedAt) return 0
    const ageMs = Date.now() - lastUsedAt
    const day = 24 * 60 * 60 * 1000
    if (ageMs < day) return 5
    if (ageMs < 7 * day) return 2
    return 0
  }

  const orderedTypes = computed<QuickType[]>(() => {
    const indexOf = new Map(ALL_TYPES.map((t, i) => [t.type, i]))
    const sorted = [...ALL_TYPES].sort((a, b) => {
      const ua = usage.value[a.type]
      const ub = usage.value[b.type]
      const scoreA = (ua?.count ?? 0) + recencyBoost(ua?.lastUsedAt ?? 0)
      const scoreB = (ub?.count ?? 0) + recencyBoost(ub?.lastUsedAt ?? 0)
      if (scoreB !== scoreA) return scoreB - scoreA
      const recA = ua?.lastUsedAt ?? 0
      const recB = ub?.lastUsedAt ?? 0
      if (recB !== recA) return recB - recA
      return (indexOf.get(a.type) ?? 0) - (indexOf.get(b.type) ?? 0)
    })
    const pinned = WORKSHOP_PINNED.map((type) => ALL_TYPES.find((t) => t.type === type)).filter(
      (t): t is QuickType => !!t,
    )
    const rest = sorted.filter((t) => !WORKSHOP_PINNED.includes(t.type))
    return [...pinned, ...rest]
  })

  const trackUsage = (type: EntityType) => {
    const prev = usage.value[type] ?? { count: 0, lastUsedAt: 0 }
    usage.value = {
      ...usage.value,
      [type]: { count: prev.count + 1, lastUsedAt: Date.now() },
    }
    saveUsage()
  }

  // ── Entity creation / dialog ───────────────────────────────────────
  const { items, create, update, remove } = useEntities()

  const open = ref(false)
  const activeId = ref<string | null>(null)
  const pendingItem = ref<Entity | null>(null)

  const activeItem = computed<Entity | null>(() => {
    if (!activeId.value) return null
    return items.value.find((i) => i.id === activeId.value) ?? pendingItem.value
  })

  const handleQuickCreate = async (type: EntityType) => {
    trackUsage(type)
    if (type === 'slide_deck') {
      await createDeck()
      return
    }
    if (type === 'sheet') {
      await createSheet()
      return
    }
    const defaults = createDefaultItem(type)
    const newId = await create({ ...defaults, type, title: '' } as Entity)
    pendingItem.value = { ...defaults, id: newId } as Entity
    activeId.value = newId
    open.value = true
  }

  const handleSave = async (item: Entity) => {
    await update(item)
    open.value = false
  }

  const handleDelete = async (item: Entity) => {
    await remove(item.id)
    open.value = false
  }
</script>

<template>
  <div class="flex items-center">
    <UiDropdownMenu>
      <UiDropdownMenuTrigger as-child>
        <UiButton
          :variant="isPrimary ? 'default' : 'ghost'"
          size="icon-sm"
          aria-label="Quick create"
          title="Quick create"
          :class="buttonClass">
          <Icon name="lucide:plus" class="h-4 w-4" :class="isPrimary ? '' : 'opacity-50'" />
        </UiButton>
      </UiDropdownMenuTrigger>

      <UiDropdownMenuContent
        :align="isRail ? 'start' : 'end'"
        :side="menuSide"
        :side-offset="8"
        :collision-padding="16"
        class="w-56 max-h-80 overflow-y-auto shadow-2xl border-border/50">
        <div class="px-2 py-1.5 text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Create new…</div>
        <UiDropdownMenuItem
          v-for="t in orderedTypes"
          :key="t.type"
          class="flex items-center gap-2 cursor-pointer"
          @click="handleQuickCreate(t.type)">
          <Icon :name="t.icon" :class="['h-4 w-4', t.colorClass]" />
          <span class="flex-1">{{ t.label }}</span>
          <span
            v-if="usage[t.type]?.count"
            class="text-[10px] text-muted-foreground/70 tabular-nums"
            :title="`Used ${usage[t.type]!.count} time(s)`">
            {{ usage[t.type]!.count }}
          </span>
        </UiDropdownMenuItem>
      </UiDropdownMenuContent>
    </UiDropdownMenu>

    <!-- Edit dialog for the newly created entity -->
    <EntityDialog
      v-model:open="open"
      mode="edit"
      :item="activeItem"
      :can-navigate-prev="false"
      :can-navigate-next="false"
      :owners="[]"
      :folders="[]"
      @save="handleSave"
      @delete="handleDelete"
      @close="open = false" />
  </div>
</template>
