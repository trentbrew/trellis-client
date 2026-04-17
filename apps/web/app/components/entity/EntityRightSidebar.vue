<script lang="ts" setup>
  /**
   * EntityRightSidebar — Reusable tabbed right sidebar for entity dialogs.
   *
   * Renders two tabs: References and Activity/Comments.
   * Used by EntityDialog, PersonDialog, OrganizationDialog, ProjectDialog.
   */
  import type { Reference, EntityReference } from '~/types/entity'
  import { getPresenceBg } from '~/utils/presenceColor'

  const props = defineProps<{
    references: Reference[]
    isViewMode: boolean
    isCreateMode: boolean
    displayActivity: any[]
    commentsLoading: boolean
    newComment: string
    entityLabel?: string
    updatedAt?: string | number
    createdAt?: string | number
    /** Full editable entity — used by the embedded AI suggestions panel. */
    item?: any
    /** Whether the sidebar is collapsed into a narrow strip. */
    collapsed?: boolean
  }>()

  const emit = defineEmits<{
    'update:references': [refs: Reference[]]
    'update:newComment': [val: string]
    'update:collapsed': [val: boolean]
    'open-entity': [ref: EntityReference]
    'remove-ref': [refId: string]
    'add-entity': []
    'add-entity-of-type': [type: string]
    'create-entity': [type: string, title: string]
    'add-comment': []
  }>()

  const activeTab = ref<'references' | 'activity'>('references')

  function toggleCollapsed() {
    emit('update:collapsed', !props.collapsed)
  }
</script>

<template>
  <!-- Collapsed strip — just an expand button + activity count badge -->
  <div v-if="collapsed" class="flex flex-col items-center h-full py-2 overflow-hidden">
    <button
      class="h-7 w-7 rounded-md flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
      title="Expand sidebar"
      @click="toggleCollapsed">
      <Icon name="lucide:panel-right-open" class="h-4 w-4" />
    </button>
    <button
      v-if="!isCreateMode && displayActivity.length"
      class="mt-2 h-7 w-7 rounded-md flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground transition-colors relative"
      title="Activity"
      @click="
        () => {
          activeTab = 'activity'
          toggleCollapsed()
        }
      ">
      <Icon name="lucide:activity" class="h-4 w-4" />
      <span
        class="absolute -top-0.5 -right-0.5 text-[8px] font-medium bg-primary text-primary-foreground rounded-full h-3.5 min-w-3.5 px-1 flex items-center justify-center">
        {{ displayActivity.length }}
      </span>
    </button>
  </div>

  <div v-else class="flex flex-col h-full overflow-hidden">
    <!-- Tab bar -->
    <div class="flex border-b border-border shrink-0">
      <button
        class="flex-1 px-3 py-2 text-[10px] font-medium uppercase tracking-wide transition-colors"
        :class="
          activeTab === 'references'
            ? 'text-foreground border-b-2 border-primary'
            : 'text-muted-foreground hover:text-foreground'
        "
        @click="activeTab = 'references'">
        References
      </button>
      <button
        v-if="!isCreateMode"
        class="flex-1 px-3 py-2 text-[10px] font-medium uppercase tracking-wide transition-colors"
        :class="
          activeTab === 'activity'
            ? 'text-foreground border-b-2 border-primary'
            : 'text-muted-foreground hover:text-foreground'
        "
        @click="activeTab = 'activity'">
        Activity
        <span v-if="displayActivity.length" class="ml-1 text-[9px] bg-muted rounded-full px-1.5 py-0.5">
          {{ displayActivity.length }}
        </span>
      </button>
      <button
        class="px-2 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors shrink-0"
        title="Collapse sidebar"
        @click="toggleCollapsed">
        <Icon name="lucide:panel-right-close" class="h-4 w-4" />
      </button>
    </div>

    <!-- Tab content -->
    <div class="flex-1 overflow-y-auto">
      <!-- References tab -->
      <template v-if="activeTab === 'references'">
        <ReferencesSection
          :model-value="references"
          :readonly="isViewMode"
          @update:model-value="emit('update:references', $event)"
          @open-entity="emit('open-entity', $event)"
          @remove-ref="emit('remove-ref', $event)"
          @add-entity="emit('add-entity')"
          @add-entity-of-type="emit('add-entity-of-type', $event)"
          @create-entity="(type: string, title: string) => emit('create-entity', type, title)" />

        <!-- AI Suggestions — sits at the bottom of References so scans are
             discoverable alongside the existing reference list. -->
        <EntityAISuggestionsPanel v-if="item && !isCreateMode" :entity="item" />
      </template>

      <!-- Activity tab -->
      <div v-if="activeTab === 'activity' && !isCreateMode" class="p-3 pb-0 space-y-2 flex flex-col h-full">
        <!-- Comment input at top -->
        <div class="flex items-center gap-2 border border-border bg-card py-3 px-2 rounded-lg shrink-0">
          <div class="w-5 h-5 rounded-full bg-muted/60 flex items-center justify-center shrink-0">
            <Icon name="lucide:user" class="h-2.5 w-2.5 text-muted-foreground" />
          </div>
          <input
            :value="newComment"
            type="text"
            placeholder="Add a comment..."
            class="flex-1 text-xs bg-transparent border-none outline-none placeholder:text-muted-foreground/50"
            @input="emit('update:newComment', ($event.target as HTMLInputElement).value)"
            @keydown.enter="newComment.trim() && emit('add-comment')" />
          <button
            v-if="newComment.trim()"
            class="text-primary hover:text-primary/80 transition-colors shrink-0"
            @click="emit('add-comment')">
            <Icon name="lucide:send" class="h-3 w-3" />
          </button>
        </div>
        <!-- Activity items -->
        <div class="flex-1 overflow-y-auto space-y-2 min-h-0 px-1 pt-2">
          <div v-if="commentsLoading" class="flex items-center gap-2 py-2">
            <Icon name="lucide:loader-2" class="h-3 w-3 animate-spin text-muted-foreground" />
            <span class="text-xs text-muted-foreground">Loading…</span>
          </div>
          <template v-else-if="displayActivity.length">
            <div v-for="activityItem in displayActivity" :key="activityItem.id" class="flex items-start gap-2">
              <div
                class="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-white"
                :class="getPresenceBg(activityItem.authorId)">
                <Icon v-if="activityItem.type === 'created'" name="lucide:plus" class="h-2.5 w-2.5" />
                <Icon v-else-if="activityItem.type === 'comment'" name="lucide:message-circle" class="h-2.5 w-2.5" />
                <Icon v-else-if="activityItem.type === 'status_change'" name="lucide:edit-3" class="h-2.5 w-2.5" />
                <Icon v-else name="lucide:activity" class="h-2.5 w-2.5" />
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-baseline gap-1 flex-wrap">
                  <span class="text-[11px] font-medium">{{ activityItem.authorName }}</span>
                  <span class="text-[10px] text-muted-foreground">
                    {{ formatRelativeTime(activityItem.createdAt) }}
                  </span>
                </div>
                <p v-if="activityItem.content" class="text-xs text-foreground/80 mt-0.5">{{ activityItem.content }}</p>
                <p v-else-if="activityItem.type === 'created'" class="text-[10px] text-muted-foreground mt-0.5">
                  created this {{ entityLabel || 'item' }}
                </p>
              </div>
            </div>
          </template>
          <div v-else class="py-4 text-center">
            <p class="text-xs text-muted-foreground italic">No activity yet</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Last edited -->
    <div v-if="!isCreateMode && (updatedAt || createdAt)" class="px-4 py-2 border-t border-border shrink-0">
      <p class="text-[10px] text-muted-foreground/50 text-center">
        Last edited · {{ formatRelativeTime(updatedAt || createdAt!) }}
      </p>
    </div>
  </div>
</template>
