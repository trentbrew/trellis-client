<script lang="ts" setup>
  import type { Entity } from '~/types/entity'
  import { CATEGORY_OPTIONS } from '~/types/entity'
  import { useEntityDialog } from '~/composables/useEntityDialog'

  const props = withDefaults(
    defineProps<{
      open: boolean
      mode?: 'view' | 'create' | 'edit'
      item?: Entity | null
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
    save: [item: Entity]
    delete: [item: Entity]
    edit: []
    navigatePrev: []
    navigateNext: []
  }>()

  // ── Shared dialog logic ──────────────────────────────────────────
  const {
    mode, isViewMode, isCreateMode, isEditMode,
    editableItem, hasField, isFormValid,
    displayActivity, commentsLoading, newComment, handleAddComment,
    saveStatus, formatLastSaved,
    entityPickerOpen, entityPickerFilterType,
    handleAddEntityRef, handleCreatedEntityRef, handleRemoveRef, handleOpenEntityRef,
    ownerSearch, owners, filteredOwners,
    currentCategory,
    closeDialog, handleSave, handleDelete,
  } = useEntityDialog(
    props as any,
    emit as any,
    {
      defaultType: 'organization',
      afterInitBlank: (item: any) => { item.socialLinks = [] },
    },
  )

  // ── Organization-specific UI state ───────────────────────────────
  const categoryOpen = ref(false)
  const ownerOpen = ref(false)
  const emailOpen = ref(false)
  const phoneOpen = ref(false)
  const websiteOpen = ref(false)
  const socialOpen = ref(false)
  const industryOpen = ref(false)
  const addressOpen = ref(false)
  const foundedOpen = ref(false)
  const memberCountOpen = ref(false)
  const logoOpen = ref(false)

  // ── Social links ─────────────────────────────────────────────────
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
    :dialog-title="isCreateMode ? 'New Organization' : editableItem.title || 'Organization'"
    :dialog-description="isCreateMode ? 'Create a new organization.' : 'View and edit organization details.'"
    @update:open="emit('update:open', $event)"
    @update:title="editableItem.title = $event"
    @update:description="editableItem.description = $event"
    @close="closeDialog"
    @navigate-prev="emit('navigatePrev')"
    @navigate-next="emit('navigateNext')">

    <!-- Tags next to Organization badge -->
    <template v-if="hasField('tags')" #header-badges>
      <TagsSection v-model="editableItem.tags" :readonly="isViewMode" inline />
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

      <span class="w-px h-4 bg-border/60 mx-0.5 shrink-0" />

      <!-- Email -->
      <UiPopover v-model:open="emailOpen">
        <UiPopoverTrigger as-child>
          <button
            :class="[
              'inline-flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors',
              !editableItem.email
                ? 'border border-dashed border-muted-foreground/40 text-muted-foreground hover:border-muted-foreground/60 hover:bg-muted/30'
                : 'bg-muted/50 hover:bg-muted',
            ]">
            <Icon name="lucide:mail" class="h-3.5 w-3.5" />
            <span class="max-w-[120px] truncate">{{ editableItem.email || 'Email' }}</span>
          </button>
        </UiPopoverTrigger>
        <UiPopoverContent align="start" class="w-56 p-2">
          <input
            v-model="editableItem.email"
            type="email"
            placeholder="email@example.com"
            class="w-full text-xs bg-muted/30 border border-border/40 rounded-md px-2 py-1.5 outline-none placeholder:text-muted-foreground/50"
            :readonly="isViewMode"
            @keydown.enter="emailOpen = false" />
        </UiPopoverContent>
      </UiPopover>

      <!-- Phone -->
      <UiPopover v-model:open="phoneOpen">
        <UiPopoverTrigger as-child>
          <button
            :class="[
              'inline-flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors',
              !editableItem.phone
                ? 'border border-dashed border-muted-foreground/40 text-muted-foreground hover:border-muted-foreground/60 hover:bg-muted/30'
                : 'bg-muted/50 hover:bg-muted',
            ]">
            <Icon name="lucide:phone" class="h-3.5 w-3.5" />
            <span class="max-w-[120px] truncate">{{ editableItem.phone || 'Phone' }}</span>
          </button>
        </UiPopoverTrigger>
        <UiPopoverContent align="start" class="w-56 p-2">
          <input
            v-model="editableItem.phone"
            type="tel"
            placeholder="+1 (555) 000-0000"
            class="w-full text-xs bg-muted/30 border border-border/40 rounded-md px-2 py-1.5 outline-none placeholder:text-muted-foreground/50"
            :readonly="isViewMode"
            @keydown.enter="phoneOpen = false" />
        </UiPopoverContent>
      </UiPopover>

      <!-- Website -->
      <UiPopover v-model:open="websiteOpen">
        <UiPopoverTrigger as-child>
          <button
            :class="[
              'inline-flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors',
              !editableItem.website
                ? 'border border-dashed border-muted-foreground/40 text-muted-foreground hover:border-muted-foreground/60 hover:bg-muted/30'
                : 'bg-muted/50 hover:bg-muted',
            ]">
            <Icon name="lucide:globe" class="h-3.5 w-3.5" />
            <span class="max-w-[120px] truncate">{{ editableItem.website || 'Website' }}</span>
          </button>
        </UiPopoverTrigger>
        <UiPopoverContent align="start" class="w-56 p-2">
          <input
            v-model="editableItem.website"
            type="url"
            placeholder="https://..."
            class="w-full text-xs bg-muted/30 border border-border/40 rounded-md px-2 py-1.5 outline-none placeholder:text-muted-foreground/50"
            :readonly="isViewMode"
            @keydown.enter="websiteOpen = false" />
        </UiPopoverContent>
      </UiPopover>

      <!-- Industry -->
      <UiPopover v-model:open="industryOpen">
        <UiPopoverTrigger as-child>
          <button
            :class="[
              'inline-flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors',
              !editableItem.industry
                ? 'border border-dashed border-muted-foreground/40 text-muted-foreground hover:border-muted-foreground/60 hover:bg-muted/30'
                : 'bg-muted/50 hover:bg-muted',
            ]">
            <Icon name="lucide:factory" class="h-3.5 w-3.5" />
            <span class="max-w-[120px] truncate">{{ editableItem.industry || 'Industry' }}</span>
          </button>
        </UiPopoverTrigger>
        <UiPopoverContent align="start" class="w-56 p-2">
          <input
            v-model="editableItem.industry"
            type="text"
            placeholder="Industry..."
            class="w-full text-xs bg-muted/30 border border-border/40 rounded-md px-2 py-1.5 outline-none placeholder:text-muted-foreground/50"
            :readonly="isViewMode"
            @keydown.enter="industryOpen = false" />
        </UiPopoverContent>
      </UiPopover>

      <!-- Address -->
      <UiPopover v-model:open="addressOpen">
        <UiPopoverTrigger as-child>
          <button
            :class="[
              'inline-flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors',
              !editableItem.address
                ? 'border border-dashed border-muted-foreground/40 text-muted-foreground hover:border-muted-foreground/60 hover:bg-muted/30'
                : 'bg-muted/50 hover:bg-muted',
            ]">
            <Icon name="lucide:map-pin" class="h-3.5 w-3.5" />
            <span class="max-w-[120px] truncate">{{ editableItem.address || 'Address' }}</span>
          </button>
        </UiPopoverTrigger>
        <UiPopoverContent align="start" class="w-56 p-2">
          <input
            v-model="editableItem.address"
            type="text"
            placeholder="Address..."
            class="w-full text-xs bg-muted/30 border border-border/40 rounded-md px-2 py-1.5 outline-none placeholder:text-muted-foreground/50"
            :readonly="isViewMode"
            @keydown.enter="addressOpen = false" />
        </UiPopoverContent>
      </UiPopover>

      <!-- Founded -->
      <UiPopover v-model:open="foundedOpen">
        <UiPopoverTrigger as-child>
          <button
            :class="[
              'inline-flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors',
              !editableItem.founded
                ? 'border border-dashed border-muted-foreground/40 text-muted-foreground hover:border-muted-foreground/60 hover:bg-muted/30'
                : 'bg-muted/50 hover:bg-muted',
            ]">
            <Icon name="lucide:calendar" class="h-3.5 w-3.5" />
            <span>{{ editableItem.founded ? `Founded ${editableItem.founded}` : 'Founded' }}</span>
          </button>
        </UiPopoverTrigger>
        <UiPopoverContent align="start" class="w-56 p-2">
          <input
            v-model="editableItem.founded"
            type="text"
            placeholder="e.g. 2020"
            class="w-full text-xs bg-muted/30 border border-border/40 rounded-md px-2 py-1.5 outline-none placeholder:text-muted-foreground/50"
            :readonly="isViewMode"
            @keydown.enter="foundedOpen = false" />
        </UiPopoverContent>
      </UiPopover>

      <!-- Members -->
      <UiPopover v-model:open="memberCountOpen">
        <UiPopoverTrigger as-child>
          <button
            :class="[
              'inline-flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors',
              editableItem.memberCount == null
                ? 'border border-dashed border-muted-foreground/40 text-muted-foreground hover:border-muted-foreground/60 hover:bg-muted/30'
                : 'bg-muted/50 hover:bg-muted',
            ]">
            <Icon name="lucide:users" class="h-3.5 w-3.5" />
            <span>{{ editableItem.memberCount != null ? `${editableItem.memberCount} members` : 'Members' }}</span>
          </button>
        </UiPopoverTrigger>
        <UiPopoverContent align="start" class="w-56 p-2">
          <input
            v-model.number="editableItem.memberCount"
            type="number"
            min="0"
            placeholder="Number of members..."
            class="w-full text-xs bg-muted/30 border border-border/40 rounded-md px-2 py-1.5 outline-none placeholder:text-muted-foreground/50"
            :readonly="isViewMode" />
        </UiPopoverContent>
      </UiPopover>

      <!-- Social Links -->
      <UiPopover v-model:open="socialOpen">
        <UiPopoverTrigger as-child>
          <button
            :class="[
              'inline-flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors',
              !editableItem.socialLinks?.length
                ? 'border border-dashed border-muted-foreground/40 text-muted-foreground hover:border-muted-foreground/60 hover:bg-muted/30'
                : 'bg-muted/50 hover:bg-muted',
            ]">
            <Icon name="lucide:share-2" class="h-3.5 w-3.5" />
            <span>{{ editableItem.socialLinks?.length ? `${editableItem.socialLinks.length} social` : 'Social' }}</span>
          </button>
        </UiPopoverTrigger>
        <UiPopoverContent align="start" class="w-72 p-2 space-y-2">
          <div v-if="editableItem.socialLinks?.length" class="space-y-1.5">
            <div v-for="(link, i) in editableItem.socialLinks" :key="i" class="flex items-center gap-1.5 group">
              <Icon :name="getSocialIcon(link.platform)" class="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <template v-if="!isViewMode">
                <select v-model="link.platform" class="h-6 rounded border border-border bg-transparent text-[10px] px-1 outline-none w-20 shrink-0">
                  <option v-for="p in SOCIAL_PLATFORMS" :key="p.value" :value="p.value">{{ p.label }}</option>
                </select>
                <input v-model="link.url" type="url" placeholder="URL..." class="flex-1 text-[11px] bg-muted/30 border border-border/40 rounded px-1.5 py-0.5 outline-none min-w-0 placeholder:text-muted-foreground/50" />
                <button class="shrink-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all" @click="removeSocialLink(Number(i))">
                  <Icon name="lucide:x" class="h-3 w-3" />
                </button>
              </template>
              <a v-else-if="link.url" :href="link.url" target="_blank" class="text-xs text-primary hover:underline truncate">{{ link.username || link.url }}</a>
            </div>
          </div>
          <p v-else class="text-[11px] text-muted-foreground/50 italic">No social links</p>
          <button
            v-if="!isViewMode"
            class="w-full text-[11px] text-muted-foreground hover:text-foreground flex items-center justify-center gap-1 py-1 rounded border border-dashed border-border hover:border-muted-foreground/60 transition-colors"
            @click="addSocialLink">
            <Icon name="lucide:plus" class="h-3 w-3" />
            Add link
          </button>
        </UiPopoverContent>
      </UiPopover>

      <!-- Logo URL -->
      <UiPopover v-model:open="logoOpen">
        <UiPopoverTrigger as-child>
          <button
            :class="[
              'inline-flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors',
              !editableItem.logo
                ? 'border border-dashed border-muted-foreground/40 text-muted-foreground hover:border-muted-foreground/60 hover:bg-muted/30'
                : 'bg-muted/50 hover:bg-muted',
            ]">
            <Icon name="lucide:image" class="h-3.5 w-3.5" />
            <span>{{ editableItem.logo ? 'Logo' : 'Logo' }}</span>
          </button>
        </UiPopoverTrigger>
        <UiPopoverContent align="start" class="w-56 p-2">
          <input
            v-model="editableItem.logo"
            type="text"
            placeholder="Logo URL..."
            class="w-full text-xs bg-muted/30 border border-border/40 rounded-md px-2 py-1.5 outline-none placeholder:text-muted-foreground/50"
            :readonly="isViewMode"
            @keydown.enter="logoOpen = false" />
        </UiPopoverContent>
      </UiPopover>

    </template>

    <!-- Content: Center + Right Sidebar -->
    <div class="flex flex-1 min-h-0 overflow-hidden">
      <!-- Center Content -->
      <div class="flex-1 overflow-y-auto min-w-0">
        <div class="p-4 space-y-3">
          <div class="min-h-[120px]">
            <textarea
              v-if="!isViewMode"
              v-model="editableItem.description"
              placeholder="Add notes about this organization..."
              class="w-full h-full min-h-[120px] text-sm bg-transparent outline-none resize-none placeholder:text-muted-foreground/40 leading-relaxed" />
            <p v-else-if="editableItem.description" class="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">{{ editableItem.description }}</p>
            <p v-else class="text-sm text-muted-foreground/40 italic">No notes</p>
          </div>
        </div>
      </div>

      <!-- Right Sidebar -->
      <aside class="w-72 shrink-0 border-l border-border overflow-hidden hidden md:flex flex-col">
        <EntityRightSidebar
          :references="editableItem.references"
          :is-view-mode="isViewMode"
          :is-create-mode="isCreateMode"
          :display-activity="displayActivity"
          :comments-loading="commentsLoading"
          :new-comment="newComment"
          entity-label="organization"
          :updated-at="editableItem.updatedAt"
          :created-at="editableItem.createdAt"
          @update:references="editableItem.references = $event"
          @update:new-comment="newComment = $event"
          @open-entity="handleOpenEntityRef"
          @remove-ref="handleRemoveRef"
          @add-entity="() => { entityPickerFilterType = undefined; entityPickerOpen = true }"
          @add-entity-of-type="(type: string) => { entityPickerFilterType = type; entityPickerOpen = true }"
          @add-comment="handleAddComment" />
      </aside>
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
        <span class="text-[11px] text-muted-foreground flex items-center gap-1 mr-2 h-4 overflow-hidden">
          <Transition name="save-fade" mode="out-in">
            <span v-if="saveStatus === 'saving'" key="saving" class="flex items-center gap-1">
              <Icon name="lucide:loader-2" class="h-3 w-3 animate-spin" />
              Saving…
            </span>
            <span v-else-if="saveStatus === 'error'" key="error" class="flex items-center gap-1 text-destructive">
              <Icon name="lucide:alert-circle" class="h-3 w-3" />
              Error
            </span>
            <span v-else-if="formatLastSaved" key="saved" class="flex items-center gap-1">
              <Icon name="lucide:check" class="h-3 w-3 text-emerald-500" />
              Last saved at {{ formatLastSaved }}
            </span>
          </Transition>
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

  <!-- Entity Reference Picker -->
  <EntityReferencePicker v-model:open="entityPickerOpen" :exclude-id="editableItem.id" :filter-type="entityPickerFilterType" @select="handleAddEntityRef" @created="handleCreatedEntityRef" />
</template>
