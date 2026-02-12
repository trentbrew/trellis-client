<script lang="ts" setup>
  import type { CalendarItem } from '~/types/calendarItem'
  import { CATEGORY_OPTIONS, createDefaultItem } from '~/types/calendarItem'
  import { typeHasField } from '~/config/entityRegistry'
  import type { PropertyFieldId } from '~/types/entity'
  import { useComments } from '~/composables/useComments'

  const { user: currentUser } = useInstantAuth()

  const props = withDefaults(
    defineProps<{
      open: boolean
      mode?: 'view' | 'create' | 'edit'
      item?: CalendarItem | null
      canNavigatePrev?: boolean
      canNavigateNext?: boolean
      owners?: { id: string; name: string }[]
    }>(),
    {
      mode: 'edit',
      item: null,
      canNavigatePrev: false,
      canNavigateNext: false,
      owners: () => [],
    },
  )

  const emit = defineEmits<{
    'update:open': [value: boolean]
    close: []
    save: [item: CalendarItem]
    delete: [item: CalendarItem]
    edit: []
    navigatePrev: []
    navigateNext: []
  }>()

  const mode = computed(() => props.mode)
  const isViewMode = computed(() => mode.value === 'view')
  const isCreateMode = computed(() => mode.value === 'create')
  const isEditMode = computed(() => mode.value === 'edit')

  const editableItem: any = reactive(createDefaultItem('organization'))

  const hasField = (fieldId: PropertyFieldId): boolean => {
    try {
      return typeHasField(editableItem.type, fieldId)
    } catch {
      return false
    }
  }

  watch(
    () => props.item,
    (newItem) => {
      if (newItem) {
        const defaults = createDefaultItem(newItem.type)
        Object.assign(editableItem, { ...defaults, ...newItem })
      } else if (isCreateMode.value) {
        Object.assign(editableItem, { ...createDefaultItem('organization') })
      }
    },
    { immediate: true, deep: true },
  )

  // Comments
  const currentEntityId = computed(() => editableItem.id || undefined)
  const {
    displayActivity,
    addComment: persistComment,
    loading: commentsLoading,
  } = useComments(currentEntityId, 'calendarItem')

  // UI State
  const newComment = ref('')
  const categoryOpen = ref(false)
  const ownerOpen = ref(false)
  const ownerSearch = ref('')
  const commentsOpen = ref(false)
  const fileUploadOpen = ref(false)
  const entityPickerOpen = ref(false)
  const entityPickerFilterType = ref<string | undefined>(undefined)

  const owners = computed(() => props.owners ?? [])

  const filteredOwners = computed(() => {
    let list = owners.value
    if (ownerSearch.value) {
      const s = ownerSearch.value.toLowerCase()
      list = list.filter((o) => o.name.toLowerCase().includes(s))
    }
    if (currentUser.value?.id) {
      const uid = currentUser.value.id
      list = [...list].sort((a, b) => (a.id === uid ? -1 : b.id === uid ? 1 : 0))
    }
    return list
  })

  const currentCategory = computed(() => CATEGORY_OPTIONS.find((c) => c.value === editableItem.category))
  const isFormValid = computed(() => !!editableItem.title?.trim())

  // Social links
  const SOCIAL_PLATFORMS = [
    { value: 'twitter', label: 'Twitter / X', icon: 'lucide:twitter' },
    { value: 'linkedin', label: 'LinkedIn', icon: 'lucide:linkedin' },
    { value: 'github', label: 'GitHub', icon: 'lucide:github' },
    { value: 'facebook', label: 'Facebook', icon: 'lucide:facebook' },
    { value: 'youtube', label: 'YouTube', icon: 'lucide:youtube' },
    { value: 'other', label: 'Other', icon: 'lucide:link' },
  ]

  const addSocialLink = () => {
    if (!editableItem.socialLinks) editableItem.socialLinks = []
    editableItem.socialLinks.push({ platform: 'linkedin', url: '', username: '' })
  }

  const removeSocialLink = (index: number) => {
    editableItem.socialLinks?.splice(index, 1)
  }

  const getSocialIcon = (platform: string) => {
    return SOCIAL_PLATFORMS.find((p) => p.value === platform)?.icon || 'lucide:link'
  }

  const formatRelativeTime = (timestamp: number): string => {
    if (!timestamp) return ''
    const now = Date.now()
    const diff = now - timestamp
    const seconds = Math.floor(diff / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)
    if (seconds < 60) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const initBlankCreateItem = () => {
    Object.assign(editableItem, {
      ...createDefaultItem('organization'),
      id: '',
      title: '',
      description: '',
      tags: [],
      category: '',
      owner: undefined,
      involved: [],
      socialLinks: [],
    })
  }

  watch(
    () => props.open,
    (isOpen) => {
      if (isOpen && isCreateMode.value && !props.item) initBlankCreateItem()
    },
  )

  // Actions
  const closeDialog = () => {
    emit('update:open', false)
    emit('close')
  }

  const handleSave = () => {
    emit('save', { ...editableItem } as CalendarItem)
    closeDialog()
  }

  const handleDelete = () => {
    emit('delete', { ...editableItem } as CalendarItem)
    closeDialog()
  }

  // Auto-save in edit mode
  const { status: saveStatus } = useAutoSave(editableItem, {
    enabled: isEditMode,
  })

  // Bidirectional entity references
  const { addEntityRef, removeRef: removeEntityRef, openEntityRef: handleOpenEntityRef } = useEntityReferences(editableItem)
  const handleAddEntityRef = (ref: import('~/types/entity').EntityReference) => addEntityRef(ref)
  const handleRemoveRef = (refId: string) => removeEntityRef(refId)

  const handleAddComment = async () => {
    if (newComment.value.trim()) {
      await persistComment(newComment.value.trim())
      newComment.value = ''
    }
  }
</script>

<template>
  <ActorDialogShell
    :open="open"
    :title="editableItem.title"
    :description="editableItem.description"
    :mode="mode"
    :type-badge="{ icon: 'lucide:building-2', label: 'Organization' }"
    title-placeholder="Organization name..."
    :can-navigate-prev="canNavigatePrev"
    :can-navigate-next="canNavigateNext"
    :avatar="editableItem.logo"
    :dialog-title="isCreateMode ? 'New Organization' : editableItem.title || 'Organization'"
    :dialog-description="isCreateMode ? 'Create a new organization.' : 'View and edit organization details.'"
    @update:open="emit('update:open', $event)"
    @update:title="editableItem.title = $event"
    @update:description="editableItem.description = $event"
    @close="closeDialog"
    @navigate-prev="emit('navigatePrev')"
    @navigate-next="emit('navigateNext')">

    <!-- Avatar slot override for org logo -->
    <template #avatar>
      <div class="h-10 w-10 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0 overflow-hidden">
        <img v-if="editableItem.logo" :src="editableItem.logo" :alt="editableItem.title" class="h-10 w-10 rounded-lg object-cover" />
        <Icon v-else name="lucide:building-2" class="h-5 w-5 text-zinc-500" />
      </div>
    </template>

    <!-- Properties Row -->
    <template #properties>
      <!-- Category -->
      <UiPopover v-if="hasField('category')" v-model:open="categoryOpen">
        <UiPopoverTrigger as-child>
          <button class="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
            <Icon :name="currentCategory?.icon || 'lucide:tag'" class="h-3.5 w-3.5" />
            <span>{{ currentCategory?.label || editableItem.category || 'Category' }}</span>
          </button>
        </UiPopoverTrigger>
        <UiPopoverContent align="start" class="w-44 p-1">
          <button
            v-for="opt in CATEGORY_OPTIONS"
            :key="opt.value"
            class="w-full px-2 py-1.5 text-xs text-left rounded hover:bg-muted flex items-center gap-2"
            @click="() => { editableItem.category = opt.value; categoryOpen = false }">
            <Icon :name="opt.icon" class="h-3.5 w-3.5 text-muted-foreground" />
            <span class="flex-1">{{ opt.label }}</span>
            <Icon v-if="editableItem.category === opt.value" name="lucide:check" class="h-3.5 w-3.5 text-primary" />
          </button>
        </UiPopoverContent>
      </UiPopover>

      <!-- Owner -->
      <UiPopover v-if="hasField('owner')" v-model:open="ownerOpen">
        <UiPopoverTrigger as-child>
          <button
            :class="[
              'inline-flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors',
              !editableItem.owner
                ? 'border border-dashed border-muted-foreground/40 text-muted-foreground hover:border-muted-foreground/60 hover:bg-muted/30'
                : 'bg-muted/50 hover:bg-muted',
            ]">
            <Icon name="lucide:user" class="h-3.5 w-3.5" />
            <span>{{ owners?.find((o) => o.id === editableItem.owner)?.name || 'Owner' }}</span>
          </button>
        </UiPopoverTrigger>
        <UiPopoverContent align="start" class="w-52 p-1 max-h-64 overflow-hidden">
          <div class="flex items-center gap-2 px-2 py-1.5 border-b border-border mb-1">
            <Icon name="lucide:search" class="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <input v-model="ownerSearch" type="text" placeholder="Search..." class="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground/60" />
          </div>
          <div class="overflow-y-auto max-h-52">
            <button
              v-if="editableItem.owner"
              class="w-full px-2 py-1.5 text-xs text-left rounded hover:bg-muted flex items-center gap-2 text-muted-foreground"
              @click="() => { editableItem.owner = undefined; ownerOpen = false; ownerSearch = '' }">
              <Icon name="lucide:x" class="h-3.5 w-3.5" />
              No assignee
            </button>
            <button
              v-for="o in filteredOwners"
              :key="o.id"
              class="w-full px-2 py-1.5 text-xs text-left rounded hover:bg-muted flex items-center gap-2"
              @click="() => { editableItem.owner = o.id; ownerOpen = false; ownerSearch = '' }">
              <div class="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-[9px] font-medium text-primary">
                {{ o.name.slice(0, 2).toUpperCase() }}
              </div>
              <span class="flex-1">{{ o.name }}</span>
              <Icon v-if="editableItem.owner === o.id" name="lucide:check" class="h-3.5 w-3.5 text-primary" />
            </button>
          </div>
        </UiPopoverContent>
      </UiPopover>

      <!-- Tags -->
      <span v-if="hasField('tags')" class="w-px h-4 bg-border/60 mx-0.5 shrink-0" />
      <div v-if="hasField('tags')" class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-muted/30 border border-border/40">
        <TagsSection v-model="editableItem.tags" :readonly="isViewMode" inline />
      </div>
    </template>

    <!-- Content: Sidebar + Main -->
    <aside class="w-64 shrink-0 border-r border-border overflow-y-auto hidden md:block">
      <div class="p-4 space-y-4">
        <!-- Logo -->
        <div class="flex flex-col items-center gap-2">
          <div class="h-20 w-20 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0 overflow-hidden">
            <img v-if="editableItem.logo" :src="editableItem.logo" :alt="editableItem.title" class="h-20 w-20 rounded-xl object-cover" />
            <Icon v-else name="lucide:building-2" class="h-8 w-8 text-zinc-400" />
          </div>
          <div v-if="!isViewMode" class="w-full">
            <input
              v-model="editableItem.logo"
              type="text"
              placeholder="Logo URL..."
              class="w-full text-[11px] bg-muted/30 border border-border/40 rounded-md px-2 py-1 outline-none placeholder:text-muted-foreground/50" />
          </div>
        </div>

        <!-- Organization Info -->
        <div class="space-y-2">
          <p class="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Details</p>

          <!-- Industry -->
          <div class="flex items-center gap-2">
            <Icon name="lucide:factory" class="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <input
              v-if="!isViewMode"
              v-model="editableItem.industry"
              type="text"
              placeholder="Industry..."
              class="flex-1 text-xs bg-transparent outline-none placeholder:text-muted-foreground/50" />
            <span v-else class="text-xs text-foreground">{{ editableItem.industry || '—' }}</span>
          </div>

          <!-- Website -->
          <div class="flex items-center gap-2">
            <Icon name="lucide:globe" class="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <input
              v-if="!isViewMode"
              v-model="editableItem.website"
              type="url"
              placeholder="Website..."
              class="flex-1 text-xs bg-transparent outline-none placeholder:text-muted-foreground/50" />
            <a v-else-if="editableItem.website" :href="editableItem.website" target="_blank" class="text-xs text-primary hover:underline truncate">{{ editableItem.website }}</a>
            <span v-else class="text-xs text-muted-foreground">—</span>
          </div>

          <!-- Email -->
          <div class="flex items-center gap-2">
            <Icon name="lucide:mail" class="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <input
              v-if="!isViewMode"
              v-model="editableItem.email"
              type="email"
              placeholder="Email..."
              class="flex-1 text-xs bg-transparent outline-none placeholder:text-muted-foreground/50" />
            <a v-else-if="editableItem.email" :href="`mailto:${editableItem.email}`" class="text-xs text-primary hover:underline truncate">{{ editableItem.email }}</a>
            <span v-else class="text-xs text-muted-foreground">—</span>
          </div>

          <!-- Phone -->
          <div class="flex items-center gap-2">
            <Icon name="lucide:phone" class="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <input
              v-if="!isViewMode"
              v-model="editableItem.phone"
              type="tel"
              placeholder="Phone..."
              class="flex-1 text-xs bg-transparent outline-none placeholder:text-muted-foreground/50" />
            <a v-else-if="editableItem.phone" :href="`tel:${editableItem.phone}`" class="text-xs text-primary hover:underline">{{ editableItem.phone }}</a>
            <span v-else class="text-xs text-muted-foreground">—</span>
          </div>

          <!-- Address -->
          <div class="flex items-start gap-2">
            <Icon name="lucide:map-pin" class="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
            <input
              v-if="!isViewMode"
              v-model="editableItem.address"
              type="text"
              placeholder="Address..."
              class="flex-1 text-xs bg-transparent outline-none placeholder:text-muted-foreground/50" />
            <span v-else class="text-xs text-foreground">{{ editableItem.address || '—' }}</span>
          </div>

          <!-- Founded -->
          <div class="flex items-center gap-2">
            <Icon name="lucide:calendar" class="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <input
              v-if="!isViewMode"
              v-model="editableItem.founded"
              type="text"
              placeholder="Founded year..."
              class="flex-1 text-xs bg-transparent outline-none placeholder:text-muted-foreground/50" />
            <span v-else class="text-xs text-foreground">{{ editableItem.founded ? `Founded ${editableItem.founded}` : '—' }}</span>
          </div>

          <!-- Member Count -->
          <div class="flex items-center gap-2">
            <Icon name="lucide:users" class="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <input
              v-if="!isViewMode"
              v-model.number="editableItem.memberCount"
              type="number"
              min="0"
              placeholder="Members..."
              class="flex-1 text-xs bg-transparent outline-none placeholder:text-muted-foreground/50" />
            <span v-else class="text-xs text-foreground">{{ editableItem.memberCount != null ? `${editableItem.memberCount} members` : '—' }}</span>
          </div>
        </div>

        <!-- Social Links -->
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <p class="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Social</p>
            <button
              v-if="!isViewMode"
              class="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-0.5"
              @click="addSocialLink">
              <Icon name="lucide:plus" class="h-3 w-3" />
            </button>
          </div>
          <div v-if="editableItem.socialLinks?.length" class="space-y-1.5">
            <div v-for="(link, i) in editableItem.socialLinks" :key="i" class="flex items-center gap-1.5 group">
              <Icon :name="getSocialIcon(link.platform)" class="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <template v-if="!isViewMode">
                <select v-model="link.platform" class="h-6 rounded border border-border bg-transparent text-[10px] px-1 outline-none w-16 shrink-0">
                  <option v-for="p in SOCIAL_PLATFORMS" :key="p.value" :value="p.value">{{ p.label }}</option>
                </select>
                <input v-model="link.url" type="url" placeholder="URL..." class="flex-1 text-[11px] bg-transparent outline-none min-w-0 placeholder:text-muted-foreground/50" />
                <button class="shrink-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all" @click="removeSocialLink(Number(i))">
                  <Icon name="lucide:x" class="h-3 w-3" />
                </button>
              </template>
              <a v-else-if="link.url" :href="link.url" target="_blank" class="text-xs text-primary hover:underline truncate">{{ link.username || link.url }}</a>
            </div>
          </div>
          <p v-else class="text-[11px] text-muted-foreground/50 italic">No social links</p>
        </div>
      </div>
    </aside>

    <!-- Main Content -->
    <div class="flex-1 flex flex-col min-w-0 overflow-y-auto">
      <div class="divide-y divide-border flex flex-col min-h-full">
        <!-- References -->
        <ReferencesSection
          v-model="editableItem.references"
          :readonly="isViewMode"
          @open-entity="handleOpenEntityRef"
          @remove-ref="handleRemoveRef"
          @add-file="fileUploadOpen = true"
          @add-entity="() => { entityPickerFilterType = undefined; entityPickerOpen = true }"
          @add-entity-of-type="(type: string) => { entityPickerFilterType = type; entityPickerOpen = true }" />

        <!-- Comments / Activity -->
        <div v-if="!isCreateMode" class="p-4 space-y-2">
          <button
            type="button"
            class="w-full flex items-center justify-between text-[10px] font-medium text-muted-foreground uppercase tracking-wide hover:text-foreground transition-colors"
            @click="commentsOpen = !commentsOpen">
            <span>Comments / Activity</span>
            <Icon :name="commentsOpen ? 'lucide:chevron-up' : 'lucide:chevron-down'" class="h-3 w-3" />
          </button>
          <div v-if="commentsOpen" class="space-y-2">
            <div v-if="commentsLoading" class="flex items-center py-2">
              <Icon name="lucide:loader-2" class="h-3 w-3 animate-spin text-muted-foreground" />
            </div>
            <div v-else-if="displayActivity.length" class="space-y-1.5 mb-2">
              <div v-for="activityItem in displayActivity" :key="activityItem.id" class="flex items-start gap-2">
                <div class="w-5 h-5 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                  <Icon v-if="activityItem.type === 'created'" name="lucide:plus" class="h-2.5 w-2.5 text-muted-foreground" />
                  <Icon v-else-if="activityItem.type === 'comment'" name="lucide:message-circle" class="h-2.5 w-2.5 text-muted-foreground" />
                  <Icon v-else name="lucide:activity" class="h-2.5 w-2.5 text-muted-foreground" />
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-baseline gap-1 flex-wrap">
                    <span class="text-[11px] font-medium">{{ activityItem.authorName }}</span>
                    <span class="text-[10px] text-muted-foreground">{{ formatRelativeTime(Number(activityItem.createdAt)) }}</span>
                  </div>
                  <p v-if="activityItem.content" class="text-xs text-foreground/80 mt-0.5">{{ activityItem.content }}</p>
                  <p v-else-if="activityItem.type === 'created'" class="text-[10px] text-muted-foreground mt-0.5">created this organization</p>
                </div>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <div class="w-5 h-5 rounded-full bg-muted/60 flex items-center justify-center shrink-0">
                <Icon name="lucide:user" class="h-2.5 w-2.5 text-muted-foreground" />
              </div>
              <input
                v-model="newComment"
                type="text"
                placeholder="Add a comment..."
                class="flex-1 text-xs bg-transparent border-none outline-none placeholder:text-muted-foreground/50"
                @keydown.enter="newComment.trim() && handleAddComment()" />
              <button v-if="newComment.trim()" class="text-primary hover:text-primary/80 transition-colors" @click="handleAddComment">
                <Icon name="lucide:send" class="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <template #footer-left>
      <div class="flex items-center gap-2">
        <Icon name="lucide:info" class="h-3.5 w-3.5" />
        <span v-if="editableItem.id && !isCreateMode">ID: {{ editableItem.id }}</span>
        <span v-else>New organization</span>
      </div>
    </template>

    <template #footer-right>
      <template v-if="isViewMode">
        <UiButton size="sm" @click="emit('edit')">
          <Icon name="lucide:pencil" class="h-3.5 w-3.5 mr-1.5" />
          Edit
        </UiButton>
      </template>
      <template v-else-if="isEditMode">
        <span class="text-[11px] text-muted-foreground flex items-center gap-1 mr-2 transition-opacity" :class="saveStatus === 'idle' ? 'opacity-0' : 'opacity-100'">
          <Icon v-if="saveStatus === 'saving'" name="lucide:loader-2" class="h-3 w-3 animate-spin" />
          <Icon v-else-if="saveStatus === 'saved'" name="lucide:check" class="h-3 w-3 text-emerald-500" />
          <Icon v-else-if="saveStatus === 'error'" name="lucide:alert-circle" class="h-3 w-3 text-destructive" />
          {{ saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved' : saveStatus === 'error' ? 'Error' : '' }}
        </span>
        <UiDropdownMenu>
          <UiDropdownMenuTrigger as-child>
            <UiButton variant="ghost" size="icon" class="h-8 w-8">
              <Icon name="lucide:more-horizontal" class="h-4 w-4" />
            </UiButton>
          </UiDropdownMenuTrigger>
          <UiDropdownMenuContent align="end" class="w-40">
            <UiDropdownMenuItem icon="lucide:share" title="Share" />
            <UiDropdownMenuSeparator />
            <UiDropdownMenuItem icon="lucide:trash-2" title="Delete" variant="destructive" @click="handleDelete" />
          </UiDropdownMenuContent>
        </UiDropdownMenu>
      </template>
      <template v-else-if="isCreateMode">
        <UiButton size="sm" :disabled="!isFormValid" @click="handleSave">Create</UiButton>
        <UiButton variant="ghost" size="sm" @click="closeDialog">Cancel</UiButton>
      </template>
    </template>
  </ActorDialogShell>

  <!-- File Upload Modal -->
  <UiDialog v-model:open="fileUploadOpen">
    <UiDialogContent class="sm:max-w-md">
      <UiDialogHeader>
        <UiDialogTitle>Upload File</UiDialogTitle>
        <UiDialogDescription>Drag and drop files here or click to browse.</UiDialogDescription>
      </UiDialogHeader>
      <div class="py-4">
        <div class="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary hover:bg-primary/5 transition-colors cursor-pointer">
          <Icon name="lucide:upload-cloud" class="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p class="text-sm font-medium">Drop files here</p>
          <p class="text-xs text-muted-foreground mt-1">or click to browse</p>
        </div>
      </div>
      <UiDialogFooter>
        <UiButton variant="outline" @click="fileUploadOpen = false">Cancel</UiButton>
        <UiButton @click="fileUploadOpen = false">Upload</UiButton>
      </UiDialogFooter>
    </UiDialogContent>
  </UiDialog>

  <!-- Entity Reference Picker -->
  <EntityReferencePicker v-model:open="entityPickerOpen" :exclude-id="editableItem.id" :filter-type="entityPickerFilterType" @select="handleAddEntityRef" />
</template>
