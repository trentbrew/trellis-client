<script setup lang="ts">
  const props = defineProps<{
    open: boolean
  }>()

  const emit = defineEmits(['update:open'])

  const db = useInstantDb()
  const { user } = useInstantAuth()
  const { $toast } = useNuxtApp()
  const currentOrg = useState<any>('currentOrg')

  // ── Members data ───────────────────────────────────────────────────
  const members = ref<any[]>([])
  const loading = ref(true)

  const activeMembers = computed(() => members.value.filter((m) => m.status === 'active'))
  const pendingMembers = computed(() => members.value.filter((m) => m.status === 'pending'))

  const fetchMembers = () => {
    if (!currentOrg.value?.id) {
      loading.value = false
      return
    }

    return db.subscribeQuery(
      {
        members: {
          $: {
            where: {
              orgId: currentOrg.value.id,
            },
          },
        },
      },
      (result: any) => {
        members.value = result.data?.members || []
        loading.value = false
      },
    )
  }

  let unsub: (() => void) | null = null

  watch(
    () => [currentOrg.value?.id, props.open],
    ([orgId, isOpen]) => {
      unsub?.()
      if (orgId && isOpen) {
        loading.value = true
        unsub = fetchMembers() || null
      }
    },
    { immediate: true },
  )

  onUnmounted(() => unsub?.())

  // ── Invite form ────────────────────────────────────────────────────
  const showInviteForm = ref(false)
  const inviteInput = ref('')
  const inviteEmails = ref<string[]>([])
  const inviteSending = ref(false)
  const inviteResults = ref<{ email: string; status: string; inviteUrl?: string }[]>([])
  const inviteRole = ref<'owner' | 'admin' | 'member' | 'guest'>('member')
  const selectedEntityIds = ref<string[]>([])
  const entitySearchQuery = ref('')

  // Entity list for guest sharing picker
  const { items: allEntities } = useTrellisEntities()
  const filteredEntities = computed(() => {
    const q = entitySearchQuery.value.toLowerCase()
    const list = allEntities.value || []
    if (!q) return list.slice(0, 20)
    return list.filter((e: any) => e.title?.toLowerCase().includes(q)).slice(0, 20)
  })

  const toggleEntitySelection = (id: string) => {
    const idx = selectedEntityIds.value.indexOf(id)
    if (idx >= 0) selectedEntityIds.value.splice(idx, 1)
    else selectedEntityIds.value.push(id)
  }

  const inviteRoleOptions = [
    { value: 'admin' as const, label: 'Admin', description: 'Manage members & content' },
    { value: 'member' as const, label: 'Member', description: 'Create and edit content' },
    { value: 'guest' as const, label: 'Guest', description: 'View shared content only' },
  ]

  const addInviteEmail = () => {
    const raw = inviteInput.value.trim().toLowerCase()
    if (!raw) return
    const currentUserEmail = (user.value as any)?.email?.toLowerCase()
    const emails = raw.split(/[,;\s]+/).filter((e) => {
      if (!e.includes('@') || inviteEmails.value.includes(e)) return false
      if (currentUserEmail && e === currentUserEmail) {
        $toast?.error('You cannot invite yourself')
        return false
      }
      return true
    })
    if (emails.length) inviteEmails.value.push(...emails)
    inviteInput.value = ''
  }

  const removeInviteEmail = (email: string) => {
    inviteEmails.value = inviteEmails.value.filter((e) => e !== email)
  }

  const currentWorld = useState<any>('currentWorld')

  const sendInvites = async () => {
    if (!inviteEmails.value.length || !currentOrg.value?.id) return
    inviteSending.value = true
    try {
      const resp = await $fetch('/api/invite', {
        method: 'POST',
        body: {
          emails: inviteEmails.value,
          orgId: currentOrg.value.id,
          orgName: currentOrg.value.name || '',
          appId: currentWorld.value?.id || '',
          worldId: currentWorld.value?.id || '',
          worldName: currentWorld.value?.name || '',
          inviterId: user.value?.id,
          inviterName: (user.value as any)?.name || (user.value as any)?.email,
          role: inviteRole.value,
          sharedEntityIds: inviteRole.value === 'guest' ? selectedEntityIds.value : undefined,
        },
      })
      const results = (resp as any)?.results || []
      const sent = results.filter((r: any) => r.status === 'sent').length
      const errors = results.filter((r: any) => r.status === 'error').length
      if (sent > 0) $toast?.success(`${sent} invite${sent > 1 ? 's' : ''} sent!`)
      if (errors > 0) $toast?.error(`${errors} invite${errors > 1 ? 's' : ''} failed`)
      inviteResults.value = results
      inviteEmails.value = []
    } catch (err: any) {
      console.error('[MemberInviteDialog] invite error:', err)
      $toast?.error(err?.message || 'Failed to send invites')
    } finally {
      inviteSending.value = false
    }
  }

  // ── Role management ────────────────────────────────────────────────
  const roleOptions = [
    { value: 'admin', label: 'Admin', description: 'Can manage workspace settings, members, and all content' },
    { value: 'member', label: 'Member', description: 'Can create, edit, and manage content' },
    { value: 'guest', label: 'Guest', description: 'Read-only access to shared content' },
  ] as const

  const updateRole = async (member: any, newRole: string) => {
    try {
      const oldRole = member.role || 'member'
      await db.transact([db.tx.members[member.id].update({ role: newRole })])
      $toast?.success(`Updated ${member.email || member.name} to ${newRole}`)

      // Notify the affected member about their role change
      if (member.userId && member.userId !== user.value?.id) {
        $fetch('/api/notify', {
          method: 'POST',
          body: {
            recipientId: member.userId,
            orgId: currentOrg.value?.id,
            orgName: currentOrg.value?.name || '',
            type: 'role_changed',
            title: 'Your role was updated',
            message: `Your role was changed from ${oldRole} to ${newRole}.`,
            actionUrl: '/settings/members',
            icon: 'lucide:shield',
            variant: 'info',
            actorId: user.value?.id,
            actorName: (user.value as any)?.name || (user.value as any)?.email,
            metadata: { oldRole, newRole },
          },
        }).catch(() => { /* non-fatal */ })
      }
    } catch {
      $toast?.error('Failed to update role')
    }
  }

  const removeMember = async (member: any) => {
    const memberName = member.email || member.name
    const memberUserId = member.userId
    try {
      await db.transact([db.tx.members[member.id].delete()])
      $toast?.success(`Removed ${memberName}`)

      // Notify the removed member
      if (memberUserId && memberUserId !== user.value?.id) {
        $fetch('/api/notify', {
          method: 'POST',
          body: {
            recipientId: memberUserId,
            orgId: currentOrg.value?.id,
            orgName: currentOrg.value?.name || '',
            type: 'member_removed',
            title: 'Removed from workspace',
            message: `You were removed from ${currentOrg.value?.name || 'the workspace'}.`,
            icon: 'lucide:user-x',
            variant: 'warning',
            actorId: user.value?.id,
            actorName: (user.value as any)?.name || (user.value as any)?.email,
          },
        }).catch(() => { /* non-fatal */ })
      }
    } catch {
      $toast?.error('Failed to remove member')
    }
  }

  const copyInviteUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url)
      $toast?.success('Invite link copied!')
    } catch {
      $toast?.error('Failed to copy link')
    }
  }

  const buildInviteUrl = (token: string) => {
    return `${window.location.origin}/invite/accept?token=${token}`
  }

  const resendInvite = async (member: any) => {
    if (!member.email) return
    try {
      await db.auth.sendMagicCode({ email: member.email })
      $toast?.success(`Invite resent to ${member.email}`)
    } catch {
      $toast?.error('Failed to resend invite')
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

  const timeAgo = (timestamp: number) => {
    const diff = Date.now() - timestamp
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `${mins}m ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    return `${days}d ago`
  }

  const isCurrentUser = (member: any) => member.userId === user.value?.id

  const closeDialog = () => {
    emit('update:open', false)
    inviteEmails.value = []
    inviteResults.value = []
    inviteInput.value = ''
    inviteRole.value = 'member'
    selectedEntityIds.value = []
    entitySearchQuery.value = ''
    showInviteForm.value = false
  }
</script>

<template>
  <UiDialog :open="props.open" @update:open="emit('update:open', $event)">
    <UiDialogContent class="sm:max-w-[600px] max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden shadow-2xl border-border/50">
      <UiDialogHeader class="p-6 border-b shrink-0 bg-muted/5">
        <div class="flex items-center justify-between">
          <div class="space-y-1">
            <UiDialogTitle class="text-xl font-medium tracking-tight">Workspace Members</UiDialogTitle>
            <UiDialogDescription class="text-xs font-normal text-muted-foreground">
              Manage team members, roles, and permissions.
            </UiDialogDescription>
          </div>
          <UiButton size="sm" class="font-bold shadow-sm" @click="showInviteForm = !showInviteForm">
            <Icon :name="showInviteForm ? 'lucide:users' : 'lucide:user-plus'" class="mr-2 h-4 w-4" />
            {{ showInviteForm ? 'View Members' : 'Invite' }}
          </UiButton>
        </div>
      </UiDialogHeader>

      <div class="flex-1 overflow-y-auto p-6 scrollbar-thin">
        <!-- Invite form -->
        <div v-if="showInviteForm" class="space-y-6">
          <div class="space-y-3">
            <UiLabel for="emails" class="text-xs text-muted-foreground px-1">Invite by email</UiLabel>
            <div class="flex gap-2">
              <UiInput
                id="emails"
                v-model="inviteInput"
                type="email"
                placeholder="name@example.com"
                class="flex-1 bg-muted/20 border-border/50 focus:border-primary/50"
                @keydown.enter.prevent="addInviteEmail"
                @keydown.tab.prevent="addInviteEmail"
              />
              <UiButton variant="outline" class="font-bold border-border/50" @click="addInviteEmail">Add</UiButton>
            </div>
          </div>

          <div v-if="inviteEmails.length" class="flex flex-wrap gap-1.5">
            <span
              v-for="email in inviteEmails"
              :key="email"
              class="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary shadow-xs ring-1 ring-primary/20"
            >
              {{ email }}
              <button
                type="button"
                class="ml-1 rounded-full p-0.5 hover:bg-primary/20 transition-colors"
                @click="removeInviteEmail(email)"
              >
                <Icon name="lucide:x" class="h-3 w-3" />
              </button>
            </span>
          </div>

          <!-- Role selector -->
          <div v-if="inviteEmails.length" class="space-y-2">
            <UiLabel class="text-xs text-muted-foreground px-1">Invite as</UiLabel>
            <div class="grid gap-1.5">
              <button
                v-for="opt in inviteRoleOptions"
                :key="opt.value"
                type="button"
                class="flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-all"
                :class="inviteRole === opt.value
                  ? 'border-primary/50 bg-primary/5 ring-1 ring-primary/20'
                  : 'border-border/50 hover:bg-muted/30'"
                @click="inviteRole = opt.value"
              >
                <div
                  class="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors"
                  :class="inviteRole === opt.value ? 'border-primary bg-primary' : 'border-muted-foreground/30'"
                >
                  <div v-if="inviteRole === opt.value" class="h-1.5 w-1.5 rounded-full bg-white" />
                </div>
                <div class="flex-1 min-w-0">
                  <div class="text-sm font-semibold">{{ opt.label }}</div>
                  <div class="text-[10px] text-muted-foreground">{{ opt.description }}</div>
                </div>
              </button>
            </div>
          </div>

          <!-- Entity picker for guest invites -->
          <div v-if="inviteRole === 'guest' && inviteEmails.length" class="space-y-2">
            <UiLabel class="text-xs text-muted-foreground px-1">
              Share specific content
              <span class="text-muted-foreground/50">({{ selectedEntityIds.length }} selected)</span>
            </UiLabel>
            <UiInput
              v-model="entitySearchQuery"
              placeholder="Search entities..."
              class="bg-muted/20 border-border/50 text-sm"
            />
            <div class="max-h-[160px] overflow-y-auto rounded-lg border border-border/50 divide-y divide-border/30">
              <button
                v-for="entity in filteredEntities"
                :key="entity.id"
                type="button"
                class="flex items-center gap-2.5 w-full px-3 py-2 text-left text-sm transition-colors hover:bg-muted/30"
                :class="selectedEntityIds.includes(entity.id) ? 'bg-primary/5' : ''"
                @click="toggleEntitySelection(entity.id)"
              >
                <div
                  class="flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors"
                  :class="selectedEntityIds.includes(entity.id)
                    ? 'border-primary bg-primary text-white'
                    : 'border-muted-foreground/30'"
                >
                  <Icon v-if="selectedEntityIds.includes(entity.id)" name="lucide:check" class="h-3 w-3" />
                </div>
                <span class="truncate">{{ entity.title || 'Untitled' }}</span>
                <span class="ml-auto text-[10px] text-muted-foreground/50 capitalize shrink-0">{{ entity.type }}</span>
              </button>
              <div v-if="filteredEntities.length === 0" class="px-3 py-4 text-center text-xs text-muted-foreground">
                No entities found
              </div>
            </div>
          </div>

          <!-- Invite results with copyable links -->
          <div v-if="inviteResults.length" class="space-y-2 border-t border-border/50 pt-6">
            <div
              v-for="result in inviteResults"
              :key="result.email"
              class="space-y-2 bg-muted/5 p-3 rounded-lg border border-border/40"
            >
              <div class="flex items-center gap-2 text-xs">
                <Icon
                  :name="result.status === 'sent' ? 'lucide:check-circle' : 'lucide:alert-circle'"
                  :class="result.status === 'sent' ? 'text-emerald-500' : 'text-red-400'"
                  class="h-4 w-4 shrink-0"
                />
                <span class="font-bold text-foreground">{{ result.email }}</span>
              </div>
              <div v-if="result.inviteUrl" class="flex items-center gap-2 pl-6">
                <input
                  :value="result.inviteUrl"
                  readonly
                  class="bg-background text-muted-foreground flex-1 rounded border border-border/50 px-3 py-1.5 text-[10px] font-mono truncate shadow-inner focus:outline-none"
                  @click="($event.target as HTMLInputElement).select()"
                />
                <UiButton
                  size="icon-sm"
                  variant="ghost"
                  class="shrink-0 h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                  title="Copy invite link"
                  @click="copyInviteUrl(result.inviteUrl)"
                >
                  <Icon name="lucide:copy" class="h-3.5 w-3.5" />
                </UiButton>
              </div>
            </div>
          </div>

          <div class="flex justify-end gap-2 pt-4">
            <UiButton variant="ghost" class="font-bold" @click="showInviteForm = false">Cancel</UiButton>
            <UiButton
              class="font-bold shadow-sm"
              :disabled="!inviteEmails.length || inviteSending"
              @click="sendInvites"
            >
              <Icon v-if="inviteSending" name="lucide:loader-2" class="mr-2 h-4 w-4 animate-spin" />
              {{ inviteSending ? 'Sending…' : `Send ${inviteEmails.length || ''} invite${inviteEmails.length !== 1 ? 's' : ''}` }}
            </UiButton>
          </div>
        </div>

        <!-- Members list -->
        <div v-else class="space-y-6">
          <!-- Loading -->
          <div v-if="loading" class="space-y-3">
            <div v-for="i in 3" :key="i" class="border-border/50 rounded-xl border p-4 animate-pulse">
              <div class="flex items-center gap-3">
                <div class="h-9 w-9 rounded-full bg-muted" />
                <div class="flex-1 space-y-2">
                  <div class="h-4 w-32 rounded bg-muted" />
                  <div class="h-3 w-48 rounded bg-muted" />
                </div>
              </div>
            </div>
          </div>

          <!-- Content -->
          <template v-else>
            <!-- Pending invites -->
            <div v-if="pendingMembers.length > 0" class="space-y-3">
              <div class="text-xs font-normal text-muted-foreground px-1 flex items-center gap-2">
                <Icon name="lucide:clock" class="h-3 w-3" />
                Pending invites
              </div>
              <div class="border-border/50 rounded-xl border divide-y divide-border/50 overflow-hidden bg-card shadow-sm">
                <div
                  v-for="member in pendingMembers"
                  :key="member.id"
                  class="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors group"
                >
                  <!-- Avatar -->
                  <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-amber-500 shadow-sm border border-amber-500/20 group-hover:scale-105 transition-transform">
                    <Icon name="lucide:mail" class="h-4.5 w-4.5" />
                  </div>
                  <!-- Info -->
                  <div class="flex-1 min-w-0">
                    <div class="text-sm font-bold text-foreground truncate">{{ member.email }}</div>
                    <div class="text-[10px] text-muted-foreground uppercase  font-bold opacity-80 group-hover:opacity-100 transition-opacity">
                      Invited {{ member.invitedAt ? timeAgo(member.invitedAt) : '' }}
                    </div>
                  </div>
                  <!-- Actions -->
                  <div class="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <UiButton v-if="member.inviteToken" size="icon-sm" variant="ghost" class="h-8 w-8" @click="copyInviteUrl(buildInviteUrl(member.inviteToken))">
                      <Icon name="lucide:link" class="h-4 w-4" />
                    </UiButton>
                    <UiButton size="icon-sm" variant="ghost" class="h-8 w-8" @click="resendInvite(member)">
                      <Icon name="lucide:rotate-ccw" class="h-4 w-4" />
                    </UiButton>
                    <UiButton size="icon-sm" variant="ghost" class="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" @click="removeMember(member)">
                      <Icon name="lucide:user-x" class="h-4 w-4" />
                    </UiButton>
                  </div>
                </div>
              </div>
            </div>

            <!-- Active members -->
            <div v-if="activeMembers.length > 0" class="space-y-3">
              <div class="text-xs font-normal text-muted-foreground px-1 flex items-center gap-2">
                <Icon name="lucide:shield-check" class="h-3 w-3" />
                Active members
              </div>
              <div class="border-border/50 rounded-xl border divide-y divide-border/50 overflow-hidden bg-card shadow-sm">
                <div
                  v-for="member in activeMembers"
                  :key="member.id"
                  class="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors group"
                >
                  <!-- Avatar -->
                  <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold shadow-sm border border-primary/20 group-hover:scale-105 transition-transform">
                    {{ getInitials(member.name || member.email || '') }}
                  </div>
                  <!-- Info -->
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2">
                      <span class="text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors">
                        {{ member.name || member.email }}
                      </span>
                      <span
                        v-if="isCurrentUser(member)"
                        class="inline-flex items-center rounded-full bg-primary/15 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-primary shadow-xs"
                      >
                        you
                      </span>
                    </div>
                    <div class="text-[10px] text-muted-foreground truncate uppercase  font-bold opacity-80 group-hover:opacity-100 transition-opacity">
                      {{ member.email }} &middot; {{ member.role || 'member' }}
                    </div>
                  </div>
                  <!-- Role selector -->
                  <div v-if="!isCurrentUser(member)" class="shrink-0">
                    <UiDropdownMenu>
                      <UiDropdownMenuTrigger as-child>
                        <UiButton size="sm" variant="ghost" class="h-8 px-2 text-[10px] uppercase font-black tracking-widest hover:bg-muted/50 transition-colors">
                          {{ member.role || 'member' }}
                          <Icon name="lucide:chevron-down" class="ml-1 h-3.5 w-3.5" />
                        </UiButton>
                      </UiDropdownMenuTrigger>
                      <UiDropdownMenuContent align="end" class="w-64 shadow-2xl border-border/50 p-1">
                        <div class="px-2 py-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 bg-muted/5 rounded-t-lg">Change role</div>
                        <UiDropdownMenuItem
                          v-for="role in roleOptions"
                          :key="role.value"
                          :disabled="member.role === role.value"
                          class="flex-col items-start gap-1 py-3 px-3 transition-colors"
                          @click="updateRole(member, role.value)"
                        >
                          <div class="flex w-full items-center justify-between">
                            <span class="font-bold text-sm tracking-tight">{{ role.label }}</span>
                            <Icon v-if="member.role === role.value" name="lucide:check" class="h-4 w-4 text-primary scale-110" />
                          </div>
                          <span class="text-[10px] text-muted-foreground font-bold uppercase tracking-tight leading-tight opacity-70">{{ role.description }}</span>
                        </UiDropdownMenuItem>
                        <UiDropdownMenuSeparator class="bg-border/50 my-1" />
                        <UiDropdownMenuItem
                          class="text-destructive focus:text-destructive group/remove py-2.5 px-3 transition-colors hover:bg-destructive/10"
                          @click="removeMember(member)"
                        >
                          <Icon name="lucide:user-minus" class="mr-2 h-4 w-4 group-hover/remove:scale-110 transition-transform" />
                          <span class="font-bold">Remove from workspace</span>
                        </UiDropdownMenuItem>
                      </UiDropdownMenuContent>
                    </UiDropdownMenu>
                  </div>
                  <div v-else class="shrink-0">
                    <span class="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 pr-3">{{ member.role || 'member' }}</span>
                  </div>
                </div>
              </div>
            </div>
          </template>
        </div>
      </div>

      <!-- <UiDialogFooter class="p-4 border-t shrink-0 bg-muted/10">
        <UiButton variant="outline" class="w-full font-bold shadow-sm hover:bg-muted" @click="closeDialog">Close</UiButton>
      </UiDialogFooter> -->
    </UiDialogContent>
  </UiDialog>
</template>
