<script setup lang="ts">
  import type { Share, SharePermission } from '~/types/database'

  const props = defineProps<{
    entityId: string
    entityType: 'entity' | 'collection'
    entityTitle?: string
  }>()

  const open = defineModel<boolean>('open', { default: false })

  const db = useInstantDb()
  const { user } = useInstantAuth()
  const { $toast } = useNuxtApp()
  const currentOrg = useState<any>('currentOrg')
  const { createShare, removeShare, updateShare } = useShares()

  // ── Members list (for user picker) ─────────────────────────────────
  const orgMembers = ref<any[]>([])

  watch(
    () => currentOrg.value?.id,
    (orgId) => {
      if (!orgId) return
      db.subscribeQuery(
        { members: { $: { where: { orgId, status: 'active' } } } },
        (result: any) => {
          orgMembers.value = (result.data?.members || []).filter(
            (m: any) => m.userId !== user.value?.id,
          )
        },
      )
    },
    { immediate: true },
  )

  // ── Existing shares for this entity ────────────────────────────────
  const existingShares = ref<Share[]>([])
  const sharesLoading = ref(true)

  watch(
    () => props.entityId,
    (entityId) => {
      if (!entityId) return
      db.subscribeQuery(
        { shares: { $: { where: { entityId } } } },
        (result: any) => {
          existingShares.value = (result.data?.shares || []) as Share[]
          sharesLoading.value = false
        },
      )
    },
    { immediate: true },
  )

  // ── Share form state ───────────────────────────────────────────────
  const selectedUserId = ref('')
  const selectedPermission = ref<SharePermission>('view')
  const isSharing = ref(false)

  const permissionOptions: { value: SharePermission; label: string; icon: string }[] = [
    { value: 'view', label: 'Can view', icon: 'lucide:eye' },
    { value: 'comment', label: 'Can comment', icon: 'lucide:message-circle' },
    { value: 'edit', label: 'Can edit', icon: 'lucide:pencil' },
  ]

  // Members not yet shared with
  const availableMembers = computed(() => {
    const sharedUserIds = new Set(existingShares.value.map((s) => s.userId))
    return orgMembers.value.filter((m: any) => !sharedUserIds.has(m.userId))
  })

  // ── Actions ────────────────────────────────────────────────────────
  const handleShare = async () => {
    if (!selectedUserId.value) return
    isSharing.value = true
    try {
      await createShare({
        entityId: props.entityId,
        entityType: props.entityType,
        userId: selectedUserId.value,
        permission: selectedPermission.value,
      })
      const member = orgMembers.value.find((m: any) => m.userId === selectedUserId.value)
      $toast?.success(`Shared with ${member?.name || member?.email || 'user'}`)
      selectedUserId.value = ''
      selectedPermission.value = 'view'
    } catch (err: any) {
      $toast?.error(err?.message || 'Failed to share')
    } finally {
      isSharing.value = false
    }
  }

  const handleRemoveShare = async (share: Share) => {
    try {
      await removeShare(share.id)
      $toast?.success('Share removed')
    } catch {
      $toast?.error('Failed to remove share')
    }
  }

  const handleUpdatePermission = async (share: Share, permission: SharePermission) => {
    try {
      await updateShare(share.id, permission)
    } catch {
      $toast?.error('Failed to update permission')
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────
  const getInitials = (value: string) => {
    const cleaned = value.trim()
    if (!cleaned) return '?'
    const emailPrefix = cleaned.includes('@') ? cleaned.split('@')[0]! : cleaned
    const parts = emailPrefix.split(/[\s._-]+/g).filter(Boolean)
    const first = parts[0]?.[0] ?? '?'
    const second = parts[1]?.[0] ?? parts[0]?.[1] ?? ''
    return `${first}${second}`.toUpperCase().slice(0, 2)
  }

  const getMemberForShare = (share: Share) => {
    return orgMembers.value.find((m: any) => m.userId === share.userId)
  }
</script>

<template>
  <UiDialog v-model:open="open">
    <UiDialogContent class="sm:max-w-md">
      <UiDialogHeader>
        <UiDialogTitle class="flex items-center gap-2">
          <Icon name="lucide:share-2" class="h-5 w-5 text-primary" />
          Share{{ entityTitle ? `: ${entityTitle}` : '' }}
        </UiDialogTitle>
        <UiDialogDescription>
          Grant access to specific people. Guests will only see entities shared with them.
        </UiDialogDescription>
      </UiDialogHeader>

      <div class="space-y-4 py-2">
        <!-- Add person -->
        <div class="flex items-end gap-2">
          <div class="flex-1 space-y-1.5">
            <label class="text-xs font-medium text-muted-foreground">Person</label>
            <select
              v-model="selectedUserId"
              class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary">
              <option value="" disabled>Select a member...</option>
              <option
                v-for="member in availableMembers"
                :key="member.userId"
                :value="member.userId">
                {{ member.name || member.email }}
              </option>
            </select>
          </div>
          <div class="space-y-1.5">
            <label class="text-xs font-medium text-muted-foreground">Access</label>
            <select
              v-model="selectedPermission"
              class="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary">
              <option
                v-for="opt in permissionOptions"
                :key="opt.value"
                :value="opt.value">
                {{ opt.label }}
              </option>
            </select>
          </div>
          <UiButton
            size="sm"
            :disabled="!selectedUserId || isSharing"
            class="shrink-0"
            @click="handleShare">
            <Icon name="lucide:plus" class="h-4 w-4 mr-1" />
            Share
          </UiButton>
        </div>

        <!-- Shared with list -->
        <div v-if="existingShares.length > 0" class="space-y-1">
          <div class="text-xs font-medium text-muted-foreground mb-2">
            Shared with {{ existingShares.length }} {{ existingShares.length === 1 ? 'person' : 'people' }}
          </div>
          <div class="space-y-1 max-h-[240px] overflow-y-auto">
            <div
              v-for="share in existingShares"
              :key="share.id"
              class="flex items-center gap-3 rounded-lg border border-border/50 px-3 py-2 group hover:bg-muted/30 transition-colors">
              <!-- Avatar -->
              <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-medium">
                {{ getInitials(getMemberForShare(share)?.name || getMemberForShare(share)?.email || share.userId) }}
              </div>
              <!-- Info -->
              <div class="flex-1 min-w-0">
                <div class="text-sm font-medium truncate">
                  {{ getMemberForShare(share)?.name || getMemberForShare(share)?.email || 'Unknown' }}
                </div>
                <div class="text-[10px] text-muted-foreground">
                  Shared by {{ share.sharedByName || 'unknown' }}
                </div>
              </div>
              <!-- Permission selector -->
              <select
                :value="share.permission"
                class="rounded border border-border/50 bg-transparent px-2 py-1 text-xs text-muted-foreground focus:border-primary focus:outline-none"
                @change="handleUpdatePermission(share, ($event.target as HTMLSelectElement).value as SharePermission)">
                <option v-for="opt in permissionOptions" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </option>
              </select>
              <!-- Remove -->
              <UiButton
                variant="ghost"
                size="icon-xs"
                class="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                @click="handleRemoveShare(share)">
                <Icon name="lucide:x" class="h-3.5 w-3.5" />
              </UiButton>
            </div>
          </div>
        </div>

        <!-- Empty state -->
        <div v-else-if="!sharesLoading" class="text-center py-6">
          <Icon name="lucide:users" class="h-8 w-8 text-muted-foreground/20 mx-auto mb-2" />
          <p class="text-xs text-muted-foreground">Not shared with anyone yet</p>
        </div>
      </div>
    </UiDialogContent>
  </UiDialog>
</template>
